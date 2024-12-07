package course

import (
	"fmt"
	"net/http"
	"time"
	"os"
	"encoding/json"
	"strings"
	"sync"


	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// OpenAI message types and related structs
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
		Usage OpenAIResponseDoneUsage `json:"usage"`
    } `json:"response"`
}

type OpenAIResponseDoneUsage struct {
	TotalTokens int `json:"total_tokens"`
	InputTokens int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
	InputTokenDetails struct {
		TextTokens int `json:"text_tokens"`
		AudioTokens int `json:"audio_tokens"`
		CachedTokens int `json:"cached_tokens"`
		CachedTokenDetails struct {
			TextTokens int `json:"text_tokens"`
			AudioTokens int `json:"audio_tokens"`
		} `json:"cached_token_details"`
	} `json:"input_token_details"`
	OutputTokenDetails struct {
		TextTokens int `json:"text_tokens"`
		AudioTokens int `json:"audio_tokens"`
	} `json:"output_token_details"`
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

// Add these structs after the existing type definitions
type InputAudioBufferAppend struct {
    Type   string `json:"type"`
    Audio  string `json:"audio"` // Base64 encoded audio data
}

type InputAudioBufferCommit struct {
    Type string `json:"type"`
}

// Add these struct definitions
type AudioTranscriptionCompleted struct {
    EventID       string `json:"event_id"`
    Type          string `json:"type"`
    ItemID        string `json:"item_id"`
    ContentIndex  int    `json:"content_index"`
    Transcript    string `json:"transcript"`
}

type ResponseCreate struct {
    Type     string   `json:"type"`
    Response Response `json:"response"`
}

type Response struct {
    Modalities   []string `json:"modalities"`
    Instructions string   `json:"instructions,omitempty"`
}

type OpenAIConnection struct {
	Conn *websocket.Conn
	Closed chan bool
	IsClosed bool
	LastSend time.Time
	LastRead time.Time
	Mutex sync.Mutex
}

func connectToOpenAI() (*OpenAIConnection, error) {
	secretKey := os.Getenv("OPENAI_SECRET_KEY")
	if secretKey == "" {
		return nil, fmt.Errorf("OPENAI_SECRET_KEY environment variable is not set")
	}

	conn, _, err := websocket.DefaultDialer.Dial("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", http.Header{
		"Authorization": []string{"Bearer " + secretKey},
		"OpenAI-Beta":   []string{"realtime=v1"},
	})

	openAIConn := &OpenAIConnection{
		Conn: conn,
		Closed: make(chan bool, 1),
		IsClosed: false,
	}

	return openAIConn, err
}

func sendConversationCreate(conn *websocket.Conn, msg Message) error {
    messageRole := "assistant"
    if msg.Sender == "user" {
        messageRole = "user"
    }

    contentType := "input_text"
    if msg.Type != "text" {
        contentType = "input_audio"
    }
	if messageRole == "assistant" {
		contentType = "text"
	}

    create := ConversationItemCreate{
        Type: "conversation.item.create",
        Item: Item{
            Type: "message",
            Role: messageRole,
            Content: []Content{
                {
                    Type: contentType,
                    Text: msg.Content,
                },
            },
        },
    }
    
    return conn.WriteJSON(create)
}

func handleOpenAIMessages(chatID string, chatConns *ChatConnections, conn *OpenAIConnection) {
	startTime := time.Now()
	lastRead := time.Now()

	go func(){
		for {
			if conn.IsClosed {
				return
			}

			if time.Since(startTime) > 10*time.Minute && time.Since(lastRead) > 1*time.Second {
				conn.Closed <- true
				return
			}
			time.Sleep(100 * time.Millisecond)
		}
	}()

	for {
		_, message, err := conn.Conn.ReadMessage()
		conn.LastRead = time.Now()
		if err != nil {
			fmt.Printf("Error reading message from OpenAI Realtime API: %v\n", err)
			conn.Mutex.Lock()
			isClosedConnErr := strings.Contains(err.Error(), "use of closed network connection")
			if !conn.IsClosed && !isClosedConnErr {
				conn.Closed <- true
			}
			conn.Mutex.Unlock()
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

		addMessageToChat := func(msg Message) {
			if err := InsertMessage(&msg); err != nil {
				fmt.Printf("Error saving message: %v\n", err)
			}
		}

		switch msgType.Type {
		case "conversation.item.input_audio_transcription.completed":
			var transcriptionMsg AudioTranscriptionCompleted
			chatConns.LastTranscriptMessage.Mutex.Lock()
			chatConns.LastTranscriptMessage.Timestamp = time.Now()
			chatConns.LastTranscriptMessage.Mutex.Unlock()
			if err := json.Unmarshal(message, &transcriptionMsg); err != nil {
				fmt.Printf("Error parsing transcription message from OpenAI: %v\n", err)
				continue
			}

			userMsg := Message{
				ChatID: chatID,
				Sender:  "user",
				Content: transcriptionMsg.Transcript,
				Type:    "text",
				IsTranscript: true,
				CreatedAt: time.Now(),
			}

			addMessageToChat(userMsg)
			broadcastMessage(chatConns, userMsg)

		case "response.audio.delta":
			var audioMsg OpenAIResponseAudioDelta
			if err := json.Unmarshal(message, &audioMsg); err != nil {
				fmt.Printf("Error parsing audio delta message from OpenAI: %v\n", err)
				continue
			}

			assistantMsg := Message{
				ChatID: chatID,
				Sender:     "Assistant @OpenAI Realtime",
				Content:    audioMsg.Delta,
				Type:       "audio",
				ResponseID: audioMsg.ResponseID,
				CreatedAt: time.Now(),
			}

			broadcastMessage(chatConns, assistantMsg)

		case "response.done":
			var doneMsg OpenAIResponseDone
			if err := json.Unmarshal(message, &doneMsg); err != nil {
				fmt.Printf("Error parsing done message from OpenAI: %v\n", err)
				continue
			}

			// Calculate and deduct credits before processing the response
			creditCost := calculateRealtimeCreditUsage(doneMsg.Response.Usage)
			if err := DeductCredits(chatConns.UserEmail, creditCost); err != nil {
				fmt.Printf("Error deducting credits: %v\n", err)
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
					ChatID: chatID,
						Sender:  "system",
						Content: "Error in receiving response from Tutor",
						Type:    "error",
						CreatedAt: time.Now(),
					}
					addMessageToChat(errorMsg)
					broadcastMessage(chatConns, errorMsg)
				} else {
					// Retry with response.create
					responseCreate := ResponseCreate{
						Type: "response.create",
						Response: Response{
							Modalities: []string{"text"},
						},
					}
					if err := conn.Conn.WriteJSON(responseCreate); err != nil {
						fmt.Printf("Error sending retry response.create: %v\n", err)
					}
				}
				continue
			}

			// Check for insufficient quota
			if doneMsg.Response.Status == "failed" &&
				doneMsg.Response.StatusDetails.Error.Type == "insufficient_quota" {
				errorMsg := Message{
					ChatID: chatID,
					Sender:  "system",
					Content: "Hit global rate limits, please try again later.",
					Type:    "error",
					CreatedAt: time.Now(),
				}
				broadcastMessage(chatConns, errorMsg)
				continue
			}
			

			// Reset error count on successful response
			chatConns.ErrorState.Mutex.Lock()
			chatConns.ErrorState.ConsecutiveErrors = 0
			chatConns.ErrorState.Mutex.Unlock()

			if len(doneMsg.Response.Output) > 0 && len(doneMsg.Response.Output[0].Content) > 0 {
				content := doneMsg.Response.Output[0].Content[0]
				
				var assistantMsg Message
				assistantMsg.ChatID = chatID
				assistantMsg.Sender = "Assistant @OpenAI Realtime"
				assistantMsg.ResponseID = doneMsg.Response.ID

				if content.Type == "text" {
					assistantMsg.Type = "text"
					assistantMsg.Content = content.Text
					
					addMessageToChat(assistantMsg)
					broadcastMessage(chatConns, assistantMsg)
				} else if content.Type == "audio" {
					assistantMsg.Type = "text"
					assistantMsg.Content = content.Transcript
					
					go func(msg Message) {
						startTime := time.Now()
						for {
							// Check if there's a recent transcript
							chatConns.LastTranscriptMessage.Mutex.Lock()
							lastTranscriptTime := chatConns.LastTranscriptMessage.Timestamp
							chatConns.LastTranscriptMessage.Mutex.Unlock()

							timeSinceStart := time.Since(startTime)
							
							// Add message if:
							// 1. No recent transcript (>500ms old) exists, or
							// 2. More than 2 seconds have passed since start
							if lastTranscriptTime.After(startTime.Add(-2000*time.Millisecond)) || 
							   timeSinceStart > 2*time.Second {
								addMessageToChat(msg)
								broadcastMessage(chatConns, msg)
								return
							}

							// Check every 100ms
							time.Sleep(100 * time.Millisecond)
						}
					}(assistantMsg)
				}
			}

		case "input_audio_buffer.speech_stopped":
			speechStoppedMsg := Message{
				ChatID:  chatID,
				Sender:  "Assistant @OpenAI Realtime",
				Content: "speech_stopped", 
				Type:    "audio",
				CreatedAt: time.Now(),
			}
			
			broadcastMessage(chatConns, speechStoppedMsg)

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
		if msg.Content == "server_vad:enable" {
			// Get current instructions
			instructions, err := getInstructions(msg.ChatID)
			if err != nil {
				fmt.Printf("Error getting instructions: %v\n", err)
				// Continue with empty instructions if there's an error
				instructions = ""
			}

			// Enable server VAD
			turnDetection := &TurnDetection{
				Type:              "server_vad",
				Threshold:         0.5,
				PrefixPaddingMs:  300,
				SilenceDurationMs: 500,
			}
			return updateOpenAISession(conn, instructions, turnDetection)
		}
		
		if msg.Content == "server_vad:disable" {
			// Get current instructions
			instructions, err := getInstructions(msg.ChatID)
			if err != nil {
				fmt.Printf("Error getting instructions: %v\n", err)
				// Continue with empty instructions if there's an error
				instructions = ""
			}

			// Disable server VAD by setting TurnDetection to nil
			return updateOpenAISession(conn, instructions, nil)
		}

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

func updateOpenAISession(conn *websocket.Conn, instructions string, turnDetection *TurnDetection) error {
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
			TurnDetection: turnDetection,
			ToolChoice:              "auto",
			Temperature:             0.8,
			MaxResponseOutputTokens: 4096,
		},
	}

	return conn.WriteJSON(sessionUpdate)
}

func getInstructions(chatID string) (string, error) {
	settings, err := getChatSettingsFromDB(chatID)
	if err != nil {
		// If there's an error getting settings, return default settings
		defaultSettings := getDefaultSettings(chatID)
		return defaultSettings.CustomInstructions, nil
	}

	instructions := settings.CustomInstructions

	// Get chat to check for associated lesson
	chat, err := GetChatRaw(chatID)
	if err != nil {
		return instructions, nil
	}

	// If chat has an associated lesson, get the lesson plan
	if chat.LessonID != "" {
		lesson, err := getLessonFromDB(chat.LessonID)
		if err == nil && lesson.LessonPlan != "" {
			instructions = instructions + "\nYou have a lesson plan for today, provided in the brackets <[" + lesson.LessonPlan + "]>"
		}
	}

	return instructions, nil
}

func InitOpenAIConnection(chat *Chat, chatConns *ChatConnections) (*OpenAIConnection, error) {
	userCredits, err := GetUserCredits(chatConns.UserEmail)
	if err != nil {
		fmt.Printf("Error getting user credits: %v\n", err)
	}

	if userCredits <= 0 {
		return nil, fmt.Errorf("insufficient credits")
	}

	// Get initial settings
	errMsg := Message{
		ChatID: chat.ID,
		Sender:  "system",
		Content: "Error initializing OpenAI connection",
		Type:    "error",
		IsTranscript: false,
		CreatedAt: time.Now(),
	}
	instructions, _ := getInstructions(chat.ID)

	openAIConn, err := connectToOpenAI()
	if err != nil {
		fmt.Printf("Error connecting to OpenAI Realtime API: %v\n", err)
		broadcastMessage(chatConns, errMsg)
		return nil, err
	}

	// Send initial session update
	if err := updateOpenAISession(openAIConn.Conn, instructions, nil); err != nil {
		fmt.Printf("Error sending session update: %v\n", err)
		openAIConn.Conn.Close()
		broadcastMessage(chatConns, errMsg)
		return nil, err
	}

	// Add initialization sequence for audio
	initMsg := ConversationItemCreate{
		Type: "conversation.item.create",
		Item: Item{
			Type: "message",
			Role: "system",
			Content: []Content{
				{
					Type: "text",
					Text: "Initialize audio session",
				},
			},
		},
	}

	if err := openAIConn.Conn.WriteJSON(initMsg); err != nil {
		fmt.Printf("Error sending audio init message: %v\n", err)
		openAIConn.Conn.Close()
		broadcastMessage(chatConns, errMsg)
		return nil, err
	}

	// Request response with audio and text modalities
	responseCreate := ResponseCreate{
		Type: "response.create",
		Response: Response{
			Modalities: []string{"audio", "text"},
		},
	}

	if err := openAIConn.Conn.WriteJSON(responseCreate); err != nil {
		fmt.Printf("Error sending initial response.create: %v\n", err)
		openAIConn.Conn.Close()
		broadcastMessage(chatConns, errMsg)
		return nil, err
	}

	// Wait for response.done before continuing
	done := make(chan bool)
	go func() {
		for {
			_, message, err := openAIConn.Conn.ReadMessage()
			if err != nil {
				fmt.Printf("Error reading init response: %v\n", err)
				done <- false
				return
			}

			var msgType OpenAIMessageType
			if err := json.Unmarshal(message, &msgType); err != nil {
				fmt.Printf("Error unmarshaling init response: %v\n", err)
				done <- false
				return
			}

			if msgType.Type == "response.done" {
				done <- true
				return
			}
		}
	}()

	select {
	case success := <-done:
		if !success {
			openAIConn.Conn.Close()
			broadcastMessage(chatConns, errMsg)
			return nil, err
		}
	case <-time.After(10 * time.Second):
		fmt.Printf("Timeout waiting for init response\n")
		openAIConn.Conn.Close()
		broadcastMessage(chatConns, errMsg)
		return nil, err
	}

	// Get lesson plan and vocab list if available and add them to the chat just for openai
	if chat.LessonID != "" {
		lesson, err := getLessonFromDB(chat.LessonID)
		if err == nil && lesson.LessonPlan != "" {
			lessonPlanMsg := Message{
				ChatID:  chat.ID,
				Sender:  "Assistant @OpenAI Realtime",
				Content: fmt.Sprintf("Our lesson plan for the day is:\n%s", lesson.LessonPlan),
				Type:    "text",
			}
			if err := sendConversationCreate(openAIConn.Conn, lessonPlanMsg); err != nil {
				fmt.Printf("Error sending lesson plan message to OpenAI: %v\n", err)
			}
		}

		// Get vocab list from chat settings
		settings, err := getChatSettingsFromDB(chat.ID)
		if err == nil && settings.VocabItems != nil && len(settings.VocabItems) > 0 {
			var vocabList strings.Builder
			vocabList.WriteString("Here is the list of vocab and concepts you have been reviewing:\n")
			
			for word, item := range settings.VocabItems {
				vocabList.WriteString(fmt.Sprintf("- %s (%s): %s", word, item.Type, item.Definition))
				if item.Notes != "" {
					vocabList.WriteString(fmt.Sprintf(" (Notes: %s)", item.Notes))
				}
				vocabList.WriteString(fmt.Sprintf(" [Used %d times, last used: %s]\n", 
					item.UsageCount, 
					item.LastUsed.Format("2006-01-02")))
			}

			vocabMsg := Message{
				ChatID:  chat.ID,
				Sender:  "Assistant @OpenAI Realtime",
				Content: vocabList.String(),
				Type:    "text",
			}
			if err := sendConversationCreate(openAIConn.Conn, vocabMsg); err != nil {
				fmt.Printf("Error sending vocab list message to OpenAI: %v\n", err)
			}
		}
	}

	// Send initial greeting message to OpenAI
	initialMsg := Message{
		ChatID:     chat.ID,
		Sender:     "Assistant @OpenAI Realtime", 
		Content:    "Hey, are you ready for your lesson? We can do over chat and over voice, and switch between at any time.",
		Type:       "text",
	}
	if err := sendConversationCreate(openAIConn.Conn, initialMsg); err != nil {
		fmt.Printf("Error sending initial message to OpenAI: %v\n", err)
		openAIConn.Conn.Close()
		broadcastMessage(chatConns, errMsg)
		return nil, err
	}

	// Send message history to OpenAI
	for _, msg := range chat.Messages {
		if err := sendConversationCreate(openAIConn.Conn, msg); err != nil {
			fmt.Printf("Error sending message history to OpenAI: %v\n", err)
			openAIConn.Conn.Close()
			broadcastMessage(chatConns, errMsg)
			return nil, err
		}
	}

	go handleOpenAIMessages(chat.ID, chatConns, openAIConn)
	return openAIConn, nil
}

func handleOpenAIConnection(chat *Chat, chatConns *ChatConnections, newMessage <-chan Message) {
	var openAIConn *OpenAIConnection
	var err error

	openAIConn, err = InitOpenAIConnection(chat, chatConns)
	if err != nil {
		fmt.Printf("Error initializing OpenAI connection: %v\n", err)
		openAIConn = &OpenAIConnection{
			IsClosed: true,
		}
	}

	for {
		// Wait for a new message, settings update, or connection error
		select {
		case msg, ok := <-newMessage:
			if !ok {
				if openAIConn != nil {
					openAIConn.Mutex.Lock()
					openAIConn.IsClosed = true
					if openAIConn.Conn != nil {
						openAIConn.Conn.Close()
					}
					openAIConn.Mutex.Unlock()
					fmt.Println("OpenAI connection closed for chat", chat.ID)
				}
				return
			}
			if openAIConn == nil || openAIConn.IsClosed {
				openAIConn, err = InitOpenAIConnection(chat, chatConns)
				if err != nil {
					fmt.Printf("Error initializing OpenAI connection: %v\n", err)
					openAIConn = &OpenAIConnection{
						IsClosed: true,
					}
					continue
				}
			}
			openAIConn.LastSend = time.Now()
			if err := sendMessageToOpenAI(openAIConn.Conn, msg, chatConns); err != nil {
				fmt.Printf("Error sending message to OpenAI: %v\n", err)
				openAIConn.IsClosed = true
				if openAIConn.Conn != nil {
					openAIConn.Conn.Close()
				}
				broadcastMessage(chatConns, Message{
					ChatID: chat.ID,
					Sender:  "system",
					Content: "Error communicating with OpenAI Realtime API",
					Type:    "error",
					IsTranscript: false,
					CreatedAt: time.Now(),
				})
			}
		case update := <-chatConns.SettingsUpdate:
			if openAIConn == nil || openAIConn.IsClosed {
				openAIConn, err = InitOpenAIConnection(chat, chatConns)
				if err != nil {
					fmt.Printf("Error initializing OpenAI connection: %v\n", err)
					continue
				}
			}
			if err := updateOpenAISession(openAIConn.Conn, update.Settings.CustomInstructions, nil); err != nil {
				fmt.Printf("Error updating OpenAI session: %v\n", err)
				openAIConn.IsClosed = true
				if openAIConn.Conn != nil {
					openAIConn.Conn.Close()
				}
				broadcastMessage(chatConns, Message{
					ChatID: chat.ID,
					Sender:  "system",
					Content: "Error updating session settings",
					Type:    "error",
					IsTranscript: false,
					CreatedAt: time.Now(),
				})
			}
		case restart := <-openAIConn.Closed:
			openAIConn.Mutex.Lock()
			if !openAIConn.IsClosed {
				openAIConn.IsClosed = true
				if openAIConn.Conn != nil {
					openAIConn.Conn.Close()
				}
			}
			openAIConn.Mutex.Unlock()
			if !restart {
				return
			}
		}
	}
}

// ConversationItemCreate struct
type ConversationItemCreate struct {
    Type string `json:"type"`
    Item Item   `json:"item"`
}

// Item struct
type Item struct {
    Type    string    `json:"type"`
    Role    string    `json:"role"`
    Content []Content `json:"content"`
}

// Content struct
type Content struct {
    Type  string `json:"type"`
    Text  string `json:"text,omitempty"`
    Audio string `json:"audio,omitempty"`
}

