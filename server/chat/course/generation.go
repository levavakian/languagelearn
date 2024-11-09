package course

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"github.com/gorilla/mux"
	"time"
)

type ResponseFormat struct {
	Type       string     `json:"type"`
	JSONSchema JSONSchema `json:"json_schema"`
}

type JSONSchema struct {
	Name   string        `json:"name"`
	Schema SchemaObject  `json:"schema"`
	Strict bool         `json:"strict"`
}

type SchemaObject struct {
	Type                 string                  `json:"type"`
	Properties           map[string]SchemaObject `json:"properties,omitempty"`
	Items               *SchemaObject           `json:"items,omitempty"`
	Required            []string                `json:"required,omitempty"`
	AdditionalProperties *bool                  `json:"additionalProperties,omitempty"`
}

type ChatCompletionRequest struct {
	Model           string          `json:"model"`
	Messages        []ChatMessage   `json:"messages"`
	ResponseFormat  *ResponseFormat `json:"response_format,omitempty"`
}

type ChatCompletionResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Choices []struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func generateLessonSummary(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	lessonID := vars["lessonId"]
	userEmail := r.Header.Get("X-User-Email")

	// Get the lesson
	lesson, err := getLessonFromDBRaw(lessonID)
	if err != nil {
		fmt.Printf("Error getting lesson: %v\n", err)
		http.Error(w, "Lesson not found", http.StatusNotFound)
		return
	}

	// Get the chat history
	chat, err := GetChat(lesson.ChatID, userEmail)
	if err != nil {
		fmt.Printf("Error getting chat: %v\n", err)
		http.Error(w, "Chat not found", http.StatusNotFound)
		return
	}

	// Prepare the messages for OpenAI
	messages := []ChatMessage{
		{
			Role: "system",
			Content: "You are a professional language tutor writing a summary for another tutor who will be taking over this student. Your task is to analyze the chat and provide a concise but informative summary focusing on: 1) What topics were covered, 2) What the student did well on, 3) What the student struggled with, and 4) Recommendations for what to cover in the next lesson. Remember, the next tutor will only see this summary and the lesson plan, not the full chat history.",
		},
		{
			Role:    "assistant",
			Content: fmt.Sprintf("The lesson plan for today is: %s", lesson.LessonPlan),
		},
	}

	// Add chat history
	for _, msg := range chat.Messages {
		role := "user"
		if msg.Sender != "user" {
			role = "assistant"
		}
		messages = append(messages, ChatMessage{
			Role:    role,
			Content: msg.Content,
		})
	}

	// Add final request for summary
	messages = append(messages, ChatMessage{
		Role: "user",
		Content: "Please provide a summary for this chat. Focus on what topics were covered, what the student did well on, what they struggled with, and what would be helpful to cover in the next lesson. Make it concise but informative for the next tutor.",
	})

	// Prepare the request to OpenAI
	requestBody := ChatCompletionRequest{
		Model:    "gpt-4o",
		Messages: messages,
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		fmt.Printf("Error marshaling request: %v\n", err)
		http.Error(w, "Failed to prepare request", http.StatusInternalServerError)
		return
	}

	// Send request to OpenAI
	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonBody))
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer " + os.Getenv("OPENAI_SECRET_KEY"))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error sending request to OpenAI: %v\n", err)
		http.Error(w, "Failed to send request to OpenAI", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var completionResponse ChatCompletionResponse
	if err := json.NewDecoder(resp.Body).Decode(&completionResponse); err != nil {
		fmt.Printf("Error parsing OpenAI response: %v\n", err)
		http.Error(w, "Failed to parse OpenAI response", http.StatusInternalServerError)
		return
	}

	if len(completionResponse.Choices) == 0 {
		fmt.Println("Error: OpenAI returned no choices")
		http.Error(w, "No response from OpenAI", http.StatusInternalServerError)
		return
	}

	// Update the lesson summary in the database
	summary := completionResponse.Choices[0].Message.Content
	lesson.Summary = summary
	if err := updateLessonInDB(*lesson); err != nil {
		fmt.Printf("Error updating lesson in DB: %v\n", err)
		http.Error(w, "Failed to update lesson summary", http.StatusInternalServerError)
		return
	}

	// Generate vocab updates
	// Remove first and last messages before passing to vocab generation
	if len(messages) >= 2 {
		messages = messages[1 : len(messages)-1]
	}
	if err := generateVocabUpdates(lesson.CourseID, messages); err != nil {
		fmt.Printf("Error generating vocab updates: %v\n", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lesson)
}

func generateVocabUpdates(courseID string, chatMessages []ChatMessage) error {
	// Get current vocab list
	settings, err := getCourseSettingsFromDB(courseID)
	if err != nil {
		settings = getDefaultSettings(courseID)
	}

	// Prepare messages for OpenAI
	messages := []ChatMessage{
		{
			Role: "system",
			Content: `You are an AI language tutor responsible for maintaining a vocabulary and grammar reference list. 
					 Analyze the lesson content and identify important vocabulary words, grammar concepts, idioms, or 
					 language patterns that should be added to or updated in the reference list. Keep entries concise 
					 and information-dense. Each entry should be categorized by type (word, verb, tense, idiom, etc.).`,
		},
	}

	// Add chat history
	messages = append(messages, chatMessages...)

	// Add current vocab list
	vocabListMsg := "Current vocabulary list contents:\n"
	vocabListBytes, err := json.MarshalIndent(settings.VocabItems, "", "  ")
	if err != nil {
		return fmt.Errorf("error marshaling vocab list: %v", err)
	}
	messages = append(messages, ChatMessage{
		Role:    "user",
		Content: vocabListMsg + string(vocabListBytes),
	})

	// Add final instruction
	messages = append(messages, ChatMessage{
		Role: "user",
		Content: "Based on this lesson, provide updates or additions to the vocabulary list. Suggestions should be concise and information-dense. They do not have to be only vocab words and their definitions, they can be tenses, idioms, conjunctions, etc. Anything that would be helpful during language learning." +
			"Return the response in the specified JSON format.",
	})

	// Prepare the request to OpenAI
	requestBody := ChatCompletionRequest{
		Model:    "gpt-4o",
		Messages: messages,
		ResponseFormat: &ResponseFormat{
			Type: "json_schema",
			JSONSchema: JSONSchema{
				Name: "vocab_response",
				Schema: SchemaObject{
					Type: "object",
					Properties: map[string]SchemaObject{
						"vocab_updates": {
							Type: "array",
							Items: &SchemaObject{
								Type: "object",
								Properties: map[string]SchemaObject{
									"word":       {Type: "string"},
									"type":       {Type: "string"},
									"definition": {Type: "string"},
									"notes":      {Type: "string"},
								},
								Required: []string{"word", "type", "definition", "notes"},
								AdditionalProperties: ptr(false),
							},
						},
					},
					Required: []string{"vocab_updates"},
					AdditionalProperties: ptr(false),
				},
				Strict: true,
			},
		},
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		fmt.Printf("Error marshaling request: %v\n", err)
		return fmt.Errorf("error marshaling request: %v", err)
	}

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonBody))
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		return fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+os.Getenv("OPENAI_SECRET_KEY"))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error sending request to OpenAI: %v\n", err)
		return fmt.Errorf("error sending request to OpenAI: %v", err)
	}
	defer resp.Body.Close()

	// Parse the response
	var completionResponse ChatCompletionResponse
	if err := json.NewDecoder(resp.Body).Decode(&completionResponse); err != nil {
		fmt.Printf("Error parsing OpenAI response: %v\n", err)
		return fmt.Errorf("error parsing OpenAI response: %v", err)
	}

	if len(completionResponse.Choices) == 0 {
		fmt.Println("Error: OpenAI returned no choices")
		return fmt.Errorf("OpenAI returned no choices")
	}

	var vocabResponse struct {
		VocabUpdates []struct {
			Word       string `json:"word"`
			Type       string `json:"type"`
			Definition string `json:"definition"`
			Notes      string `json:"notes,omitempty"`
		} `json:"vocab_updates"`
	}

	if err := json.Unmarshal([]byte(completionResponse.Choices[0].Message.Content), &vocabResponse); err != nil {
		fmt.Printf("Error parsing vocab updates: %v\n", err)
		return fmt.Errorf("error parsing vocab updates: %v", err)
	}

	// Update vocab items in settings
	for _, update := range vocabResponse.VocabUpdates {
		key := update.Word
		settings.VocabItems[key] = VocabItem{
			Type:       update.Type,
			Word:       update.Word,
			Definition: update.Definition,
			Notes:      update.Notes,
			LastUsed:   time.Now(),
			UsageCount: settings.VocabItems[key].UsageCount + 1,
		}
	}

	// Save updated settings
	return saveCourseSettingsToDB(*settings)
}

func ptr(b bool) *bool {
	return &b
}
