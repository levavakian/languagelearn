package course

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/levavakian/languagelearn/server/db"
)

// CreateTables creates all necessary tables for the course package
func CreateTables(db *sql.DB) error {
	// Enable foreign key constraints
	_, err := db.Exec("PRAGMA foreign_keys = ON;")
	if err != nil {
		return fmt.Errorf("failed to enable foreign keys: %v", err)
	}

	// Create courses table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS courses (
			id TEXT PRIMARY KEY,
			creator_id TEXT NOT NULL,
			name TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return err
	}

	// Create lesson_plans table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS lesson_plans (
			id TEXT PRIMARY KEY,
			course_id TEXT NOT NULL,
			title TEXT NOT NULL,
			content TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		return err
	}

	// Create lessons table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS lessons (
			id TEXT PRIMARY KEY,
			course_id TEXT NOT NULL,
			chat_id TEXT NOT NULL,
			lesson_plan TEXT NOT NULL,
			summary TEXT,
			order_index INTEGER NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
			FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		return err
	}

	// Create course_settings table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS course_settings (
			course_id TEXT PRIMARY KEY,
			settings TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		return err
	}

	// Create chat_settings table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS chat_settings (
			chat_id TEXT PRIMARY KEY,
			settings TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		return err
	}

	// Create chats table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS chats (
			id TEXT PRIMARY KEY,
			creator_id TEXT NOT NULL,
			name TEXT NOT NULL,
			lesson_id TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return err
	}

	// Create messages table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			chat_id TEXT NOT NULL,
			sender TEXT NOT NULL,
			content TEXT NOT NULL,
			type TEXT NOT NULL,
			response_id TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		return err
	}

	// Create trigger to delete associated lesson when a chat is deleted
	_, err = db.Exec(`
		CREATE TRIGGER IF NOT EXISTS delete_lesson_when_chat_deleted
		BEFORE DELETE ON chats
		FOR EACH ROW
		BEGIN
			DELETE FROM lessons WHERE id = OLD.lesson_id;
		END;
	`)
	if err != nil {
		return err
	}

	return nil
}

// Course operations
func insertCourse(course Course) error {
	_, err := db.DB.Exec(
		"INSERT INTO courses (id, creator_id, name, created_at) VALUES (?, ?, ?, ?)",
		course.ID, course.CreatorID, course.Name, course.CreatedAt,
	)
	return err
}

func getUserCoursesFromDB(userEmail string) ([]Course, error) {
	rows, err := db.DB.Query(
		"SELECT id, creator_id, name, created_at FROM courses WHERE creator_id = ? ORDER BY created_at DESC",
		userEmail,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var courses []Course
	for rows.Next() {
		var course Course
		if err := rows.Scan(&course.ID, &course.CreatorID, &course.Name, &course.CreatedAt); err != nil {
			return nil, err
		}
		courses = append(courses, course)
	}
	return courses, nil
}

func getCourseFromDB(courseID string) (*Course, error) {
	var course Course
	err := db.DB.QueryRow(
		"SELECT id, creator_id, name, created_at FROM courses WHERE id = ?",
		courseID,
	).Scan(&course.ID, &course.CreatorID, &course.Name, &course.CreatedAt)
	
	if err != nil {
		return nil, err
	}

	return &course, nil
}

func updateCourseInDB(course Course) error {
	result, err := db.DB.Exec(
		"UPDATE courses SET name = ? WHERE id = ? AND creator_id = ?",
		course.Name, course.ID, course.CreatorID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("course not found or unauthorized")
	}
	return nil
}

func deleteCourseFromDB(courseID string) error {
	_, err := db.DB.Exec("DELETE FROM courses WHERE id = ?", courseID)
	return err
}

// Lesson plan operations
func insertLessonPlan(plan LessonPlan) error {
	_, err := db.DB.Exec(
		"INSERT INTO lesson_plans (id, course_id, title, content, created_at) VALUES (?, ?, ?, ?, ?)",
		plan.ID, plan.CourseID, plan.Title, plan.Content, plan.CreatedAt,
	)
	return err
}

func getCourseLessonPlansFromDB(courseID string) ([]LessonPlan, error) {
	rows, err := db.DB.Query(
		"SELECT id, course_id, title, content, created_at FROM lesson_plans WHERE course_id = ? ORDER BY created_at",
		courseID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []LessonPlan
	for rows.Next() {
		var plan LessonPlan
		if err := rows.Scan(&plan.ID, &plan.CourseID, &plan.Title, &plan.Content, &plan.CreatedAt); err != nil {
			return nil, err
		}
		plans = append(plans, plan)
	}
	return plans, nil
}

func updateLessonPlanInDB(plan LessonPlan) error {
	result, err := db.DB.Exec(
		"UPDATE lesson_plans SET title = ?, content = ? WHERE id = ? AND course_id = ?",
		plan.Title, plan.Content, plan.ID, plan.CourseID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("lesson plan not found")
	}
	return nil
}

func deleteLessonPlanFromDB(planID string) error {
	_, err := db.DB.Exec("DELETE FROM lesson_plans WHERE id = ?", planID)
	return err
}

// Lesson operations
func getNextLessonOrderIndex(courseID string) (int, error) {
	var maxIndex sql.NullInt64
	err := db.DB.QueryRow(
		"SELECT MAX(order_index) FROM lessons WHERE course_id = ?",
		courseID,
	).Scan(&maxIndex)
	
	if err != nil {
		return 0, err
	}
	
	if !maxIndex.Valid {
		return 0, nil
	}
	return int(maxIndex.Int64) + 1, nil
}

func insertLesson(lesson Lesson) error {
	_, err := db.DB.Exec(
		"INSERT INTO lessons (id, course_id, chat_id, lesson_plan, summary, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		lesson.ID, lesson.CourseID, lesson.ChatID, lesson.LessonPlan, lesson.Summary, lesson.OrderIndex, lesson.CreatedAt,
	)
	return err
}

func getCourseLessonsFromDB(courseID string) ([]Lesson, error) {
	rows, err := db.DB.Query(
		"SELECT id, course_id, chat_id, lesson_plan, summary, order_index, created_at FROM lessons WHERE course_id = ? ORDER BY order_index",
		courseID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var lessons []Lesson
	for rows.Next() {
		var lesson Lesson
		if err := rows.Scan(&lesson.ID, &lesson.CourseID, &lesson.ChatID, &lesson.LessonPlan, &lesson.Summary, &lesson.OrderIndex, &lesson.CreatedAt); err != nil {
			return nil, err
		}
		lessons = append(lessons, lesson)
	}
	return lessons, nil
}

func updateLessonInDB(lesson Lesson) error {
	result, err := db.DB.Exec(
		"UPDATE lessons SET lesson_plan = ?, summary = ?, order_index = ? WHERE id = ? AND course_id = ?",
		lesson.LessonPlan, lesson.Summary, lesson.OrderIndex, lesson.ID, lesson.CourseID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("lesson not found")
	}
	return nil
}

func deleteLessonFromDB(lessonID string) error {
	_, err := db.DB.Exec("DELETE FROM lessons WHERE id = ?", lessonID)
	return err
}

// Course settings operations
func getCourseSettingsFromDB(courseID string) (*Settings, error) {
	var settingsJSON string
	err := db.DB.QueryRow(
		"SELECT settings FROM course_settings WHERE course_id = ?",
		courseID,
	).Scan(&settingsJSON)

	if err != nil {
		return nil, err
	}

	var settings Settings
	if err := json.Unmarshal([]byte(settingsJSON), &settings); err != nil {
		return nil, fmt.Errorf("error parsing settings JSON: %v", err)
	}

	settings.ID = courseID // Convert course_id to id
	return &settings, nil
}

func saveCourseSettingsToDB(settings Settings) error {
	settingsJSON, err := json.Marshal(settings)
	if err != nil {
		return fmt.Errorf("error marshaling settings: %v", err)
	}

	result, err := db.DB.Exec(
		`REPLACE INTO course_settings (course_id, settings) VALUES (?, ?)`,
		settings.ID, string(settingsJSON), // Convert id to course_id
	)
	if err != nil {
		return fmt.Errorf("database error while saving settings: %v", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error checking affected rows: %v", err)
	}
	if rows == 0 {
		return fmt.Errorf("no rows were affected when saving settings")
	}

	return nil
}

func getLessonPlanFromDB(planID string, courseID string) (*LessonPlan, error) {
	var plan LessonPlan
	err := db.DB.QueryRow(
		"SELECT id, course_id, title, content, created_at FROM lesson_plans WHERE id = ? AND course_id = ?",
		planID, courseID,
	).Scan(&plan.ID, &plan.CourseID, &plan.Title, &plan.Content, &plan.CreatedAt)
	
	if err != nil {
		return nil, err
	}
	
	return &plan, nil
}

func getLessonFromDB(lessonID string, courseID string) (*Lesson, error) {
	var lesson Lesson
	err := db.DB.QueryRow(
		"SELECT id, course_id, chat_id, lesson_plan, summary, order_index, created_at FROM lessons WHERE id = ? AND course_id = ?",
		lessonID, courseID,
	).Scan(&lesson.ID, &lesson.CourseID, &lesson.ChatID, &lesson.LessonPlan, &lesson.Summary, &lesson.OrderIndex, &lesson.CreatedAt)
	
	if err != nil {
		return nil, err
	}
	
	return &lesson, nil
}

func getLessonFromDBRaw(lessonID string) (*Lesson, error) {
	var lesson Lesson
	err := db.DB.QueryRow(
		"SELECT id, course_id, chat_id, lesson_plan, summary, order_index, created_at FROM lessons WHERE id = ?",
		lessonID,
	).Scan(&lesson.ID, &lesson.CourseID, &lesson.ChatID, &lesson.LessonPlan, &lesson.Summary, &lesson.OrderIndex, &lesson.CreatedAt)
	
	if err != nil {
		return nil, err
	}
	
	return &lesson, nil
}

func InsertChat(chat *Chat) error {
	_, err := db.DB.Exec(
		"INSERT INTO chats (id, creator_id, name, lesson_id, created_at) VALUES (?, ?, ?, ?, ?)",
		chat.ID, chat.CreatorID, chat.Name, chat.LessonID, chat.CreatedAt,
	)
	if err != nil {
		fmt.Printf("Error inserting chat: %v\n", err)
	}
	return err
}

func InsertMessage(msg *Message) error {
	_, err := db.DB.Exec(
		"INSERT INTO messages (chat_id, sender, content, type, response_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		msg.ChatID, msg.Sender, msg.Content, msg.Type, msg.ResponseID, msg.CreatedAt,
	)
	return err
}

func GetChat(chatID string, userEmail string) (*Chat, error) {
	var chat Chat
	var lessonID sql.NullString
	err := db.DB.QueryRow(`
		SELECT id, creator_id, name, lesson_id, created_at 
		FROM chats 
		WHERE id = ? AND creator_id = ?`,
		chatID, userEmail,
	).Scan(&chat.ID, &chat.CreatorID, &chat.Name, &lessonID, &chat.CreatedAt)
	
	if err != nil {
		return nil, err
	}

	if lessonID.Valid {
		chat.LessonID = lessonID.String
	}

	messages, err := GetChatMessages(chatID)
	if err != nil {
		return nil, err
	}

	chat.Messages = messages
	return &chat, nil
}

func GetChatRaw(chatID string) (*Chat, error) {
	var chat Chat
	var lessonID sql.NullString
	err := db.DB.QueryRow(`
		SELECT id, creator_id, name, lesson_id, created_at 
		FROM chats 
		WHERE id = ?`,
		chatID,
	).Scan(&chat.ID, &chat.CreatorID, &chat.Name, &lessonID, &chat.CreatedAt)
	
	if err != nil {
		return nil, err
	}

	if lessonID.Valid {
		chat.LessonID = lessonID.String
	}

	messages, err := GetChatMessages(chatID)
	if err != nil {
		return nil, err
	}

	chat.Messages = messages
	return &chat, nil
}

func GetChatMessages(chatID string) ([]Message, error) {
	rows, err := db.DB.Query(
		"SELECT id, chat_id, sender, content, type, response_id, created_at FROM messages WHERE chat_id = ? ORDER BY created_at",
		chatID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var msg Message
		err := rows.Scan(&msg.ID, &msg.ChatID, &msg.Sender, &msg.Content, &msg.Type, &msg.ResponseID, &msg.CreatedAt)
		if err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}
	return messages, nil
}

func DeleteChat(chatID string) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %v", err)
	}
	defer tx.Rollback()

	// Get and log the lesson ID before deletion
	var lessonID sql.NullString
	err = tx.QueryRow("SELECT lesson_id FROM chats WHERE id = ?", chatID).Scan(&lessonID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("chat not found: %v", err)
		}
		return fmt.Errorf("failed to query chat: %v", err)
	}

	if lessonID.Valid {
		fmt.Printf("Deleting chat %s with lesson_id: %s\n", chatID, lessonID.String)
	} else {
		fmt.Printf("Deleting chat %s (no lesson_id)\n", chatID)
	}

	// Delete the chat (this will cascade delete messages and lessons due to foreign key constraints)
	_, err = tx.Exec("DELETE FROM chats WHERE id = ?", chatID)
	if err != nil {
		return fmt.Errorf("failed to delete chat: %v", err)
	}

	return tx.Commit()
}

func getChatSettingsFromDB(chatID string) (*Settings, error) {
	var settingsJSON string
	err := db.DB.QueryRow(
		"SELECT settings FROM chat_settings WHERE chat_id = ?",
		chatID,
	).Scan(&settingsJSON)

	if err != nil {
		return nil, err
	}

	var settings Settings
	if err := json.Unmarshal([]byte(settingsJSON), &settings); err != nil {
		return nil, fmt.Errorf("error parsing settings JSON: %v", err)
	}

	settings.ID = chatID // Convert chat_id to id
	return &settings, nil
}

func saveChatSettingsToDB(settings Settings) error {
	settingsJSON, err := json.Marshal(settings)
	if err != nil {
		return fmt.Errorf("error marshaling settings: %v", err)
	}

	result, err := db.DB.Exec(
		`REPLACE INTO chat_settings (chat_id, settings) VALUES (?, ?)`,
		settings.ID, string(settingsJSON), // Convert id to chat_id
	)
	if err != nil {
		return fmt.Errorf("database error while saving settings: %v", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error checking affected rows: %v", err)
	}
	if rows == 0 {
		return fmt.Errorf("no rows were affected when saving settings")
	}

	return nil
}

func GetUserChats(userEmail string) ([]Chat, error) {
	rows, err := db.DB.Query(`
		SELECT DISTINCT c.id, c.creator_id, c.name, c.lesson_id, c.created_at 
		FROM chats c
		LEFT JOIN lessons l ON c.lesson_id = l.id
		LEFT JOIN courses co ON l.course_id = co.id
		WHERE c.creator_id = ? OR co.creator_id = ?
		ORDER BY c.created_at DESC`,
		userEmail, userEmail,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chats []Chat
	for rows.Next() {
		var chat Chat
		var lessonID sql.NullString
		err := rows.Scan(&chat.ID, &chat.CreatorID, &chat.Name, &lessonID, &chat.CreatedAt)
		if err != nil {
			return nil, err
		}

		if lessonID.Valid {
			chat.LessonID = lessonID.String
		}

		chats = append(chats, chat)
	}
	return chats, nil
}

func getStandaloneChats(userEmail string) ([]Chat, error) {
	rows, err := db.DB.Query(`
		SELECT id, creator_id, name, lesson_id, created_at 
		FROM chats 
		WHERE creator_id = ? 
		AND (lesson_id IS NULL OR lesson_id = '')
		ORDER BY created_at DESC`,
		userEmail,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chats []Chat
	for rows.Next() {
		var chat Chat
		var lessonID sql.NullString
		err := rows.Scan(&chat.ID, &chat.CreatorID, &chat.Name, &lessonID, &chat.CreatedAt)
		if err != nil {
			return nil, err
		}

		if lessonID.Valid {
			chat.LessonID = lessonID.String
		}

		chats = append(chats, chat)
	}
	return chats, nil
}
