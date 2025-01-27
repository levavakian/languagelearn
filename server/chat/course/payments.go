package course

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"bytes"
	"os"
	"fmt"
	"strings"
	"math"

	"github.com/google/uuid"

	"github.com/levavakian/languagelearn/server/db"
)

// BuyCreditsRequest represents the request body for buying credits
type BuyCreditsRequest struct {
	SourceID string `json:"sourceId"`
	Credits  int    `json:"credits"`
}

// BuyCredits handles the purchase of credits
func buyCredits(w http.ResponseWriter, r *http.Request) {
	var req BuyCreditsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fmt.Printf("Error decoding request body: %v\n", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	userEmail := r.Header.Get("X-User-Email")

	// Check if user already has credits
	var currentNanoCredits int64
	err := db.DB.QueryRow("SELECT nanocredits FROM user_credits WHERE email = $1", userEmail).Scan(&currentNanoCredits)

	if err == sql.ErrNoRows {
		// User does not have an entry, create one with 0 credits before starting the transaction
		_, err = db.DB.Exec("INSERT INTO user_credits (email, nanocredits) VALUES ($1, $2)", userEmail, 0)
		if err != nil {
			fmt.Printf("Error creating user credits entry: %v\n", err)
			http.Error(w, "Failed to create user credits entry", http.StatusInternalServerError)
			return
		}
		currentNanoCredits = 0
	} else if err != nil {
		fmt.Printf("Error fetching user credits: %v\n", err)
		http.Error(w, "Failed to fetch user credits", http.StatusInternalServerError)
		return
	}

	// Start a transaction
	tx, err := db.DB.Begin()
	if err != nil {
		fmt.Printf("Error starting transaction: %v\n", err)
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// User exists, update their credits with optimistic concurrency control
	_, err = tx.Exec("UPDATE user_credits SET nanocredits = nanocredits + $1 WHERE email = $2", req.Credits * 1e9, userEmail)
	if err != nil {
		if err == sql.ErrNoRows {
			fmt.Printf("Concurrent modification detected: %v\n", err)
			http.Error(w, "Credits have been modified by another transaction", http.StatusConflict)
			return
		}
		fmt.Printf("Error updating user credits: %v\n", err)
		http.Error(w, "Failed to update user credits", http.StatusInternalServerError)
		return
	}

	// Prepare the payment request to Square
	idempotencyKey := uuid.New().String()
	paymentRequest := map[string]interface{}{
		"source_id":        req.SourceID,
		"idempotency_key": idempotencyKey,
		"amount_money": map[string]interface{}{
			"amount":   req.Credits, // Amount in cents
			"currency": "USD",
		},
	}

	// Convert paymentRequest to JSON
	jsonData, err := json.Marshal(paymentRequest)
	if err != nil {
		fmt.Printf("Error marshaling payment request: %v\n", err)
		http.Error(w, "Failed to create payment request", http.StatusInternalServerError)
		return
	}

	// Make the request to Square Payments API
	baseURL := "https://connect.squareup.com"
	if strings.HasPrefix(os.Getenv("SQUARE_APP_ID"), "sandbox") {
		baseURL = "https://connect.squareupsandbox.com"
	}
	squareURL := baseURL + "/v2/payments"
	reqSquare, err := http.NewRequest("POST", squareURL, bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("Error creating Square request: %v\n", err)
		http.Error(w, "Failed to create request to Square", http.StatusInternalServerError)
		return
	}

	// Set headers
	reqSquare.Header.Set("Content-Type", "application/json")
	reqSquare.Header.Set("Authorization", "Bearer " + os.Getenv("SQUARE_ACCESS_TOKEN"))
	reqSquare.Header.Set("Square-Version", "2024-10-17")

	client := &http.Client{}
	resp, err := client.Do(reqSquare)
	if err != nil {
		fmt.Printf("Error processing payment with Square: %v\n", err)
		http.Error(w, "Failed to process payment", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Read and log the error response
		var responseBody bytes.Buffer
		_, err := responseBody.ReadFrom(resp.Body)
		if err != nil {
			fmt.Printf("Error reading Square error response: %v\n", err)
		} else {
			fmt.Printf("Square API error response: %s\n", responseBody.String())
		}
		http.Error(w, "Payment processing failed", http.StatusBadRequest)
		return
	}

	// Commit the transaction
	if err := tx.Commit(); err != nil {
		fmt.Printf("Error committing transaction: %v\n", err)
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	// Log the payment
	err = logPayment(userEmail, currentNanoCredits, currentNanoCredits + int64(req.Credits * 1e9), int64(req.Credits * 1e9), true)
	if err != nil {
		fmt.Printf("Error logging payment: %v\n", err)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Credits purchased successfully",
		"credits": int(math.Floor(float64(currentNanoCredits) / 1e9)) + req.Credits,
	})
}

// GetUserCredits handles fetching the user's current credits
func getUserCredits(w http.ResponseWriter, r *http.Request) {
	userEmail := r.Header.Get("X-User-Email")

	var nanocredits int64
	err := db.DB.QueryRow("SELECT nanocredits FROM user_credits WHERE email = $1", userEmail).Scan(&nanocredits)

	if err != nil && err != sql.ErrNoRows {
		fmt.Printf("Error fetching user credits: %v\n", err)
		http.Error(w, "Failed to fetch user credits", http.StatusInternalServerError)
		return
	} else if err == sql.ErrNoRows {
		// User does not have credits
		nanocredits = 0
	}
	credits := int(math.Floor(float64(nanocredits) / 1e9))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"credits": credits})
}

// calculateRealtimeCreditUsage calculates the credit cost in nanocredits based on the usage data from the OpenAI Realtime API.
func calculateRealtimeCreditUsage(usage OpenAIResponseDoneUsage) int64 {
    // Hardcoded rates in nanocredits per token
    const (
        textInputRate        int64 = int64(1.2 * 500000)    // 500 credits per million tokens
        textCachedInputRate  int64 = int64(1.2 * 250000)    // 250 credits per million tokens
        textOutputRate       int64 = int64(1.2 * 2000000)   // 2000 credits per million tokens
        audioInputRate       int64 = int64(1.2 * 4000000)   // 4000 credits per million tokens
        audioCachedInputRate int64 = int64(1.2 * 250000)    // 250 credits per million tokens
        audioOutputRate      int64 = int64(1.2 * 8000000)   // 8000 credits per million tokens
    )

    var totalCost int64 = 0

    // Input tokens
    totalCost += int64(usage.InputTokenDetails.TextTokens - usage.InputTokenDetails.CachedTokenDetails.TextTokens) * textInputRate
    totalCost += int64(usage.InputTokenDetails.AudioTokens - usage.InputTokenDetails.CachedTokenDetails.AudioTokens) * audioInputRate

    // Cached input tokens
    totalCost += int64(usage.InputTokenDetails.CachedTokenDetails.TextTokens) * textCachedInputRate
    totalCost += int64(usage.InputTokenDetails.CachedTokenDetails.AudioTokens) * audioCachedInputRate

    // Output tokens
    totalCost += int64(usage.OutputTokenDetails.TextTokens) * textOutputRate
    totalCost += int64(usage.OutputTokenDetails.AudioTokens) * audioOutputRate

    return totalCost
}

// calculateCompletionCreditUsage calculates the credit cost in nanocredits based on the usage data from the OpenAI Completions API.
func calculateCompletionCreditUsage(usage ChatCompletionUsage) int64 {
    // Hardcoded rates in nanocredits per token
    const (
        promptTokenRate     int64 = int64(1.2 * 250000)    // 250 credits per million tokens
        completionTokenRate int64 = int64(1.2 * 1000000)   // 1000 credits per million tokens
    )

    var totalCost int64 = 0

    // Calculate cost for prompt tokens
    totalCost += int64(usage.PromptTokens) * promptTokenRate

    // Calculate cost for completion tokens
    totalCost += int64(usage.CompletionTokens) * completionTokenRate

    return totalCost
}