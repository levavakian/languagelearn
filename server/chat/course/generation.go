package course

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"github.com/gorilla/mux"
	"time"
	"strings"
	"sort"
	"io"
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
	Usage ChatCompletionUsage `json:"usage"`
}

type ChatCompletionUsage struct {
	PromptTokens int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens int `json:"total_tokens"`
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type LessonPlanRequest struct {
	LessonIDs []string `json:"lesson_ids"`
	Prompt    string   `json:"prompt,omitempty"`
	CourseID  string   `json:"course_id"`
}

func generateLessonSummary(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	lessonID := vars["lessonId"]
	userEmail := r.Header.Get("X-User-Email")

	userCredits, err := GetUserCredits(userEmail)
	if err != nil {
		fmt.Printf("Error getting user credits: %v\n", err)
		http.Error(w, "Failed to get user credits", http.StatusInternalServerError)
		return
	}

	if userCredits <= 0 {
		http.Error(w, "Insufficient credits", http.StatusPaymentRequired)
		return
	}

	// Get the lesson
	lesson, err := getLessonFromDB(lessonID)
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

	// Add these lines to print raw response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Error reading response body: %v\n", err)
		http.Error(w, "Failed to read OpenAI response", http.StatusInternalServerError)
		return
	}
	fmt.Printf("OpenAI Response: %s\n", string(respBody))

	// Create a new reader with the response body
	resp.Body = io.NopCloser(bytes.NewBuffer(respBody))

	var completionResponse ChatCompletionResponse
	if err := json.NewDecoder(resp.Body).Decode(&completionResponse); err != nil {
		fmt.Printf("Error parsing OpenAI response: %v\n", err)
		http.Error(w, "Failed to parse OpenAI response", http.StatusInternalServerError)
		return
	}

	// Calculate and deduct credits
	creditCost := calculateCompletionCreditUsage(completionResponse.Usage)
	if err := DeductCredits(userEmail, creditCost); err != nil {
		fmt.Printf("Error deducting credits: %v\n", err)
		http.Error(w, "Failed to deduct credits", http.StatusInternalServerError)
		return
	}

	if len(completionResponse.Choices) == 0 {
		fmt.Println("Error: OpenAI returned no choices")
		http.Error(w, "No response from OpenAI", http.StatusInternalServerError)
		return
	}

	// Get the summary from the OpenAI response
	summary := completionResponse.Choices[0].Message.Content

	// Return just the summary as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"summary": summary,
	})
}

func generateVocabUpdates(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	lessonID := vars["lessonId"]
	userEmail := r.Header.Get("X-User-Email")

	userCredits, err := GetUserCredits(userEmail)
	if err != nil {
		fmt.Printf("Error getting user credits: %v\n", err)
		http.Error(w, "Failed to get user credits", http.StatusInternalServerError)
		return
	}

	if userCredits <= 0 {
		http.Error(w, "Insufficient credits", http.StatusPaymentRequired)
		return
	}

	// Get the lesson
	lesson, err := getLessonFromDB(lessonID)
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

	// Convert chat messages to ChatMessage format
	messages := []ChatMessage{
		{
			Role: "system",
			Content: `You are an AI language tutor responsible for maintaining a vocabulary and grammar reference list. 
					 Analyze the lesson content and identify important vocabulary words, grammar concepts, idioms, or 
					 language patterns that should be added to or updated in the reference list. Keep entries concise 
					 and information-dense. The word and definition should each be as few words as possible, preferably one or two max.
					 Each entry should be categorized by type (word, verb, tense, idiom, etc.).`,
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

	// Get current vocab list
	settings, err := getCourseSettingsFromDB(lesson.CourseID)
	if err != nil {
		settings = getDefaultSettings(lesson.CourseID)
	}

	// Add current vocab list
	vocabListMsg := "Current vocabulary list contents:\n"
	vocabListBytes, err := json.MarshalIndent(settings.VocabItems, "", "  ")
	if err != nil {
		fmt.Printf("Error marshaling vocab list: %v\n", err)
		http.Error(w, "Failed to marshal vocab list", http.StatusInternalServerError)
		return
	}
	messages = append(messages, ChatMessage{
		Role:    "user",
		Content: vocabListMsg + string(vocabListBytes),
	})

	// Add final instruction
	messages = append(messages, ChatMessage{
		Role: "user",
		Content: "Based on this lesson, provide updates or additions to the vocabulary list. Suggestions should be concise and information-dense. They do not have to be only vocab words and their definitions, they can be tenses, idioms, conjunctions, etc. Anything that would be helpful during language learning. Focus on things that seemed new or tough for the student, or things they seemed to be particularly curious or interested in." +
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
		http.Error(w, "Failed to prepare request", http.StatusInternalServerError)
		return
	}

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonBody))
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+os.Getenv("OPENAI_SECRET_KEY"))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error sending request to OpenAI: %v\n", err)
		http.Error(w, "Failed to send request to OpenAI", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Add these lines to print raw response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Error reading response body: %v\n", err)
		http.Error(w, "Failed to read OpenAI response", http.StatusInternalServerError)
		return
	}
	fmt.Printf("OpenAI Response: %s\n", string(respBody))

	// Create a new reader with the response body
	resp.Body = io.NopCloser(bytes.NewBuffer(respBody))

	var completionResponse ChatCompletionResponse
	if err := json.NewDecoder(resp.Body).Decode(&completionResponse); err != nil {
		fmt.Printf("Error parsing OpenAI response: %v\n", err)
		http.Error(w, "Failed to parse OpenAI response", http.StatusInternalServerError)
		return
	}

	// Calculate and deduct credits
	creditCost := calculateCompletionCreditUsage(completionResponse.Usage)
	if err := DeductCredits(userEmail, creditCost); err != nil {
		fmt.Printf("Error deducting credits: %v\n", err)
		http.Error(w, "Failed to deduct credits", http.StatusInternalServerError)
		return
	}

	if len(completionResponse.Choices) == 0 {
		fmt.Println("Error: OpenAI returned no choices")
		http.Error(w, "No response from OpenAI", http.StatusInternalServerError)
		return
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
		http.Error(w, "Failed to parse vocab updates", http.StatusInternalServerError)
		return
	}

	// Add success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vocabResponse)
}

func ptr(b bool) *bool {
	return &b
}

func generateNextLessonPlan(w http.ResponseWriter, r *http.Request) {
	var req LessonPlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get and validate all lessons first
	lessons := make([]Lesson, 0, len(req.LessonIDs))
	userEmail := r.Header.Get("X-User-Email")

	userCredits, err := GetUserCredits(userEmail)
	if err != nil {
		fmt.Printf("Error getting user credits: %v\n", err)
		http.Error(w, "Failed to get user credits", http.StatusInternalServerError)
		return
	}

	if userCredits <= 0 {
		http.Error(w, "Insufficient credits", http.StatusPaymentRequired)
		return
	}

	for _, lessonID := range req.LessonIDs {
		lesson, err := getLessonFromDB(lessonID)
		if err != nil {
			fmt.Printf("Error getting lesson %s: %v\n", lessonID, err)
			http.Error(w, "Error retrieving lessons", http.StatusInternalServerError)
			return
		}

		// Get associated chat to verify ownership
		chat, err := GetChatRaw(lesson.ChatID)
		if err != nil {
			fmt.Printf("Error getting chat for lesson %s: %v\n", lessonID, err)
			http.Error(w, "Error retrieving chat", http.StatusInternalServerError)
			return
		}

		if chat.CreatorID != userEmail {
			fmt.Printf("Unauthorized access to lesson %s by %s\n", lessonID, userEmail)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		lessons = append(lessons, *lesson)
	}

	// Sort lessons by order_index
	sort.Slice(lessons, func(i, j int) bool {
		return lessons[i].OrderIndex < lessons[j].OrderIndex
	})

	// Build prompt with sorted lessons
	var promptBuilder strings.Builder
	for i, lesson := range lessons {
		promptBuilder.WriteString(fmt.Sprintf("The lesson plan for lesson %d was:\n%s\n\n", i+1, lesson.LessonPlan))

		if lesson.Summary != "" {
			promptBuilder.WriteString(fmt.Sprintf("The summary of lesson %d was:\n%s\n\n", i+1, lesson.Summary))
		}
	}

	if req.Prompt != "" {
		promptBuilder.WriteString("The student has provided this as a description of what the lesson plan should include:\n")
		promptBuilder.WriteString(req.Prompt + "\n\n")
	}

	// Get user's vocab list from course settings
	settings, err := getCourseSettingsFromDB(req.CourseID)
	if err != nil {
		fmt.Printf("Error getting course settings: %v\n", err)
	} else if len(settings.VocabItems) > 0 {
		promptBuilder.WriteString(fmt.Sprintf("Here is the user's vocab list they have been working on, feel free to choose what items to revisit, practice, or expand upon. For reference, to compare the 'last used' field for the items, the current date is %s\n\n", time.Now().Format("2006-01-02")))
		
		// Format each vocab item with its details
		for _, item := range settings.VocabItems {
			promptBuilder.WriteString(fmt.Sprintf("- %s (%s): %s\n  Last used: %s, Usage count: %d\n  Notes: %s\n",
				item.Word,
				item.Type,
				item.Definition,
				item.LastUsed.Format("2006-01-02"),
				item.UsageCount,
				item.Notes))
		}
		promptBuilder.WriteString("\n")
	}

	promptBuilder.WriteString("Please create a lesson plan for their next lesson. The lesson plan should contain all the information needed to structure the lesson, as the assistant giving the lesson will not have access to previous chats, summaries, or lesson plans, only this lesson plan. The tutor will be an AI assistant, so only make lesson plans that can be done via a chat interface, or a back and forth voice chat.")

	// Prepare the request to OpenAI
	messages := []ChatMessage{
		{
			Role:    "system",
			Content: "You are an experienced language tutor creating a lesson plan based on previous lessons.",
		},
		{
			Role:    "user",
			Content: promptBuilder.String(),
		},
	}

	requestBody := ChatCompletionRequest{
		Model:    "gpt-4o",
		Messages: messages,
		ResponseFormat: &ResponseFormat{
			Type: "json_schema",
			JSONSchema: JSONSchema{
				Name: "lesson_plan_response",
				Schema: SchemaObject{
					Type: "object",
					Properties: map[string]SchemaObject{
						"plan":  {Type: "string"},
						"title": {Type: "string"},
					},
					Required:             []string{"title", "plan"},
					AdditionalProperties: ptr(false),
				},
				Strict: true,
			},
		},
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		fmt.Printf("Error marshaling request: %v\n", err)
		http.Error(w, "Failed to prepare request", http.StatusInternalServerError)
		return
	}

	// Change 'req' to 'httpReq' to avoid naming conflict
	httpReq, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonBody))
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer " + os.Getenv("OPENAI_SECRET_KEY"))

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		fmt.Printf("Error sending request to OpenAI: %v\n", err)
		http.Error(w, "Failed to send request to OpenAI", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Print the raw response for debugging
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Error reading response body: %v\n", err)
		http.Error(w, "Failed to read OpenAI response", http.StatusInternalServerError)
		return
	}
	fmt.Printf("OpenAI Response: %s\n", string(respBody))

	// Create a new reader with the response body for further processing
	resp.Body = io.NopCloser(bytes.NewBuffer(respBody))

	var completionResponse ChatCompletionResponse
	if err := json.NewDecoder(resp.Body).Decode(&completionResponse); err != nil {
		fmt.Printf("Error parsing OpenAI response: %v\n", err)
		http.Error(w, "Failed to parse OpenAI response", http.StatusInternalServerError)
		return
	}

	// Calculate and deduct credits
	creditCost := calculateCompletionCreditUsage(completionResponse.Usage)
	if err := DeductCredits(userEmail, creditCost); err != nil {
		fmt.Printf("Error deducting credits: %v\n", err)
		http.Error(w, "Failed to deduct credits", http.StatusInternalServerError)
		return
	}

	if len(completionResponse.Choices) == 0 {
		fmt.Println("Error: OpenAI returned no choices")
		http.Error(w, "No response from OpenAI", http.StatusInternalServerError)
		return
	}

	// Return the response
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(completionResponse.Choices[0].Message.Content))
}
