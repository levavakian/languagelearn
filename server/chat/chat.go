package chat

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/levavakian/languagelearn/server/auth"
	"github.com/levavakian/languagelearn/server/db"
)

// Global map to track active chat connections
var (
	activeChats = make(map[string]*ChatConnections)
	chatsMutex sync.RWMutex
	maxConsecutiveErrors = 3
)

type ChatConnections struct {
	Clients map[*websocket.Conn]bool
	Mutex   sync.RWMutex
	ErrorState ChatErrorState
	SettingsUpdate chan SettingsUpdate
}

type ChatErrorState struct {
	ConsecutiveErrors int
	LastError        time.Time
	Mutex            sync.Mutex
}

type Chat struct {
	ID        string    `json:"id"`
	CreatorID string    `json:"creatorId"`
	Name      string    `json:"name"`
	Messages  []Message `json:"messages"`
}

type Message struct {
	Sender              string `json:"sender"`
	Content             string `json:"content"`
	Type                string `json:"type,omitempty"` // "text" or "audio"
	PreferredResponseType string `json:"preferredResponseType,omitempty"` // "text" or "audio"
	ResponseID          string `json:"responseId,omitempty"`
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
	Instructions string   `json:"instructions,omitempty"`
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
	Type  string `json:"type"`
	Text  string `json:"text,omitempty"`
	Audio string `json:"audio,omitempty"`
}

type OpenAIMessageType struct {
	Type string `json:"type"`
}

type OpenAIResponseTextDelta struct {
	Type  string `json:"type"`
	Delta string `json:"delta"`
}

type OpenAIResponseAudioDelta struct {
	Type      string `json:"type"`
	Delta     string `json:"delta"`
	ResponseID string `json:"response_id"`
}

type OpenAIResponseDone struct {
	Type     string `json:"type"`
	EventID  string `json:"event_id"`
	Response struct {
		Object        string `json:"object"`
		ID           string `json:"id"`
		Status       string `json:"status"`
		StatusDetails struct {
			Type  string `json:"type"`
			Error struct {
				Type    string `json:"type"`
				Code    interface{} `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		} `json:"status_details"`
		Output []struct {
			Content []struct {
				Type      string `json:"type"`
				Text      string `json:"text,omitempty"`
				Transcript string `json:"transcript,omitempty"`
			} `json:"content"`
		} `json:"output"`
	} `json:"response"`
}

type OpenAIError struct {
	Type  string `json:"type"`
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}

type InputAudioTranscription struct {
	Model string `json:"model"`
}

type TurnDetection struct {
	Type              string  `json:"type"`
	Threshold         float64 `json:"threshold"`
	PrefixPaddingMs  int     `json:"prefix_padding_ms"`
	SilenceDurationMs int     `json:"silence_duration_ms"`
}

type SessionUpdate struct {
	EventID string  `json:"event_id"`
	Type    string  `json:"type"`
	Session Session `json:"session"`
}

type Session struct {
	Modalities              []string                `json:"modalities,omitempty"`
	Instructions           string                   `json:"instructions,omitempty"`
	Voice                  string                   `json:"voice,omitempty"`
	InputAudioFormat       string                   `json:"input_audio_format,omitempty"`
	OutputAudioFormat      string                   `json:"output_audio_format,omitempty"`
	InputAudioTranscription InputAudioTranscription `json:"input_audio_transcription,omitempty"`
	TurnDetection          *TurnDetection          `json:"turn_detection"`
	ToolChoice              string                  `json:"tool_choice,omitempty"`
	Temperature             float64                 `json:"temperature,omitempty"`
	MaxResponseOutputTokens int                     `json:"max_response_output_tokens,omitempty"`
}

type InputAudioBufferAppend struct {
	Type   string `json:"type"`
	Audio  string `json:"audio"` // Base64 encoded audio data
}

type InputAudioBufferCommit struct {
	Type string `json:"type"`
}

type AudioTranscriptionCompleted struct {
	EventID       string `json:"event_id"`
	Type          string `json:"type"`
	ItemID        string `json:"item_id"`
	ContentIndex  int    `json:"content_index"`
	Transcript    string `json:"transcript"`
}

var (
	upgrader  = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
)

// Database access functions
func InsertChat(chatID string, creatorEmail string, name string) error {
	_, err := db.DB.Exec(
		"INSERT INTO chats (id, creator_id, name) VALUES (?, ?, ?)",
		chatID, creatorEmail, name,
	)
	return err
}

func insertMessage(chatID string, msg Message) error {
	_, err := db.DB.Exec(
		"INSERT INTO messages (chat_id, sender, content, type, response_id) VALUES (?, ?, ?, ?, ?)",
		chatID, msg.Sender, msg.Content, msg.Type, msg.ResponseID,
	)
	return err
}

func getChatFromDB(userEmail string, chatID string) (*Chat, error) {
	var chat Chat
	err := db.DB.QueryRow(
		"SELECT id, creator_id, name FROM chats WHERE id = ? AND creator_id = ?",
		chatID, userEmail,
	).Scan(&chat.ID, &chat.CreatorID, &chat.Name)
	
	if err != nil {
		return nil, err
	}

	messages, err := getMessagesForChat(chatID)
	if err != nil {
		return nil, err
	}

	chat.Messages = messages
	return &chat, nil
}

func getMessagesForChat(chatID string) ([]Message, error) {
	var messages []Message
	rows, err := db.DB.Query(
		"SELECT sender, content, type, response_id FROM messages WHERE chat_id = ? ORDER BY created_at",
		chatID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var msg Message
		if err := rows.Scan(&msg.Sender, &msg.Content, &msg.Type, &msg.ResponseID); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}
	return messages, nil
}

func getUserChatsFromDB(userEmail string) ([]Chat, error) {
	rows, err := db.DB.Query(
		"SELECT id, creator_id, name FROM chats WHERE creator_id = ?",
		userEmail,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []Chat
	for rows.Next() {
		var chat Chat
		if err := rows.Scan(&chat.ID, &chat.CreatorID, &chat.Name); err != nil {
			return nil, err
		}
		
		messages, err := getMessagesForChat(chat.ID)
		if err != nil {
			continue
		}
		chat.Messages = messages
		result = append(result, chat)
	}
	return result, nil
}

func getChatCreator(chatID string) (string, error) {
	var creatorID string
	err := db.DB.QueryRow(
		"SELECT creator_id FROM chats WHERE id = ?",
		chatID,
	).Scan(&creatorID)
	return creatorID, err
}

func deleteChatFromDB(chatID string) error {
	_, err := db.DB.Exec("DELETE FROM chats WHERE id = ?", chatID)
	return err
}

func SetupRoutes(api *mux.Router) {
	api.HandleFunc("/chat", auth.AuthMiddleware(createChat)).Methods("POST")
	api.HandleFunc("/chat/{id}/ws", auth.AuthMiddleware(handleWebSocket))
	api.HandleFunc("/chats", auth.AuthMiddleware(getUserChats)).Methods("GET")
	api.HandleFunc("/chat/{id}", auth.AuthMiddleware(deleteChat)).Methods("DELETE")
	api.HandleFunc("/chats/names", auth.AuthMiddleware(getChatNames)).Methods("POST")
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
	
	if err := InsertChat(chatID, creatorEmail, chatData.Name); err != nil {
		http.Error(w, "Failed to create chat", http.StatusInternalServerError)
		return
	}

	newChat := Chat{
		ID:        chatID,
		CreatorID: creatorEmail,
		Name:      chatData.Name,
		Messages:  []Message{},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(newChat)
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	chatID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	fmt.Printf("WebSocket connection attempt for chat ID: %s, user: %s\n", chatID, userEmail)

	chat, err := getChatFromDB(userEmail, chatID)
	if err != nil || chat == nil {
		http.Error(w, "Chat not found", http.StatusNotFound)
		return
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
		if err != nil {
			break
		}

		// Only add text messages to chat history
		if msg.Type != "audio" {
			addMessageToChat(chat.ID, msg)
		}
		broadcastMessage(chatConns, msg)

		// Send the new message to OpenAI
		newMessage <- msg
	}
}

func addMessageToChat(chatID string, msg Message) {
	if err := insertMessage(chatID, msg); err != nil {
		fmt.Printf("Error saving message: %v\n", err)
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

func handleOpenAIConnection(chat *Chat, chatConns *ChatConnections, newMessage <-chan Message) {
	var openAIConn *websocket.Conn
	var err error

	// Get initial settings
	settings, err := getChatSettingsFromDB(chat.ID)
	if err != nil {
		settings = getDefaultSettings(chat.ID)
	}

	for {
		if openAIConn == nil {
			openAIConn, err = connectToOpenAI()
			if err != nil {
				fmt.Printf("Error connecting to OpenAI Realtime API: %v\n", err)
				continue
			}

			// Send initial session update
			if err := updateOpenAISession(openAIConn, settings.CustomInstructions); err != nil {
				fmt.Printf("Error sending session update: %v\n", err)
				openAIConn.Close()
				openAIConn = nil
				continue
			}

			injectItem := ConversationItemCreate{
				Type: "conversation.item.create",
				Item: Item{
					Type: "message",
					Role: "user",
					Content: []Content{
						{
							Type: "input_text",
							Text: "<FOLLOW THESE INSTRUCTIONS: when responding in text, do not respond in JSON or pesudo code unless explicitly requested to do so>",
						},
					},
				},
			}

			if err := openAIConn.WriteJSON(injectItem); err != nil {
				fmt.Printf("Error sending injection message: %v\n", err)
				openAIConn.Close()
				openAIConn = nil
				continue
			}

			go handleOpenAIMessages(chat.ID, chatConns, openAIConn)
		}

		// Wait for a new message, settings update, or connection error
		select {
		case msg := <-newMessage:
			if err := sendMessageToOpenAI(openAIConn, msg, chatConns); err != nil {
				fmt.Printf("Error sending message to OpenAI: %v\n", err)
				openAIConn.Close()
				openAIConn = nil
			}
		case update := <-chatConns.SettingsUpdate:
			if err := updateOpenAISession(openAIConn, update.Settings.CustomInstructions); err != nil {
				fmt.Printf("Error updating OpenAI session: %v\n", err)
				openAIConn.Close()
				openAIConn = nil
			}
		}
	}
}

func connectToOpenAI() (*websocket.Conn, error) {
	secretKey := os.Getenv("OPENAI_SECRET_KEY")
	if secretKey == "" {
		return nil, fmt.Errorf("OPENAI_SECRET_KEY environment variable is not set")
	}

	conn, _, err := websocket.DefaultDialer.Dial("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", http.Header{
		"Authorization": []string{"Bearer " + secretKey},
		"OpenAI-Beta":   []string{"realtime=v1"},
	})
	return conn, err
}

func handleOpenAIMessages(chatID string, chatConns *ChatConnections, conn *websocket.Conn) {
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			fmt.Printf("Error reading message from OpenAI Realtime API: %v\n", err)
			conn.Close()
			return
		}

		// Check if message contains audio data and prepare log message
		logMessage := func() string {
			var msgData map[string]interface{}
			if err := json.Unmarshal(message, &msgData); err != nil {
				return string(message)
			}

			if msgData["type"] != "response.audio.delta" {
				return string(message)
			}

			deltaMsg, ok := msgData["delta"].(string)
			if !ok || len(deltaMsg) == 0 {
				return string(message)
			}

			// Truncate audio data to first 10 chars for logging
			if len(deltaMsg) > 10 {
				msgData["delta"] = deltaMsg[:10]
			}
			truncatedMsg, _ := json.Marshal(msgData)
			return string(truncatedMsg) + " (audio truncated)"
		}()

		fmt.Printf("Raw message from OpenAI:\n%s\n\n", logMessage)

		var msgType OpenAIMessageType
		if err := json.Unmarshal(message, &msgType); err != nil {
			fmt.Printf("Error parsing message type from OpenAI: %v\n", err)
			continue
		}

		switch msgType.Type {
		case "conversation.item.input_audio_transcription.completed":
			var transcriptionMsg AudioTranscriptionCompleted
			if err := json.Unmarshal(message, &transcriptionMsg); err != nil {
				fmt.Printf("Error parsing transcription message from OpenAI: %v\n", err)
				continue
			}

			userMsg := Message{
				Sender:  "user",
				Content: transcriptionMsg.Transcript,
				Type:    "text",
			}

			addMessageToChat(chatID, userMsg)
			broadcastMessage(chatConns, userMsg)

		case "response.audio.delta":
			var audioMsg OpenAIResponseAudioDelta
			if err := json.Unmarshal(message, &audioMsg); err != nil {
				fmt.Printf("Error parsing audio delta message from OpenAI: %v\n", err)
				continue
			}

			assistantMsg := Message{
				Sender:     "Assistant @OpenAI Realtime",
				Content:    audioMsg.Delta,
				Type:       "audio",
				ResponseID: audioMsg.ResponseID,
			}

			broadcastMessage(chatConns, assistantMsg)

		case "response.done":
			var doneMsg OpenAIResponseDone
			if err := json.Unmarshal(message, &doneMsg); err != nil {
				fmt.Printf("Error parsing done message from OpenAI: %v\n", err)
				continue
			}

			// Check specifically for server error
			if doneMsg.Response.Status == "failed" && 
			   doneMsg.Response.StatusDetails.Error.Type == "server_error" {
				chatConns.ErrorState.Mutex.Lock()
				chatConns.ErrorState.ConsecutiveErrors++
				chatConns.ErrorState.LastError = time.Now()
				errorCount := chatConns.ErrorState.ConsecutiveErrors
				chatConns.ErrorState.Mutex.Unlock()

				if errorCount >= maxConsecutiveErrors {
					errorMsg := Message{
						Sender:  "Assistant @OpenAI Realtime",
						Content: "<Error in receiving response from Tutor>",
						Type:    "text",
					}
					addMessageToChat(chatID, errorMsg)
					broadcastMessage(chatConns, errorMsg)
				} else {
					// Retry with response.create
					responseCreate := ResponseCreate{
						Type: "response.create",
						Response: Response{
							Modalities: []string{"text"},
						},
					}
					if err := conn.WriteJSON(responseCreate); err != nil {
						fmt.Printf("Error sending retry response.create: %v\n", err)
					}
				}
				continue
			}

			// Reset error count on successful response
			chatConns.ErrorState.Mutex.Lock()
			chatConns.ErrorState.ConsecutiveErrors = 0
			chatConns.ErrorState.Mutex.Unlock()

			if len(doneMsg.Response.Output) > 0 && len(doneMsg.Response.Output[0].Content) > 0 {
				content := doneMsg.Response.Output[0].Content[0]
				
				var assistantMsg Message
				assistantMsg.Sender = "Assistant @OpenAI Realtime"
				assistantMsg.ResponseID = doneMsg.Response.ID

				if content.Type == "text" {
					assistantMsg.Type = "text"
					assistantMsg.Content = content.Text
					
					addMessageToChat(chatID, assistantMsg)
					broadcastMessage(chatConns, assistantMsg)
				} else if content.Type == "audio" {
					assistantMsg.Type = "text"
					assistantMsg.Content = content.Transcript
					
					go func(msg Message) {
						time.Sleep(500 * time.Millisecond)
						addMessageToChat(chatID, msg)
						broadcastMessage(chatConns, msg)
					}(assistantMsg)
				}
			}

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
}

func sendMessageToOpenAI(conn *websocket.Conn, msg Message, chatConns *ChatConnections) error {
	// Reset error state at the start of new message
	chatConns.ErrorState.Mutex.Lock()
	chatConns.ErrorState.ConsecutiveErrors = 0
	chatConns.ErrorState.Mutex.Unlock()

	if msg.Type == "audio" {
		if msg.Content == "commit" {
			// Cancel any pending responses first
			cancelResponse := struct {
				Type string `json:"type"`
			}{
				Type: "response.cancel",
			}

			cancelResponseBytes, err := json.Marshal(cancelResponse)
			if err != nil {
				return fmt.Errorf("error marshaling response.cancel: %v", err)
			}

			fmt.Printf("Sending cancel to OpenAI:\n%s\n\n", string(cancelResponseBytes))

			if err := conn.WriteJSON(cancelResponse); err != nil {
				return fmt.Errorf("error sending response.cancel: %v", err)
			}

			// Send commit message when audio recording is finished
			audioCommit := InputAudioBufferCommit{
				Type: "input_audio_buffer.commit",
			}

			audioCommitBytes, err := json.Marshal(audioCommit)
			if err != nil {
				return fmt.Errorf("error marshaling input_audio_buffer.commit: %v", err)
			}

			fmt.Printf("Sending audio commit to OpenAI:\n%s\n\n", string(audioCommitBytes))

			if err := conn.WriteJSON(audioCommit); err != nil {
				return fmt.Errorf("error sending input_audio.buffer.commit: %v", err)
			}

			// For audio messages, always request both audio and text
			responseCreate := ResponseCreate{
				Type: "response.create",
				Response: Response{
					Modalities: []string{"audio", "text"},
				},
			}

			responseCreateBytes, err := json.Marshal(responseCreate)
			if err != nil {
				return fmt.Errorf("error marshaling response.create: %v", err)
			}

			fmt.Printf("Sending response create to OpenAI:\n%s\n\n", string(responseCreateBytes))

			if err := conn.WriteJSON(responseCreate); err != nil {
				return fmt.Errorf("error sending response.create: %v", err)
			}

			return nil
		}

		// Handle audio buffer append for non-commit messages
		audioBuffer := InputAudioBufferAppend{
			Type:   "input_audio_buffer.append",
			Audio: msg.Content,
		}

		_, err := json.Marshal(audioBuffer)
		if err != nil {
			return fmt.Errorf("error marshaling input_audio.buffer.append: %v", err)
		}

		// Create a copy of audioBuffer with truncated Audio field for logging
		logAudioBuffer := InputAudioBufferAppend{
			Type:   audioBuffer.Type,
			Audio:  msg.Content[:min(10, len(msg.Content))],
		}
		logAudioBufferBytes, _ := json.Marshal(logAudioBuffer)
		fmt.Printf("Sending audio buffer to OpenAI:\n%s\n\n", string(logAudioBufferBytes))

		if err := conn.WriteJSON(audioBuffer); err != nil {
			return fmt.Errorf("error sending input_audio_buffer.append: %v", err)
		}

		return nil
	}

	// Handle text messages
	conversationItem := ConversationItemCreate{
		Type: "conversation.item.create",
		Item: Item{
			Type:    "message",
			Role:    "user",
			Content: []Content{
				{
					Type: "input_text",
					Text: msg.Content,
				},
			},
		},
	}

	conversationItemBytes, err := json.Marshal(conversationItem)
	if err != nil {
		return fmt.Errorf("error marshaling conversation.item.create: %v", err)
	}

	fmt.Printf("Sending message to OpenAI:\n%s\n\n", string(conversationItemBytes))

	if err := conn.WriteJSON(conversationItem); err != nil {
		return fmt.Errorf("error sending conversation.item.create: %v", err)
	}

	// Determine response modalities based on preferredResponseType
	modalities := []string{"text"}
	if msg.PreferredResponseType == "audio" {
		modalities = []string{"audio", "text"}
	}

	responseCreate := ResponseCreate{
		Type: "response.create",
		Response: Response{
			Modalities: modalities,
		},
	}

	responseCreateBytes, err := json.Marshal(responseCreate)
	if err != nil {
		return fmt.Errorf("error marshaling response.create: %v", err)
	}
	fmt.Printf("Sending response create to OpenAI:\n%s\n\n", string(responseCreateBytes))

	if err := conn.WriteJSON(responseCreate); err != nil {
		return fmt.Errorf("error sending response.create: %v", err)
	}

	return nil
}

func getUserChats(w http.ResponseWriter, r *http.Request) {
	userEmail := r.Header.Get("X-User-Email")

	chats, err := getUserChatsFromDB(userEmail)
	if err != nil {
		http.Error(w, "Failed to fetch chats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chats)
}

func deleteChat(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	chatID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	// Verify ownership
	creatorID, err := getChatCreator(chatID)
	if err != nil {
		http.Error(w, "Chat not found", http.StatusNotFound)
		return
	}

	if creatorID != userEmail {
		http.Error(w, "Unauthorized to delete this chat", http.StatusForbidden)
		return
	}

	if err := deleteChatFromDB(chatID); err != nil {
		http.Error(w, "Failed to delete chat", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Add new function to update OpenAI session settings
func updateOpenAISession(conn *websocket.Conn, instructions string) error {
	sessionUpdate := SessionUpdate{
		EventID: uuid.New().String(),
		Type:    "session.update",
		Session: Session{
			Modalities:    []string{"text", "audio"},
			Instructions:  instructions,
			Voice:        "alloy",
			InputAudioFormat: "pcm16",
			OutputAudioFormat: "pcm16",
			InputAudioTranscription: InputAudioTranscription{
				Model: "whisper-1",
			},
			TurnDetection: nil,
			ToolChoice:              "auto",
			Temperature:             0.8,
			MaxResponseOutputTokens: 4096,
		},
	}

	return conn.WriteJSON(sessionUpdate)
}

// Add new type to handle settings updates
type SettingsUpdate struct {
	ChatID string
	Settings ChatSettings
}

func CreateChat(chatID string, userEmail string) error {
	_, err := db.DB.Exec(
		"INSERT INTO chats (id, user_id) VALUES (?, ?)",
		chatID, userEmail,
	)
	return err
}

func DeleteChat(chatID string) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %v", err)
	}
	defer tx.Rollback()

	// Delete all messages in the chat
	_, err = tx.Exec("DELETE FROM chat_messages WHERE chat_id = ?", chatID)
	if err != nil {
		return fmt.Errorf("failed to delete chat messages: %v", err)
	}

	// Delete any chat settings
	_, err = tx.Exec("DELETE FROM chat_settings WHERE chat_id = ?", chatID)
	if err != nil {
		return fmt.Errorf("failed to delete chat settings: %v", err)
	}

	// Delete the chat itself
	_, err = tx.Exec("DELETE FROM chats WHERE id = ?", chatID)
	if err != nil {
		return fmt.Errorf("failed to delete chat: %v", err)
	}

	return tx.Commit()
}

func getChatNames(w http.ResponseWriter, r *http.Request) {
	userEmail := r.Header.Get("X-User-Email")
	var request struct {
		ChatIDs []string `json:"chat_ids"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	chatNames := make(map[string]string)
	for _, chatID := range request.ChatIDs {
		// First check if this chat belongs to a lesson in a course owned by the user
		var creatorID string
		err := db.DB.QueryRow(`
			SELECT c.creator_id 
			FROM courses c 
			JOIN lessons l ON l.course_id = c.id 
			WHERE l.chat_id = ?`, 
			chatID,
		).Scan(&creatorID)

		if err != nil || creatorID != userEmail {
			continue // Skip this chat if not found or not authorized
		}

		// Now get the chat name
		var name string
		err = db.DB.QueryRow(
			"SELECT name FROM chats WHERE id = ?",
			chatID,
		).Scan(&name)
		
		if err != nil {
			chatNames[chatID] = "Untitled Lesson"
			continue
		}
		chatNames[chatID] = name
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chatNames)
}
