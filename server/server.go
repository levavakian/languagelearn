package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gorilla/mux"
	"github.com/levavakian/languagelearn/server/auth"
	"github.com/levavakian/languagelearn/server/chat/course"
	"github.com/levavakian/languagelearn/server/db"
)

func main() {
	// Get database path from env or use default
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "../dbdata/app.db"
	}

	// Initialize database
	if err := db.InitDB(dbPath); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	course.PopulateMigrations()
	if err := db.ApplyMigrations(db.DB); err != nil {
		log.Fatal("Failed to apply migrations:", err)
	}

	r := mux.NewRouter()

	api := r.PathPrefix("/api").Subrouter()
	course.SetupRoutes(api)
	api.HandleFunc("/profile", auth.AuthMiddleware(handleProfile)).Methods("GET")

	// Serve static files from the build/static directory
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("../client/build/static"))))	
	// Serve files from the public directory
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("../client/build")))
	
	// This should come after the static file handlers
	r.HandleFunc("/", serveReactApp)


	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server is running on http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

func serveReactApp(w http.ResponseWriter, r *http.Request) {
	path, err := filepath.Abs("../client/build/index.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	http.ServeFile(w, r, path)
}

func handleProfile(w http.ResponseWriter, r *http.Request) {
	email := r.Header.Get("X-User-Email")
	
	profile, exists := auth.GetProfile(email)
	if !exists {
		http.Error(w, "Profile not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profile)
}
