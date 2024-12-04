package course

import (
	"fmt"
	"net/http"
	"sync"
	"time"
	
	"github.com/gorilla/websocket"
	"github.com/gorilla/mux"
)

var (
	activeChats = make(map[string]*ChatConnections)
	chatsMutex sync.RWMutex
	maxConsecutiveErrors = 3
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
)

type LastTranscriptMessage struct {
	Mutex     sync.Mutex
	Timestamp time.Time
}

type ChatConnections struct {
	Clients map[*websocket.Conn]bool
	Mutex   sync.RWMutex
	ErrorState ChatErrorState
	SettingsUpdate chan SettingsUpdate
	UserEmail string
	LastTranscriptMessage LastTranscriptMessage
}

type ChatErrorState struct {
	ConsecutiveErrors int
	LastError        time.Time
	Mutex            sync.Mutex
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	chatID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	fmt.Printf("WebSocket connection attempt for chat ID: %s, user: %s\n", chatID, userEmail)

	chat, err := GetChat(chatID, userEmail)
	if err != nil || chat == nil {
		http.Error(w, "Chat not found", http.StatusNotFound)
		return
	}

	// Update lesson timestamp if this chat is associated with a lesson
	if chat.LessonID != "" {
		if err := updateLessonLastAccessedTime(chat.LessonID); err != nil {
			// Log the error but continue with the connection
			fmt.Printf("Error updating lesson timestamp: %v\n", err)
		}
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer conn.Close()

	// Get or create chat connections
	chatsMutex.Lock()
	if activeChats[chatID] == nil {
		activeChats[chatID] = &ChatConnections{
			Clients: make(map[*websocket.Conn]bool),
			SettingsUpdate: make(chan SettingsUpdate, 1),
			UserEmail: userEmail,
		}
	}
	chatConns := activeChats[chatID]
	chatsMutex.Unlock()

	// Add this connection
	chatConns.Mutex.Lock()
	chatConns.Clients[conn] = true
	chatConns.Mutex.Unlock()

	defer func() {
		chatConns.Mutex.Lock()
		delete(chatConns.Clients, conn)
		chatConns.Mutex.Unlock()

		// Clean up empty chat
		chatsMutex.Lock()
		if len(chatConns.Clients) == 0 {
			delete(activeChats, chatID)
		}
		chatsMutex.Unlock()
	}()

	// Send message history to the newly connected client
	sendMessageHistory(conn, chat)

	// Create a channel to signal new messages
	newMessage := make(chan Message)

	// Start OpenAI connection handler
	go handleOpenAIConnection(chat, chatConns, newMessage)

	// Handle messages from the user
	handleUserMessages(conn, chat, chatConns, newMessage)
}

func sendMessageHistory(conn *websocket.Conn, chat *Chat) {
    // Send initial greeting message
    initialMsg := Message{
        ChatID:     chat.ID,
        Sender:     "Assistant @OpenAI Realtime",
        Content:    "Hey, are you ready for your lesson?",
        Type:       "text",
		CreatedAt: time.Now(),
    }
    if err := conn.WriteJSON(initialMsg); err != nil {
        fmt.Printf("Error sending initial message: %v\n", err)
        return
    }

    for _, msg := range chat.Messages {
        if err := conn.WriteJSON(msg); err != nil {
            fmt.Printf("Error sending message history: %v\n", err)
            return
        }
    }
}

func handleUserMessages(conn *websocket.Conn, chat *Chat, chatConns *ChatConnections, newMessage chan<- Message) {
	for {
		var msg Message
		err := conn.ReadJSON(&msg)
		msg.ChatID = chat.ID
		msg.CreatedAt = time.Now()
		if err != nil {
			break
		}

		// Only add text messages to chat history
		if msg.Type != "audio" {
			if err := InsertMessage(&msg); err != nil {
				fmt.Printf("Error saving message: %v\n", err)
			}
		}
		broadcastMessage(chatConns, msg)

		// Send the new message to OpenAI
		newMessage <- msg
	}
}

func broadcastMessage(chatConns *ChatConnections, msg Message) {
    chatConns.Mutex.RLock()
    defer chatConns.Mutex.RUnlock()

    for client := range chatConns.Clients {
        err := client.WriteJSON(msg)
        if err != nil {
            client.Close()
            delete(chatConns.Clients, client)
        }
    }
}
