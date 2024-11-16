package db

import (
	"database/sql"
	"fmt"
)

type Migration struct {
	ID   int
	Name string
	SQL  string
}

var migrations []Migration

// RegisterMigration adds a new migration to the queue
func RegisterMigration(sql string, name string) {
	migrations = append(migrations, Migration{
		ID:   len(migrations) + 1,
		Name: name,
		SQL:  sql,
	})
}

// ensureMigrationTable creates the migration history table if it doesn't exist
func ensureMigrationTable(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS migration_history (
			id SERIAL PRIMARY KEY
		)
	`)
	return err
}

// GetPendingMigrations returns all migrations that haven't been applied yet
func GetPendingMigrations(db *sql.DB) ([]Migration, error) {
	if err := ensureMigrationTable(db); err != nil {
		return nil, fmt.Errorf("failed to ensure migration table: %w", err)
	}

	var lastID int
	err := db.QueryRow("SELECT COALESCE(MAX(id), 0) FROM migration_history").Scan(&lastID)
	if err != nil {
		return nil, fmt.Errorf("failed to query latest migration ID: %w", err)
	}

	pending := make([]Migration, 0)
	for _, m := range migrations {
		if m.ID > lastID {
			pending = append(pending, m)
		}
	}

	return pending, nil
}

// ApplyMigrations runs all pending migrations
func ApplyMigrations(db *sql.DB) error {
	pending, err := GetPendingMigrations(db)
	if err != nil {
		return err
	}

	for _, migration := range pending {
		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("failed to begin transaction: %w", err)
		}

		// Get display name for logging
		displayName := migration.Name
		if displayName == "" {
			displayName = fmt.Sprintf("migration_%d", migration.ID)
		}

		if _, err := tx.Exec(migration.SQL); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to apply %s: %w", displayName, err)
		}

		if _, err := tx.Exec(
			"INSERT INTO migration_history (id) VALUES ($1)",
			migration.ID,
		); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to record %s: %w", displayName, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit %s: %w", displayName, err)
		}

		fmt.Printf("Applied %s\n", displayName)
	}

	return nil
}
