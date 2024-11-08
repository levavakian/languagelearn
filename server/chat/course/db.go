package course

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/levavakian/languagelearn/server/db"
)

// CreateTables creates all necessary tables for the course package
func CreateTables(db *sql.DB) error {
	// Create courses table
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS courses (
			id TEXT PRIMARY KEY,
			creator_id TEXT NOT NULL,
			name TEXT NOT NULL,
			settings TEXT NOT NULL,
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

	// Create vocab_lists table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS vocab_lists (
			course_id TEXT PRIMARY KEY,
			items TEXT NOT NULL, -- JSON string of map[string]VocabItem
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
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
			FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		return err
	}

	return nil
} 

// Course operations
func insertCourse(course Course) error {
	settingsJSON, err := json.Marshal(course.Settings)
	if err != nil {
		return fmt.Errorf("error marshaling settings: %v", err)
	}

	_, err = db.DB.Exec(
		"INSERT INTO courses (id, creator_id, name, settings, created_at) VALUES (?, ?, ?, ?, ?)",
		course.ID, course.CreatorID, course.Name, string(settingsJSON), course.CreatedAt,
	)
	return err
}

func getUserCoursesFromDB(userEmail string) ([]Course, error) {
	rows, err := db.DB.Query(
		"SELECT id, creator_id, name, settings, created_at FROM courses WHERE creator_id = ? ORDER BY created_at DESC",
		userEmail,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var courses []Course
	for rows.Next() {
		var course Course
		var settingsJSON string
		if err := rows.Scan(&course.ID, &course.CreatorID, &course.Name, &settingsJSON, &course.CreatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(settingsJSON), &course.Settings); err != nil {
			return nil, fmt.Errorf("error parsing settings for course %s: %v", course.ID, err)
		}
		courses = append(courses, course)
	}
	return courses, nil
}

func getCourseFromDB(courseID string) (*Course, error) {
	var course Course
	var settingsJSON string
	err := db.DB.QueryRow(
		"SELECT id, creator_id, name, settings, created_at FROM courses WHERE id = ?",
		courseID,
	).Scan(&course.ID, &course.CreatorID, &course.Name, &settingsJSON, &course.CreatedAt)
	
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal([]byte(settingsJSON), &course.Settings); err != nil {
		return nil, fmt.Errorf("error parsing settings: %v", err)
	}

	return &course, nil
}

func updateCourseInDB(course Course) error {
	settingsJSON, err := json.Marshal(course.Settings)
	if err != nil {
		return fmt.Errorf("error marshaling settings: %v", err)
	}

	result, err := db.DB.Exec(
		"UPDATE courses SET name = ?, settings = ? WHERE id = ? AND creator_id = ?",
		course.Name, string(settingsJSON), course.ID, course.CreatorID,
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

// Vocab list operations
func getVocabListFromDB(courseID string) (*VocabList, error) {
	var vocabList VocabList
	var itemsJSON string
	err := db.DB.QueryRow(
		"SELECT course_id, items, updated_at FROM vocab_lists WHERE course_id = ?",
		courseID,
	).Scan(&vocabList.CourseID, &itemsJSON, &vocabList.UpdatedAt)
	
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal([]byte(itemsJSON), &vocabList.Items); err != nil {
		return nil, fmt.Errorf("error parsing vocab items: %v", err)
	}

	return &vocabList, nil
}

func updateVocabListInDB(vocabList VocabList) error {
	itemsJSON, err := json.Marshal(vocabList.Items)
	if err != nil {
		return fmt.Errorf("error marshaling vocab items: %v", err)
	}

	result, err := db.DB.Exec(
		`REPLACE INTO vocab_lists (course_id, items, updated_at) VALUES (?, ?, ?)`,
		vocabList.CourseID, string(itemsJSON), vocabList.UpdatedAt,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("no rows were affected when updating vocab list")
	}
	return nil
}

// Course settings operations
func getCourseSettingsFromDB(courseID string) (*CourseSettings, error) {
	var settingsJSON string
	err := db.DB.QueryRow(
		"SELECT settings FROM course_settings WHERE course_id = ?",
		courseID,
	).Scan(&settingsJSON)

	if err != nil {
		return nil, err
	}

	var settings CourseSettings
	if err := json.Unmarshal([]byte(settingsJSON), &settings); err != nil {
		return nil, fmt.Errorf("error parsing settings JSON: %v", err)
	}

	return &settings, nil
}

func saveCourseSettingsToDB(settings CourseSettings) error {
	settingsJSON, err := json.Marshal(settings)
	if err != nil {
		return fmt.Errorf("error marshaling settings: %v", err)
	}

	result, err := db.DB.Exec(
		`REPLACE INTO course_settings (course_id, settings) VALUES (?, ?)`,
		settings.CourseID, string(settingsJSON),
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