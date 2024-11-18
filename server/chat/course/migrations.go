package course

import (
	"github.com/levavakian/languagelearn/server/db"
)

func PopulateMigrations() {
	// Create courses table
	db.RegisterMigration(`
		CREATE TABLE IF NOT EXISTS courses (
			id TEXT PRIMARY KEY,
			creator_id TEXT NOT NULL,
			name TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`, "create_courses_table")

	// Create chats table
	db.RegisterMigration(`
		CREATE TABLE IF NOT EXISTS chats (
			id TEXT PRIMARY KEY,
			creator_id TEXT NOT NULL,
			name TEXT NOT NULL,
			lesson_id TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`, "create_chats_table")

	// Create lessons table
	db.RegisterMigration(`
		CREATE TABLE IF NOT EXISTS lessons (
			id TEXT PRIMARY KEY,
			course_id TEXT NOT NULL,
			chat_id TEXT NOT NULL,
			lesson_plan TEXT NOT NULL,
			summary TEXT,
			name TEXT NOT NULL,
			order_index INTEGER NOT NULL,
			free_practice BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
			FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
		)
	`, "create_lessons_table")

	// Create lesson_plans table
	db.RegisterMigration(`
		CREATE TABLE IF NOT EXISTS lesson_plans (
			id TEXT PRIMARY KEY,
			course_id TEXT NOT NULL,
			title TEXT NOT NULL,
			content TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
		)
	`, "create_lesson_plans_table")

	// Create course_settings table
	db.RegisterMigration(`
		CREATE TABLE IF NOT EXISTS course_settings (
			course_id TEXT PRIMARY KEY,
			settings TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
		)
	`, "create_course_settings_table")

	// Create chat_settings table
	db.RegisterMigration(`
		CREATE TABLE IF NOT EXISTS chat_settings (
			chat_id TEXT PRIMARY KEY,
			settings TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
		)
	`, "create_chat_settings_table")

	// Create messages table
	db.RegisterMigration(`
		CREATE TABLE IF NOT EXISTS messages (
			id SERIAL PRIMARY KEY,
			chat_id TEXT NOT NULL,
			sender TEXT NOT NULL,
			content TEXT NOT NULL,
			type TEXT NOT NULL,
			response_id TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
		)
	`, "create_messages_table")

	// Create chat deletion trigger
	db.RegisterMigration(`
		CREATE OR REPLACE FUNCTION delete_lesson_when_chat_deleted()
		RETURNS TRIGGER AS $$
		BEGIN
			DELETE FROM lessons WHERE id = OLD.lesson_id;
			RETURN OLD;
		END;
		$$ LANGUAGE plpgsql;

		DROP TRIGGER IF EXISTS delete_lesson_when_chat_deleted ON chats;
		
		CREATE TRIGGER delete_lesson_when_chat_deleted
		BEFORE DELETE ON chats
		FOR EACH ROW
		EXECUTE FUNCTION delete_lesson_when_chat_deleted();
	`, "create_chat_deletion_trigger")

	// Create user_credits table
	db.RegisterMigration(`
		CREATE TABLE IF NOT EXISTS user_credits (
			email TEXT PRIMARY KEY,
			nanocredits BIGINT NOT NULL DEFAULT 0
		)
	`, "create_user_credits_table")

	// Create payments table and index
	db.RegisterMigration(`
		CREATE TABLE IF NOT EXISTS payments (
			id TEXT PRIMARY KEY,
			email TEXT NOT NULL,
			ordering INTEGER NOT NULL,
			previous_amount BIGINT NOT NULL,
			adjusted_amount BIGINT NOT NULL,
			change_amount BIGINT NOT NULL,
			successful BOOLEAN NOT NULL,
			FOREIGN KEY (email) REFERENCES user_credits(email) ON DELETE CASCADE
		);

		CREATE INDEX IF NOT EXISTS idx_payments_email ON payments(email);
	`, "create_payments_table")
}
