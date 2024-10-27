package chat

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"os"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/levavakian/languagelearn/server/auth"
)

type Chat struct {
	ID        string    `json:"id"`
	CreatorID string    `json:"creatorId"`
	Name      string    `json:"name"`
	Messages  []Message `json:"messages"`
	Clients   map[*websocket.Conn]bool `json:"-"`
	Mutex     sync.Mutex `json:"-"`
}

type Message struct {
	Sender  string `json:"sender"`
	Content string `json:"content"`
}

type ChatData struct {
	Name string `json:"name"`
}

type ResponseCreate struct {
	Type     string   `json:"type"`
	Response Response `json:"response"`
}

type Response struct {
	Modalities   []string `json:"modalities"`
	Instructions string   `json:"instructions"`
}

type ConversationItemCreate struct {
	Type string `json:"type"`
	Item Item   `json:"item"`
}

type Item struct {
	Type    string    `json:"type"`
	Role    string    `json:"role"`
	Content []Content `json:"content"`
}

type Content struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type OpenAIMessageType struct {
	Type string `json:"type"`
}

type OpenAIResponseTextDelta struct {
	Type  string `json:"type"`
	Delta string `json:"delta"`
}

type OpenAIResponseTextDone struct {
	Type string `json:"type"`
}

type OpenAIError struct {
	Type  string `json:"type"`
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}

var (
	chats     = make(map[string]map[string]*Chat) // map[userEmail]map[chatID]*Chat
	chatMutex sync.Mutex
	upgrader  = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
)

func SetupRoutes(api *mux.Router) {
	api.HandleFunc("/chat", auth.AuthMiddleware(createChat)).Methods("POST")
	api.HandleFunc("/chat/{id}/ws", auth.AuthMiddleware(handleWebSocket))
	api.HandleFunc("/chats", auth.AuthMiddleware(getUserChats)).Methods("GET")
	api.HandleFunc("/chat/{id}", auth.AuthMiddleware(deleteChat)).Methods("DELETE")
}

func generateUniqueID() string {
	return uuid.New().String()
}

func createChat(w http.ResponseWriter, r *http.Request) {
	creatorEmail := r.Header.Get("X-User-Email")

	var chatData ChatData
	if err := json.NewDecoder(r.Body).Decode(&chatData); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	chatID := generateUniqueID()

	chatMutex.Lock()
	if _, exists := chats[creatorEmail]; !exists {
		chats[creatorEmail] = make(map[string]*Chat)
	}
	chats[creatorEmail][chatID] = &Chat{
		ID:        chatID,
		CreatorID: creatorEmail,
		Name:      chatData.Name,
		Messages:  []Message{},
		Clients:   make(map[*websocket.Conn]bool),
	}
	chatMutex.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"chatID": chatID})
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	chatID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	fmt.Printf("WebSocket connection attempt for chat ID: %s, user: %s\n", chatID, userEmail)

	chatMutex.Lock()
	userChats, exists := chats[userEmail]
	if !exists {
		chatMutex.Unlock()
		http.Error(w, "Chat not found", http.StatusNotFound)
		return
	}
	chat, exists := userChats[chatID]
	chatMutex.Unlock()

	if !exists {
		http.Error(w, "Chat not found", http.StatusNotFound)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer conn.Close()

	chat.Mutex.Lock()
	chat.Clients[conn] = true
	chat.Mutex.Unlock()

	// Send message history to the newly connected client
	for _, msg := range chat.Messages {
		err := conn.WriteJSON(msg)
		if err != nil {
			fmt.Printf("Error sending message history: %v\n", err)
			return
		}
	}

	// Create a channel to signal new messages
	newMessage := make(chan Message)

	// Start OpenAI connection handler
	go handleOpenAIConnection(chat, newMessage)

	// Handle messages from the user
	for {
		var msg Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			chat.Mutex.Lock()
			delete(chat.Clients, conn)
			chat.Mutex.Unlock()
			break
		}

		chat.Mutex.Lock()
		chat.Messages = append(chat.Messages, msg)
		for client := range chat.Clients {
			err := client.WriteJSON(msg)
			if err != nil {
				client.Close()
				delete(chat.Clients, client)
			}
		}
		chat.Mutex.Unlock()

		// Send the new message to OpenAI
		newMessage <- msg
	}
}

func handleOpenAIConnection(chat *Chat, newMessage <-chan Message) {
	var openAIConn *websocket.Conn
	var err error

	for {
		if openAIConn == nil {
			secretKey := os.Getenv("OPENAI_SECRET_KEY")
			if secretKey == "" {
				fmt.Println("Error: OPENAI_SECRET_KEY environment variable is not set")
				return
			}

			openAIConn, _, err = websocket.DefaultDialer.Dial("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", http.Header{
				"Authorization": []string{"Bearer " + secretKey},
				"OpenAI-Beta":   []string{"realtime=v1"},
			})
			if err != nil {
				fmt.Printf("Error connecting to OpenAI Realtime API: %v\n", err)
				continue
			}

			// Start a goroutine to handle messages from OpenAI
			go func() {
				var currentMessage string
				for {
					_, message, err := openAIConn.ReadMessage()
					fmt.Printf("Raw message from OpenAI:\n%s\n\n", string(message))
					if err != nil {
						fmt.Printf("Error reading message from OpenAI Realtime API: %v\n", err)
						openAIConn.Close()
						openAIConn = nil
						return
					}

					var msgType OpenAIMessageType
					if err := json.Unmarshal(message, &msgType); err != nil {
						fmt.Printf("Error parsing message type from OpenAI: %v\n", err)
						continue
					}

					switch msgType.Type {
					case "response.text.delta":
						var deltaMsg OpenAIResponseTextDelta
						if err := json.Unmarshal(message, &deltaMsg); err != nil {
							fmt.Printf("Error parsing delta message from OpenAI: %v\n", err)
							continue
						}
						currentMessage += deltaMsg.Delta

					case "response.text.done":
						var doneMsg OpenAIResponseTextDone
						if err := json.Unmarshal(message, &doneMsg); err != nil {
							fmt.Printf("Error parsing done message from OpenAI: %v\n", err)
							continue
						}
						assistantMsg := Message{
							Sender:  "Assistant @OpenAI Realtime",
							Content: currentMessage,
						}

						chat.Mutex.Lock()
						chat.Messages = append(chat.Messages, assistantMsg)
						for client := range chat.Clients {
							err := client.WriteJSON(assistantMsg)
							if err != nil {
								fmt.Printf("Error sending message to client: %v\n", err)
								client.Close()
								delete(chat.Clients, client)
							}
						}
						chat.Mutex.Unlock()

						currentMessage = "" // Reset for the next message

					default:
						var errorMsg OpenAIError
						if err := json.Unmarshal(message, &errorMsg); err != nil {
							fmt.Printf("Error parsing error message from OpenAI: %v\n", err)
							continue
						}
						if errorMsg.Error.Message != "" {
							fmt.Printf("Error from OpenAI: %v\n", errorMsg.Error.Message)
						}
					}
				}
			}()
		}

		// Wait for a new message or connection error
		select {
		case msg := <-newMessage:
			// Send conversation.item.create
			conversationItem := ConversationItemCreate{
				Type: "conversation.item.create",
				Item: Item{
					Type: "message",
					Role: "user",
					Content: []Content{
						{
							Type: "input_text",
							Text: msg.Content,
						},
					},
				},
			}
			jsonConversationItem, err := json.Marshal(conversationItem)
			if err != nil {
				fmt.Printf("Error marshaling conversation.item.create: %v\n", err)
				continue
			}
			fmt.Printf("Message out to OpenAI:\n%s\n\n", string(jsonConversationItem))
			err = openAIConn.WriteJSON(conversationItem)
			if err != nil {
				fmt.Printf("Error sending conversation.item.create to OpenAI Realtime API: %v\n", err)
				openAIConn.Close()
				openAIConn = nil
				continue
			}

			// Send response.create
			responseCreate := ResponseCreate{
				Type: "response.create",
				Response: Response{
					Modalities: []string{"text"},
				},
			}
			jsonResponseCreate, err := json.Marshal(responseCreate)
			if err != nil {
				fmt.Printf("Error marshaling response.create: %v\n", err)
				continue
			}
			fmt.Printf("Message out to OpenAI:\n%s\n\n", string(jsonResponseCreate))
			err = openAIConn.WriteJSON(responseCreate)
			if err != nil {
				fmt.Printf("Error sending response.create to OpenAI Realtime API: %v\n", err)
				openAIConn.Close()
				openAIConn = nil
			}
		}
	}
}

func getUserChats(w http.ResponseWriter, r *http.Request) {
	userEmail := r.Header.Get("X-User-Email")

	chatMutex.Lock()
	userChats, exists := chats[userEmail]
	chatMutex.Unlock()

	if !exists {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]Chat{})
		return
	}

	result := make([]Chat, 0, len(userChats))
	for _, chat := range userChats {
		result = append(result, Chat{
			ID:        chat.ID,
			CreatorID: chat.CreatorID,
			Name:      chat.Name,
			Messages:  chat.Messages,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(result)
	if err != nil {
		fmt.Printf("Error encoding JSON response: %v\n", err)
	}
}

func deleteChat(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	chatID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	chatMutex.Lock()
	defer chatMutex.Unlock()

	userChats, exists := chats[userEmail]
	if !exists {
		http.Error(w, "Chat not found", http.StatusNotFound)
		return
	}

	chat, exists := userChats[chatID]
	if !exists {
		http.Error(w, "Chat not found", http.StatusNotFound)
		return
	}

	if chat.CreatorID != userEmail {
		http.Error(w, "Unauthorized to delete this chat", http.StatusForbidden)
		return
	}

	// Close all WebSocket connections
	for client := range chat.Clients {
		client.Close()
	}

	// Remove the chat
	delete(userChats, chatID)

	w.WriteHeader(http.StatusNoContent)
}
