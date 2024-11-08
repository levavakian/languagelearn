package course

import (
	"fmt"
	"net/http"
	"time"
	"os"

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

// Add these structs after the existing type definitions
type InputAudioBufferAppend struct {
    Type   string `json:"type"`
    Audio  string `json:"audio"` // Base64 encoded audio data
}

type InputAudioBufferCommit struct {
    Type string `json:"type"`
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

func sendConversationCreate(conn *websocket.Conn, msg Message) error {
    create := ConversationItemCreate{
        Type: "conversation.item.create",
        Item: Item{
            Type: "text",
            Role: "user",
            Content: []Content{
                {
                    Type: msg.Type,
                    Text: msg.Content,
                },
            },
        },
    }
    
    return conn.WriteJSON(create)
}

func handleOpenAIMessages(chatID string, chatConns *ChatConnections, conn *websocket.Conn) {
    defer conn.Close()

    var currentMessage Message
    currentMessage.Sender = "assistant"
    currentMessage.ID = uuid.New().String()
    currentMessage.ChatID = chatID
    currentMessage.CreatedAt = time.Now()

    for {
        var msgType OpenAIMessageType
        if err := conn.ReadJSON(&msgType); err != nil {
            fmt.Printf("Error reading message type: %v\n", err)
            break
        }

        switch msgType.Type {
        case "response.text.delta":
            var delta OpenAIResponseTextDelta
            if err := conn.ReadJSON(&delta); err != nil {
                continue
            }
            currentMessage.Content += delta.Delta
            broadcastMessage(chatConns, currentMessage)

        case "response.audio.delta":
            var delta OpenAIResponseAudioDelta
            if err := conn.ReadJSON(&delta); err != nil {
                continue
            }
            currentMessage.Type = "audio"
            currentMessage.Content = delta.Delta
            currentMessage.ResponseID = delta.ResponseID
            broadcastMessage(chatConns, currentMessage)

        case "response.done":
            if err := InsertMessage(&currentMessage); err != nil {
                fmt.Printf("Error saving message: %v\n", err)
            }
            return
        }
    }
}

func sendMessageToOpenAI(conn *websocket.Conn, msg Message, chatConns *ChatConnections) error {
    if msg.Type == "audio" {
        if msg.Content == "commit" {
            audioCommit := InputAudioBufferCommit{
                Type: "input_audio_buffer.commit",
            }
            if err := conn.WriteJSON(audioCommit); err != nil {
                return fmt.Errorf("error sending audio commit: %v", err)
            }
            return nil
        }

        audioBuffer := InputAudioBufferAppend{
            Type:  "input_audio_buffer.append",
            Audio: msg.Content,
        }
        if err := conn.WriteJSON(audioBuffer); err != nil {
            return fmt.Errorf("error sending audio buffer: %v", err)
        }
        return nil
    }

    // Handle text messages
    create := ConversationItemCreate{
        Type: "conversation.item.create",
        Item: Item{
            Type: "text",
            Role: "user",
            Content: []Content{
                {
                    Type: "text",
                    Text: msg.Content,
                },
            },
        },
    }

    return conn.WriteJSON(create)
}

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

