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
	"github.com/levavakian/languagelearn/server/chat"
)

func main() {
	r := mux.NewRouter()

	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("../client/build/static"))))
	r.HandleFunc("/", serveReactApp)

	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/profile", auth.AuthMiddleware(handleProfile)).Methods("GET")

	// Use the new, more specific function name
	chat.SetupRoutes(api)

	// If you have other route setups, you can add them here with different names
	// For example: SetupUserRoutes(api, auth.AuthMiddleware)

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
