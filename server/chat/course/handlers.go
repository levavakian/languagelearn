package course

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/google/uuid"

	"github.com/levavakian/languagelearn/server/db"
)

type CreateLessonRequest struct {
	Title             string `json:"title"`
	LessonPlanContent string `json:"lesson_plan_content"`
	FreePractice      bool   `json:"free_practice"`
}

type CustomInstructionsRequest struct {
	CustomInstructions string `json:"customInstructions"`
}

type CourseDetails struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	CreatedAt   time.Time    `json:"created_at"`
	LessonPlans []LessonPlan `json:"lesson_plans"`
	Lessons     []Lesson     `json:"lessons"`
}

// Database helper functions
func getCourseCreator(courseID string) (string, error) {
	var creatorID string
	err := db.DB.QueryRow(
		"SELECT creator_id FROM courses WHERE id = $1",
		courseID,
	).Scan(&creatorID)
	return creatorID, err
}

func verifyOwnership(courseID string, userEmail string) error {
	creatorID, err := getCourseCreator(courseID)
	if err != nil {
		return fmt.Errorf("course not found")
	}
	if creatorID != userEmail {
		return fmt.Errorf("unauthorized")
	}
	return nil
}

// Course handlers
func createCourse(w http.ResponseWriter, r *http.Request) {
	creatorEmail := r.Header.Get("X-User-Email")

	var course Course
	if err := json.NewDecoder(r.Body).Decode(&course); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	course.ID = uuid.New().String()
	course.CreatorID = creatorEmail
	course.CreatedAt = time.Now()

	if err := insertCourse(course); err != nil {
		http.Error(w, "Failed to create course", http.StatusInternalServerError)
		return
	}

	// Create and save default settings
	settings := getDefaultSettings(course.ID)
	if err := saveCourseSettingsToDB(*settings); err != nil {
		// If settings creation fails, clean up the course
		deleteCourseFromDB(course.ID)
		http.Error(w, "Failed to create course settings", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(course)
}

func getUserCourses(w http.ResponseWriter, r *http.Request) {
	userEmail := r.Header.Get("X-User-Email")

	courses, err := getUserCoursesFromDB(userEmail)
	if err != nil {
		http.Error(w, "Failed to fetch courses", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(courses)
}

func getCourse(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	course, err := getCourseFromDB(courseID)
	if err != nil {
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(course)
}

func updateCourse(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	var course Course
	if err := json.NewDecoder(r.Body).Decode(&course); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	course.ID = courseID // Ensure ID matches URL param
	course.CreatorID = userEmail // Ensure creator can't be changed

	if err := updateCourseInDB(course); err != nil {
		http.Error(w, "Failed to update course", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(course)
}

func deleteCourse(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	if err := deleteCourseFromDB(courseID); err != nil {
		http.Error(w, "Failed to delete course", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Lesson plan handlers
func createLessonPlan(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	var lessonPlan LessonPlan
	if err := json.NewDecoder(r.Body).Decode(&lessonPlan); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	lessonPlan.ID = uuid.New().String()
	lessonPlan.CourseID = courseID
	lessonPlan.CreatedAt = time.Now()

	if err := insertLessonPlan(lessonPlan); err != nil {
		http.Error(w, "Failed to create lesson plan", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lessonPlan)
}

func getCourseLessonPlans(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	lessonPlans, err := getCourseLessonPlansFromDB(courseID)
	if err != nil {
		http.Error(w, "Failed to fetch lesson plans", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lessonPlans)
}

func updateLessonPlan(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	planID := vars["planId"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	var lessonPlan LessonPlan
	if err := json.NewDecoder(r.Body).Decode(&lessonPlan); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	lessonPlan.ID = planID
	lessonPlan.CourseID = courseID

	if err := updateLessonPlanInDB(lessonPlan); err != nil {
		http.Error(w, "Failed to update lesson plan", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lessonPlan)
}

func deleteLessonPlan(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	planID := vars["planId"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	if err := deleteLessonPlanFromDB(planID); err != nil {
		http.Error(w, "Failed to delete lesson plan", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Lesson handlers
func createLesson(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	var request CreateLessonRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get the next order index
	orderIndex, err := getNextLessonOrderIndex(courseID, request.FreePractice)
	if err != nil {
		http.Error(w, "Failed to get order index", http.StatusInternalServerError)
		return
	}

	// Create the lesson ID first
	lessonID := uuid.New().String()
	
	// Create chat with meaningful name and lesson ID
	chatID := uuid.New().String()
	chatName := request.Title
	baseChatName := "Lesson #%d"
	if request.FreePractice {
		baseChatName = "Practice #%d"
	}
	if chatName == "" {
		chatName = fmt.Sprintf(baseChatName, orderIndex+1)
	} else {
		chatName = fmt.Sprintf(baseChatName + ": %s", orderIndex+1, chatName)
	}
	
	chat := &Chat{
		ID:        chatID,
		CreatorID: userEmail,
		Name:      chatName,
		LessonID:  lessonID,  // Set the lesson ID here
		CreatedAt: time.Now(),
	}
	if err := InsertChat(chat); err != nil {
		http.Error(w, "Failed to create chat", http.StatusInternalServerError)
		return
	}

	// Get course settings to copy to chat
	courseSettings, err := getCourseSettingsFromDB(courseID)
	if err != nil {
		courseSettings = getDefaultSettings(courseID)
	}

	// Create chat settings by copying course settings
	chatSettings := *courseSettings
	chatSettings.ID = chatID
	if err := saveChatSettingsToDB(chatSettings); err != nil {
		// Clean up the created chat if we fail
		DeleteChat(chatID)
		http.Error(w, "Failed to create chat settings", http.StatusInternalServerError)
		return
	}

	// Create the lesson
	lesson := Lesson{
		ID:         lessonID,  // Use the pre-generated lesson ID
		CourseID:   courseID,
		ChatID:     chatID,
		Name:       chatName,
		LessonPlan: request.LessonPlanContent,
		FreePractice: request.FreePractice,
		OrderIndex: orderIndex,
		CreatedAt:  time.Now(),
	}

	if err := insertLesson(lesson); err != nil {
		// Clean up the created chat if we fail
		DeleteChat(chatID)
		fmt.Printf("Failed to create lesson: %v\n", err)
		http.Error(w, "Failed to create lesson", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lesson)
}

func getCourseLessons(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		fmt.Printf("Error verifying ownership: %v\n", err)
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	lessons, err := getCourseLessonsFromDB(courseID)
	if err != nil {
		fmt.Printf("Error fetching lessons: %v\n", err)
		http.Error(w, "Failed to fetch lessons", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(lessons); err != nil {
		fmt.Printf("Error encoding lessons to JSON: %v\n", err)
		http.Error(w, "Failed to encode lessons", http.StatusInternalServerError)
	}
}

func updateLesson(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	lessonID := vars["lessonId"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	var lesson Lesson
	if err := json.NewDecoder(r.Body).Decode(&lesson); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	lesson.ID = lessonID
	lesson.CourseID = courseID

	if err := updateLessonInDB(lesson); err != nil {
		http.Error(w, "Failed to update lesson", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lesson)
}

func deleteLesson(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	lessonID := vars["lessonId"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	// Get the lesson to find its chat ID
	lesson, err := getLessonFromDB(lessonID)
	if err != nil || lesson.CourseID != courseID {
		http.Error(w, "Lesson not found", http.StatusNotFound)
		return
	}

	// Delete the lesson
	if err := deleteLessonFromDB(lessonID); err != nil {
		http.Error(w, "Failed to delete lesson", http.StatusInternalServerError)
		return
	}

	// Delete the associated chat
	if err := DeleteChat(lesson.ChatID); err != nil {
		// Note: We don't rollback the lesson deletion here since the chat might have already been deleted
		fmt.Printf("Warning: Failed to delete chat %s: %v\n", lesson.ChatID, err)
	}

	w.WriteHeader(http.StatusNoContent)
}

// Vocab list handlers
func getVocabList(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	settings, err := getCourseSettingsFromDB(courseID)
	if err != nil {
		// Return empty vocab list if no settings exist
		settings = getDefaultSettings(courseID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings.VocabItems)
}

func updateVocabList(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	settings, err := getCourseSettingsFromDB(courseID)
	if err != nil {
		settings = getDefaultSettings(courseID)
	}

	var vocabItems map[string]VocabItem
	if err := json.NewDecoder(r.Body).Decode(&vocabItems); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	settings.VocabItems = vocabItems

	if err := saveCourseSettingsToDB(*settings); err != nil {
		http.Error(w, "Failed to update vocab list", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vocabItems)
}

// Default course handlers
func createDefaultCourse(w http.ResponseWriter, r *http.Request) {
	creatorEmail := r.Header.Get("X-User-Email")

	var req CreateDefaultCourseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Create course with the provided name
	courseID := uuid.New().String()
	course := Course{
		ID:        courseID,
		CreatorID: creatorEmail,
		Name:      req.Name,
		CreatedAt: time.Now(),
	}

	if err := insertCourse(course); err != nil {
		http.Error(w, "Failed to create course", http.StatusInternalServerError)
		return
	}

	// Create and save default settings
	settings := getDefaultSettings(courseID)
	settings.CustomInstructions += fmt.Sprintf(" The user is trying to learn %s", req.TargetLanguage)
	
	if err := saveCourseSettingsToDB(*settings); err != nil {
		http.Error(w, "Failed to save course settings", http.StatusInternalServerError)
		return
	}

	// Create initial lesson plan
	lessonPlanID := uuid.New().String()
	initialPlan := LessonPlan{
		ID:        lessonPlanID,
		CourseID:  courseID,
		Title:     fmt.Sprintf("Initial %s Assessment", req.TargetLanguage),
		Content:   fmt.Sprintf("Initial assessment for %s language learning. Have a conversation with the student to gauge their current level of %s. Start with basic greetings and gradually increase complexity based on their responses.", req.TargetLanguage, req.TargetLanguage),
		CreatedAt: time.Now(),
	}

	if err := insertLessonPlan(initialPlan); err != nil {
		http.Error(w, "Failed to create lesson plan", http.StatusInternalServerError)
		return
	}

	// Create lesson ID first
	lessonID := uuid.New().String()
	chatID := uuid.New().String()
	
	// Create chat with lesson ID
	chat := &Chat{
		ID:        chatID,
		CreatorID: creatorEmail,
		Name:      fmt.Sprintf("Initial %s Assessment", req.TargetLanguage),
		LessonID:  lessonID,  // Set the lesson ID here
		CreatedAt: time.Now(),
	}
	if err := InsertChat(chat); err != nil {
		http.Error(w, "Failed to create chat", http.StatusInternalServerError)
		return
	}

	// Create chat settings by copying course settings
	chatSettings := *settings
	chatSettings.ID = chatID
	if err := saveChatSettingsToDB(chatSettings); err != nil {
		// Clean up the created chat if we fail
		DeleteChat(chatID)
		http.Error(w, "Failed to create chat settings", http.StatusInternalServerError)
		return
	}

	// Create initial lesson with the same lesson ID
	lesson := Lesson{
		ID:         lessonID,  // Use the pre-generated lesson ID
		CourseID:   courseID,
		ChatID:     chatID,
		Name:      fmt.Sprintf("Initial %s Assessment", req.TargetLanguage),
		LessonPlan: initialPlan.Content,
		OrderIndex: 0,
		CreatedAt:  time.Now(),
	}

	if err := insertLesson(lesson); err != nil {
		http.Error(w, "Failed to create lesson", http.StatusInternalServerError)
		return
	}

	// Return the created course with its initial lesson plan and lesson
	response := struct {
		Course     Course     `json:"course"`
		LessonPlan LessonPlan `json:"lesson_plan"`
		Lesson     Lesson     `json:"lesson"`
	}{
		Course:     course,
		LessonPlan: initialPlan,
		Lesson:     lesson,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Course settings handlers
func getCourseSettings(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	settings, err := getCourseSettingsFromDB(courseID)
	if err != nil {
		// Return default settings if none exist
		settings = getDefaultSettings(courseID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

func updateCourseSettings(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	var newSettings Settings
	if err := json.NewDecoder(r.Body).Decode(&newSettings); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	newSettings.ID = courseID // Ensure courseID matches URL param

	if err := saveCourseSettingsToDB(newSettings); err != nil {
		fmt.Printf("Error saving course settings: %v\n", err)
		http.Error(w, fmt.Sprintf("Failed to save settings: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func getDefaultSettings(ID string) *Settings {
	return &Settings{
		ID: ID,
		Notes: []NoteNode{
			{
				ID:         "welcome-folder",
				Name:       "Getting Started",
				Type:       "folder",
				Children: []NoteNode{
					{
						ID:   "welcome-note",
						Name: "Welcome! Create notes and folders to organize your language learning materials. Click the edit button (✎) to modify content, or use the folder (📁) and plus (➕) buttons to add new items. Use @word to insert a clicked word and @sentence to insert a clicked message.",
						Type: "note",
					},
				},
			},
			{
				ID:         "common-phrases",
				Name:       "Common Phrases",
				Type:       "folder",
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
		CustomInstructions: "You are a helpful, witty, and friendly AI designated to act as a language tutor. Act like a human, but remember that you aren't a human and that you can't do human things in the real world. Your voice and personality should be warm and engaging, with a lively and playful tone. If interacting in a non-English language, start by using the standard accent or dialect familiar to the user. Talk simply and slowly when speaking the language the user is trying to learn. If the user makes grammar or vocab mistakes, correct them and explain their mistakes unless otherwise told to not do so. When correcting the user, speak in their native language, but otherwise speak in the language the user is trying to learn.",
		VocabItems: make(map[string]VocabItem),
	}
}

func getLessonPlan(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	planID := vars["planId"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	plan, err := getLessonPlanFromDB(planID, courseID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Lesson plan not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to fetch lesson plan", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(plan)
}

// Chat handlers
func createChat(w http.ResponseWriter, r *http.Request) {
	creatorEmail := r.Header.Get("X-User-Email")

	var chat Chat
	if err := json.NewDecoder(r.Body).Decode(&chat); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	chat.ID = uuid.New().String()
	chat.CreatorID = creatorEmail
	chat.CreatedAt = time.Now()

	if err := InsertChat(&chat); err != nil {
		http.Error(w, "Failed to create chat", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chat)
}

func getUserChats(w http.ResponseWriter, r *http.Request) {
	userEmail := r.Header.Get("X-User-Email")

	chats, err := GetUserChats(userEmail)
	if err != nil {
		fmt.Printf("Error fetching chats: %v\n", err)
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

	// Verify ownership with a simpler query
	var creatorID string
	err := db.DB.QueryRow(`
		SELECT creator_id 
		FROM chats 
		WHERE id = $1`,
		chatID,
	).Scan(&creatorID)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Chat not found", http.StatusNotFound)
		} else {
			http.Error(w, "Failed to verify chat ownership", http.StatusInternalServerError)
		}
		return
	}

	if creatorID != userEmail {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	if err := DeleteChat(chatID); err != nil {
		http.Error(w, "Failed to delete chat", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
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
		var chatName string
		err := db.DB.QueryRow(
			"SELECT name FROM chats WHERE id = $1 AND creator_id = $2",
			chatID, userEmail,
		).Scan(&chatName)
		
		if err == nil {
			chatNames[chatID] = chatName
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chatNames)
}

func getChatSettings(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	chatID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	// Verify access
	_, err := GetChat(chatID, userEmail)
	if err != nil {
		http.Error(w, "Chat not found", http.StatusNotFound)
		return
	}

	settings, err := getChatSettingsFromDB(chatID)
	if err != nil {
		settings = getDefaultSettings(chatID) // Return default settings if none exist
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

func updateChatSettings(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	chatID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	// Verify access
	_, err := GetChat(chatID, userEmail)
	if err != nil {
		http.Error(w, "Chat not found", http.StatusNotFound)
		return
	}

	var settings Settings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	settings.ID = chatID // Ensure chat ID matches URL param
	if err := saveChatSettingsToDB(settings); err != nil {
		http.Error(w, "Failed to update settings", http.StatusInternalServerError)
		return
	}

	// Notify active connections about settings update
	chatsMutex.RLock()
	if chatConns := activeChats[chatID]; chatConns != nil {
		select {
		case chatConns.SettingsUpdate <- SettingsUpdate{ChatID: chatID, Settings: settings}:
		default:
			// Channel is full, skip update
		}
	}
	chatsMutex.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

// Add this new handler
func getStandaloneUserChats(w http.ResponseWriter, r *http.Request) {
	userEmail := r.Header.Get("X-User-Email")

	chats, err := getStandaloneChats(userEmail)
	if err != nil {
		fmt.Printf("Error fetching standalone chats: %v\n", err)
		http.Error(w, "Failed to fetch chats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chats)
}

// Add this new type for the response
type LessonNameResponse struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

func getCourseLessonNames(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	if err := verifyOwnership(courseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	// Query to get lesson IDs and chat names in one go
	rows, err := db.DB.Query(`
		SELECT l.id, c.name 
		FROM lessons l 
		JOIN chats c ON l.chat_id = c.id 
		WHERE l.course_id = $1 
		ORDER BY l.order_index`,
		courseID,
	)
	if err != nil {
		http.Error(w, "Failed to fetch lesson names", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var lessons []LessonNameResponse
	for rows.Next() {
		var lesson LessonNameResponse
		if err := rows.Scan(&lesson.ID, &lesson.Title); err != nil {
			http.Error(w, "Failed to scan lesson data", http.StatusInternalServerError)
			return
		}
		lessons = append(lessons, lesson)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lessons)
}

func getChatByLesson(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	lessonID := vars["lessonId"]
	userEmail := r.Header.Get("X-User-Email")

	// First get the lesson to verify ownership
	lesson, err := getLessonFromDB(lessonID)
	if err != nil {
		http.Error(w, "Lesson not found", http.StatusNotFound)
		return
	}

	// Verify course ownership
	if err := verifyOwnership(lesson.CourseID, userEmail); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	// Get the chat
	chat, err := GetChatRaw(lesson.ChatID)
	if err != nil {
		http.Error(w, "Chat not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chat)
}

func updateCustomInstructions(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	// Verify course ownership
	exists, isOwner, err := CheckCourseOwnership(courseID, userEmail)
	if err != nil {
		fmt.Printf("Error checking course ownership: %v\n", err)
		http.Error(w, "Failed to verify course ownership", http.StatusInternalServerError)
		return
	}
	if !exists {
		fmt.Printf("Course not found: %s\n", courseID)
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}
	if !isOwner {
		fmt.Printf("Unauthorized access attempt by %s for course %s\n", userEmail, courseID)
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	// Parse request body
	var req CustomInstructionsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fmt.Printf("Error decoding request body: %v\n", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Update the custom instructions
	if err := updateCourseCustomInstructions(courseID, req.CustomInstructions); err != nil {
		fmt.Printf("Error updating custom instructions: %v\n", err)
		http.Error(w, "Failed to update custom instructions", http.StatusInternalServerError)
		return
	}

	// Get the updated settings to return
	settings, err := getCourseSettingsFromDB(courseID)
	if err != nil {
		fmt.Printf("Error fetching updated settings: %v\n", err)
		http.Error(w, "Failed to reload custom instructions", http.StatusInternalServerError)
		return
	}

	// Return the updated settings
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

func updateNoteNodes(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	// Verify course ownership
	exists, isOwner, err := CheckCourseOwnership(courseID, userEmail)
	if err != nil {
		fmt.Printf("Error checking course ownership: %v\n", err)
		http.Error(w, "Failed to verify course ownership", http.StatusInternalServerError)
		return
	}
	if !exists {
		fmt.Printf("Course not found: %s\n", courseID)
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}
	if !isOwner {
		fmt.Printf("Unauthorized access attempt by %s for course %s\n", userEmail, courseID)
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	// Parse request body
	var req struct {
		Notes []NoteNode `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fmt.Printf("Error decoding request body: %v\n", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Update the note nodes
	if err := updateCourseNoteNodes(courseID, req.Notes); err != nil {
		fmt.Printf("Error updating note nodes: %v\n", err)
		http.Error(w, "Failed to update note nodes", http.StatusInternalServerError)
		return
	}

	// Get the updated settings to return
	settings, err := getCourseSettingsFromDB(courseID)
	if err != nil {
		fmt.Printf("Error fetching updated settings: %v\n", err)
		http.Error(w, "Failed to reload note nodes", http.StatusInternalServerError)
		return
	}

	// Return the updated settings
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

// Add this new handler
func updateVocabItems(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	courseID := vars["id"]
	userEmail := r.Header.Get("X-User-Email")

	// Verify course ownership
	exists, isOwner, err := CheckCourseOwnership(courseID, userEmail)
	if err != nil {
		fmt.Printf("Error checking course ownership: %v\n", err)
		http.Error(w, "Failed to verify course ownership", http.StatusInternalServerError)
		return
	}
	if !exists {
		fmt.Printf("Course not found: %s\n", courseID)
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}
	if !isOwner {
		fmt.Printf("Unauthorized access attempt by %s for course %s\n", userEmail, courseID)
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	// Parse request body
	var req struct {
		VocabItems map[string]VocabItem `json:"vocabItems"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fmt.Printf("Error decoding request body: %v\n", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Update the vocab items
	if err := updateCourseVocabItems(courseID, req.VocabItems); err != nil {
		fmt.Printf("Error updating vocab items: %v\n", err)
		http.Error(w, "Failed to update vocab items", http.StatusInternalServerError)
		return
	}

	// Get the updated settings to return
	settings, err := getCourseSettingsFromDB(courseID)
	if err != nil {
		fmt.Printf("Error fetching updated settings: %v\n", err)
		http.Error(w, "Failed to reload vocab items", http.StatusInternalServerError)
		return
	}

	// Return the updated settings
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

func getUserCoursesDetails(w http.ResponseWriter, r *http.Request) {
	userEmail := r.Header.Get("X-User-Email")

	// Fetch courses for the user
	courses, err := getUserCoursesFromDB(userEmail)
	if err != nil {
		http.Error(w, "Failed to fetch courses", http.StatusInternalServerError)
		return
	}

	var courseDetailsList []CourseDetails

	for _, course := range courses {
		// Fetch lesson plans for each course
		lessonPlans, err := getCourseLessonPlansFromDB(course.ID)
		if err != nil {
			fmt.Printf("Error fetching lesson plans: %v\n", err)
			http.Error(w, "Failed to fetch lesson plans", http.StatusInternalServerError)
			return
		}

		// Fetch lessons for each course
		lessons, err := getCourseLessonsFromDB(course.ID)
		if err != nil {
			fmt.Printf("Error fetching lessons: %v\n", err)
			http.Error(w, "Failed to fetch lessons", http.StatusInternalServerError)
			return
		}

		// Create a CourseDetails object
		courseDetails := CourseDetails{
			ID:          course.ID,
			Name:        course.Name,
			CreatedAt:   course.CreatedAt,
			LessonPlans: lessonPlans,
			Lessons:     lessons,
		}

		courseDetailsList = append(courseDetailsList, courseDetails)
	}

	// Encode the response as JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(courseDetailsList); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}


