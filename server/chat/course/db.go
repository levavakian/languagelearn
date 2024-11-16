package course

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/levavakian/languagelearn/server/db"
	"github.com/google/uuid"
)

// Course operations
func insertCourse(course Course) error {
	_, err := db.DB.Exec(
		"INSERT INTO courses (id, creator_id, name, created_at) VALUES ($1, $2, $3, $4)",
		course.ID, course.CreatorID, course.Name, course.CreatedAt,
	)
	return err
}

func getUserCoursesFromDB(userEmail string) ([]Course, error) {
	rows, err := db.DB.Query(
		"SELECT id, creator_id, name, created_at FROM courses WHERE creator_id = $1 ORDER BY created_at DESC",
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
		"SELECT id, creator_id, name, created_at FROM courses WHERE id = $1",
		courseID,
	).Scan(&course.ID, &course.CreatorID, &course.Name, &course.CreatedAt)
	
	if err != nil {
		return nil, err
	}

	return &course, nil
}

func updateCourseInDB(course Course) error {
	result, err := db.DB.Exec(
		"UPDATE courses SET name = $1 WHERE id = $2 AND creator_id = $3",
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
	_, err := db.DB.Exec("DELETE FROM courses WHERE id = $1", courseID)
	return err
}

// Lesson plan operations
func insertLessonPlan(plan LessonPlan) error {
	_, err := db.DB.Exec(
		"INSERT INTO lesson_plans (id, course_id, title, content, created_at) VALUES ($1, $2, $3, $4, $5)",
		plan.ID, plan.CourseID, plan.Title, plan.Content, plan.CreatedAt,
	)
	return err
}

func getCourseLessonPlansFromDB(courseID string) ([]LessonPlan, error) {
	rows, err := db.DB.Query(
		"SELECT id, course_id, title, content, created_at FROM lesson_plans WHERE course_id = $1 ORDER BY created_at",
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
		"UPDATE lesson_plans SET title = $1, content = $2 WHERE id = $3 AND course_id = $4",
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
	_, err := db.DB.Exec("DELETE FROM lesson_plans WHERE id = $1", planID)
	return err
}

// Lesson operations
func getNextLessonOrderIndex(courseID string) (int, error) {
	var maxIndex sql.NullInt64
	err := db.DB.QueryRow(
		"SELECT MAX(order_index) FROM lessons WHERE course_id = $1",
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
		"INSERT INTO lessons (id, course_id, chat_id, lesson_plan, summary, order_index, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		lesson.ID, lesson.CourseID, lesson.ChatID, lesson.LessonPlan, lesson.Summary, lesson.OrderIndex, lesson.CreatedAt,
	)
	return err
}

func getCourseLessonsFromDB(courseID string) ([]Lesson, error) {
	rows, err := db.DB.Query(
		"SELECT id, course_id, chat_id, lesson_plan, summary, order_index, created_at FROM lessons WHERE course_id = $1 ORDER BY order_index",
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
		"UPDATE lessons SET lesson_plan = $1, summary = $2, order_index = $3 WHERE id = $4 AND course_id = $5",
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
	_, err := db.DB.Exec("DELETE FROM lessons WHERE id = $1", lessonID)
	return err
}

// Course settings operations
func getCourseSettingsFromDB(courseID string) (*Settings, error) {
	var settingsJSON string
	err := db.DB.QueryRow(
		"SELECT settings FROM course_settings WHERE course_id = $1",
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
		`INSERT INTO course_settings (course_id, settings) 
		 VALUES ($1, $2)
		 ON CONFLICT (course_id) DO UPDATE SET settings = $2`,
		settings.ID, string(settingsJSON),
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
		"SELECT id, course_id, title, content, created_at FROM lesson_plans WHERE id = $1 AND course_id = $2",
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
		"SELECT id, course_id, chat_id, lesson_plan, summary, order_index, created_at FROM lessons WHERE id = $1 AND course_id = $2",
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
		"SELECT id, course_id, chat_id, lesson_plan, summary, order_index, created_at FROM lessons WHERE id = $1",
		lessonID,
	).Scan(&lesson.ID, &lesson.CourseID, &lesson.ChatID, &lesson.LessonPlan, &lesson.Summary, &lesson.OrderIndex, &lesson.CreatedAt)
	
	if err != nil {
		return nil, err
	}
	
	return &lesson, nil
}

func InsertChat(chat *Chat) error {
	_, err := db.DB.Exec(
		"INSERT INTO chats (id, creator_id, name, lesson_id, created_at) VALUES ($1, $2, $3, $4, $5)",
		chat.ID, chat.CreatorID, chat.Name, chat.LessonID, chat.CreatedAt,
	)
	if err != nil {
		fmt.Printf("Error inserting chat: %v\n", err)
	}
	return err
}

func InsertMessage(msg *Message) error {
	_, err := db.DB.Exec(
		"INSERT INTO messages (chat_id, sender, content, type, response_id, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
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
		WHERE id = $1 AND creator_id = $2`,
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
		WHERE id = $1`,
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
		"SELECT id, chat_id, sender, content, type, response_id, created_at FROM messages WHERE chat_id = $1 ORDER BY created_at",
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
	err = tx.QueryRow("SELECT lesson_id FROM chats WHERE id = $1", chatID).Scan(&lessonID)
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
	_, err = tx.Exec("DELETE FROM chats WHERE id = $1", chatID)
	if err != nil {
		return fmt.Errorf("failed to delete chat: %v", err)
	}

	return tx.Commit()
}

func getChatSettingsFromDB(chatID string) (*Settings, error) {
	var settingsJSON string
	err := db.DB.QueryRow(
		"SELECT settings FROM chat_settings WHERE chat_id = $1",
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
		`INSERT INTO chat_settings (chat_id, settings) 
		 VALUES ($1, $2)
		 ON CONFLICT (chat_id) DO UPDATE SET settings = $2`,
		settings.ID, string(settingsJSON),
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
		SELECT id, creator_id, name, lesson_id, created_at 
		FROM chats
		WHERE creator_id = $1
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

func getStandaloneChats(userEmail string) ([]Chat, error) {
	rows, err := db.DB.Query(`
		SELECT id, creator_id, name, lesson_id, created_at 
		FROM chats 
		WHERE creator_id = $1 
		AND lesson_id IS NULL
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

// LogPayment logs a payment in the database
func logPayment(email string, previousAmount int64, adjustedAmount int64, changeAmount int64, successful bool) error {
	// Begin a transaction to ensure consistency
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Get the current maximum ordering value for the user
	var maxOrdering sql.NullInt64
	err = tx.QueryRow(
		"SELECT MAX(ordering) FROM payments WHERE email = $1",
		email,
	).Scan(&maxOrdering)
	if err != nil {
		return fmt.Errorf("error fetching max ordering: %v", err)
	}

	// Calculate the next ordering value
	nextOrdering := 1
	if maxOrdering.Valid {
		nextOrdering = int(maxOrdering.Int64) + 1
	}

	// Insert the new payment record with the calculated ordering
	_, err = tx.Exec(
		"INSERT INTO payments (id, email, ordering, previous_amount, adjusted_amount, change_amount, successful) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		uuid.New().String(),
		email,
		nextOrdering,
		previousAmount,
		adjustedAmount,
		changeAmount,
		successful,
	)
	if err != nil {
		return fmt.Errorf("error inserting payment: %v", err)
	}

	// Commit the transaction
	return tx.Commit()
}

// DeductCredits subtracts the specified amount of nanocredits from the user's account.
// Returns an error if the user doesn't have sufficient credits or if there's a database error.
func DeductCredits(email string, amount int64) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %v", err)
	}
	defer tx.Rollback()

	// Get current balance (for logging purposes only)
	var currentBalance int64
	err = tx.QueryRow("SELECT nanocredits FROM user_credits WHERE email = $1", email).Scan(&currentBalance)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to get current balance: %v", err)
	}

	// Atomically update balance
	_, err = tx.Exec("UPDATE user_credits SET nanocredits = nanocredits - $1 WHERE email = $2", 
		amount, email)
	if err != nil {
		return fmt.Errorf("failed to update balance: %v", err)
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("failed to commit transaction while deducting credits: %v", err)
	}

	// Log the payment
	err = logPayment(email, currentBalance, currentBalance - amount, -amount, true)
	if err != nil {
		return fmt.Errorf("failed to log payment: %v", err)
	}

	return nil
}
