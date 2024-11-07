package chat

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/levavakian/languagelearn/server/auth"
	"github.com/levavakian/languagelearn/server/db"
)

type NoteNode struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	Type      string     `json:"type"`
	Children  []NoteNode `json:"children,omitempty"`
	IsExpanded bool      `json:"isExpanded,omitempty"`
}

type ChatSettings struct {
	ChatID            string     `json:"chatId"`
	Notes             []NoteNode `json:"notes"`
	CustomInstructions string     `json:"customInstructions,omitempty"`
}

func getDefaultSettings(chatID string) *ChatSettings {
	return &ChatSettings{
		ChatID: chatID,
		Notes: []NoteNode{
			{
				ID:         "welcome-folder",
				Name:       "Getting Started",
				Type:       "folder",
				IsExpanded: true,
				Children: []NoteNode{
					{
						ID:   "welcome-note",
						Name: "Welcome! Create notes and folders to organize your language learning materials. Click the edit button (🔤) to modify content, or use the folder (📁) and plus (➕) buttons to add new items. Use @word to insert a clicked word and @sentence to insert a clicked message.",
						Type: "note",
					},
				},
			},
			{
				ID:         "common-phrases",
				Name:       "Common Phrases",
				Type:       "folder",
				IsExpanded: true,
				Children: []NoteNode{
					{
						ID:   "translate",
						Name: "Could you translate '@sentence' to English?",
						Type: "note",
					},
					{
						ID:   "explain",
						Name: "Could you explain what '@sentence' means?",
						Type: "note",
					},
					{
						ID:   "correction",
						Name: "Is '@sentence' grammatically correct?",
						Type: "note",
					},
				},
			},
			{
				ID:         "grammar-practice",
				Name:       "Grammar Practice",
				Type:       "folder",
				IsExpanded: true,
				Children: []NoteNode{
					{
						ID:   "past-tense",
						Name: "Could you say '@sentence' in the past tense?",
						Type: "note",
					},
					{
						ID:   "future-tense",
						Name: "How would I say '@sentence' in the future tense?",
						Type: "note",
					},
					{
						ID:   "formal",
						Name: "How would I say '@sentence' more formally?",
						Type: "note",
					},
					{
						ID:   "informal",
						Name: "How would I say '@sentence' casually/informally?",
						Type: "note",
					},
				},
			},
			{
				ID:         "vocabulary",
				Name:       "Vocabulary Help",
				Type:       "folder",
				IsExpanded: true,
				Children: []NoteNode{
					{
						ID:   "synonyms",
						Name: "What are some synonyms for the word '@word'?",
						Type: "note",
					},
					{
						ID:   "examples",
						Name: "Can you give me some example sentences using the word '@word'?",
						Type: "note",
					},
					{
						ID:   "difference",
						Name: "What's the difference between '@word' and similar words?",
						Type: "note",
					},
				},
			},
		},
		CustomInstructions: "You are a helpful, witty, and friendly AI designateed to act as a language tutor. Act like a human, but remember that you aren't a human and that you can't do human things in the real world. Your voice and personality should be warm and engaging, with a lively and playful tone. If interacting in a non-English language, start by using the standard accent or dialect familiar to the user. Talk simply and slowly when speaking the language the user is trying to learn. If the user makes grammar or vocab mistakes, correct them and explain their mistakes unless otherwise told to not do so. When correcting the user, speak in their native language, but otherwise speak in the language the user is trying to learn.",
	}
}

func SetupSettingsRoutes(r *mux.Router) {
	r.HandleFunc("/chat/{id}/settings", auth.AuthMiddleware(getChatSettings)).Methods("GET")
	r.HandleFunc("/chat/{id}/settings", auth.AuthMiddleware(updateChatSettings)).Methods("POST")
}

func getChatSettings(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	chatID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	// Verify chat ownership
	creatorID, err := getChatCreator(chatID)
	if err != nil {
		http.Error(w, "Chat not found", http.StatusNotFound)
		return
	}

	if creatorID != userEmail {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	settings, err := getChatSettingsFromDB(chatID)
	if err != nil {
		// Return default settings if none exist
		settings = getDefaultSettings(chatID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

func updateChatSettings(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	chatID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	// Verify chat ownership
	creatorID, err := getChatCreator(chatID)
	if err != nil {
		http.Error(w, "Chat not found", http.StatusNotFound)
		return
	}

	if creatorID != userEmail {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	var settings ChatSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	settings.ChatID = chatID // Ensure chatID matches URL param
	if err := saveChatSettingsToDB(settings); err != nil {
		fmt.Printf("Error saving chat settings: %v\n", err)
		http.Error(w, fmt.Sprintf("Failed to save settings: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func getChatSettingsFromDB(chatID string) (*ChatSettings, error) {
	var settingsJSON string
	err := db.DB.QueryRow(
		"SELECT settings FROM chat_settings WHERE chat_id = ?",
		chatID,
	).Scan(&settingsJSON)

	if err != nil {
		return nil, err
	}

	var settings ChatSettings
	if err := json.Unmarshal([]byte(settingsJSON), &settings); err != nil {
		return nil, fmt.Errorf("error parsing settings JSON: %v", err)
	}

	return &settings, nil
}

func saveChatSettingsToDB(settings ChatSettings) error {
	settingsJSON, err := json.Marshal(settings)
	if err != nil {
		return fmt.Errorf("error marshaling settings: %v", err)
	}

	result, err := db.DB.Exec(
		`REPLACE INTO chat_settings (chat_id, settings) VALUES (?, ?)`,
		settings.ChatID, string(settingsJSON),
	)
	if err != nil {
		return fmt.Errorf("database error while saving settings: %v", err)
	}

	// Verify the operation affected a row
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error checking affected rows: %v", err)
	}
	if rows == 0 {
		return fmt.Errorf("no rows were affected when saving settings")
	}

	return nil
}
