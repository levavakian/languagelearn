package db

import (
	"database/sql"
	"os"
	"path/filepath"
	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB(dbPath string) error {
	// Create parent directory if it doesn't exist
	dbDir := filepath.Dir(dbPath)
	err := os.MkdirAll(dbDir, 0755)
	if err != nil {
		return err
	}

	// Open/create database
	DB, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		return err
	}

	// Enable foreign key support
	_, err = DB.Exec("PRAGMA foreign_keys = ON;")
	if err != nil {
		return err
	}

	return nil
}
