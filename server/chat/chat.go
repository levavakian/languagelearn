package chat

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

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

	var chatData struct {
		Name string `json:"name"`
	}
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
	
	// Send message history to the newly connected client
	for _, msg := range chat.Messages {
		err := conn.WriteJSON(msg)
		if err != nil {
			fmt.Printf("Error sending message history: %v\n", err)
			chat.Mutex.Unlock()
			return
		}
	}
	chat.Mutex.Unlock()

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
