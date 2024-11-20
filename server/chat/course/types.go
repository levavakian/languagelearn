package course

import (
	"time"
)

type Course struct {
	ID          string    `json:"id"`
	CreatorID   string    `json:"creator_id"`
	Name        string    `json:"name"`
	CreatedAt   time.Time `json:"created_at"`
}

type LessonPlan struct {
	ID        string    `json:"id"`
	CourseID  string    `json:"course_id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

type Lesson struct {
	ID          string    `json:"id"`
	CourseID    string    `json:"course_id"`
	ChatID      string    `json:"chat_id"`
	LessonPlan  string    `json:"lesson_plan"`
	FreePractice bool     `json:"free_practice"`
	Name        string    `json:"name"`
	Summary     string    `json:"summary"`
	OrderIndex  int       `json:"order_index"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type VocabItem struct {
	Type        string    `json:"type"`
	Word        string    `json:"word"`
	Definition  string    `json:"definition"`
	Notes       string    `json:"notes,omitempty"`
	LastUsed    time.Time `json:"last_used"`
	UsageCount  int       `json:"usage_count"`
}

type CreateDefaultCourseRequest struct {
	TargetLanguage string `json:"target_language"`
	Name          string `json:"name"`
}

type CourseNoteNode struct {
	ID         string           `json:"id"`
	Name       string           `json:"name"`
	Type       string           `json:"type"`
	Children   []CourseNoteNode `json:"children,omitempty"`
	IsExpanded bool            `json:"isExpanded,omitempty"`
}

type Chat struct {
	ID        string    `json:"id"`
	CreatorID string    `json:"creator_id"`
	Name      string    `json:"name"`
	LessonID  string    `json:"lesson_id,omitempty"`
	Messages  []Message `json:"messages"`
	CreatedAt time.Time `json:"created_at"`
}

type Message struct {
	ID                  string    `json:"id"`
	ChatID              string    `json:"chat_id"`
	Sender              string    `json:"sender"`
	Content             string    `json:"content"`
	Type                string    `json:"type,omitempty"` // "text" or "audio"
	PreferredResponseType string    `json:"preferredResponseType,omitempty"`
	ResponseID          string    `json:"responseId,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
}

type Settings struct {
	ID                 string                `json:"id"`
	Notes              []NoteNode           `json:"notes"`
	CustomInstructions string               `json:"customInstructions,omitempty"`
	VocabItems         map[string]VocabItem `json:"vocabItems"`
}

type NoteNode struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	Type       string     `json:"type"`
	Children   []NoteNode `json:"children,omitempty"`
	IsExpanded bool       `json:"is_expanded,omitempty"`
}

type SettingsUpdate struct {
	ChatID       string   `json:"id"`
	Settings Settings `json:"settings"`
}

// UserCredits represents the user's credits
type UserCredits struct {
	UserEmail string `json:"user_email"`
	Credits   int    `json:"credits"`
}
