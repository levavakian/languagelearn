package db

import (
	"database/sql"
	_ "github.com/lib/pq" // PostgreSQL driver
	"fmt"
	"time"
)

var DB *sql.DB

func InitDB(connStr string) error {
	var err error
	
	// Try connecting for up to 20 seconds
	for attempts := 0; attempts < 20; attempts++ {
		// Open PostgreSQL database
		DB, err = sql.Open("postgres", connStr)
		if err != nil {
			println("Failed to open database:", err.Error())
			time.Sleep(time.Second)
			continue
		}

		// Test the connection
		err = DB.Ping()
		if err != nil {
			println("Failed to connect to database:", err.Error())
			time.Sleep(time.Second)
			continue
		}

		return nil // Successfully connected
	}

	return fmt.Errorf("failed to connect to database after 20 attempts: %v", err)
}
