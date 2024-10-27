package auth

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"
	"crypto/rsa"

	"github.com/golang-jwt/jwt/v5"
)

type GooglePublicKeyStore struct {
	publicKeys map[string]*rsa.PublicKey
	expiry     time.Time
	mu         sync.RWMutex
}

var googleKeyStore = &GooglePublicKeyStore{}
var profileStore = NewProfileStore()

func (s *GooglePublicKeyStore) GetPublicKeys() (map[string]*rsa.PublicKey, error) {
	s.mu.RLock()
	if s.publicKeys != nil && time.Now().Before(s.expiry) {
		defer s.mu.RUnlock()
		return s.publicKeys, nil
	}
	s.mu.RUnlock()

	return s.fetchAndCachePublicKeys()
}

func (s *GooglePublicKeyStore) fetchAndCachePublicKeys() (map[string]*rsa.PublicKey, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.publicKeys != nil && time.Now().Before(s.expiry) {
		return s.publicKeys, nil
	}

	resp, err := http.Get("https://www.googleapis.com/oauth2/v3/certs")
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Google's public keys: %v", err)
	}
	defer resp.Body.Close()

	var certs struct {
		Keys []struct {
			Kid string `json:"kid"`
			N   string `json:"n"`
			E   string `json:"e"`
		} `json:"keys"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&certs); err != nil {
		return nil, fmt.Errorf("failed to decode Google's public keys: %v", err)
	}

	publicKeys := make(map[string]*rsa.PublicKey)
	for _, key := range certs.Keys {
		n, err := base64.RawURLEncoding.DecodeString(key.N)
		if err != nil {
			return nil, fmt.Errorf("failed to decode key modulus: %v", err)
		}

		e, err := base64.RawURLEncoding.DecodeString(key.E)
		if err != nil {
			return nil, fmt.Errorf("failed to decode key exponent: %v", err)
		}

		publicKeys[key.Kid] = &rsa.PublicKey{
			N: new(big.Int).SetBytes(n),
			E: int(new(big.Int).SetBytes(e).Int64()),
		}
	}

	s.publicKeys = publicKeys
	s.expiry = time.Now().Add(24 * time.Hour)

	return publicKeys, nil
}

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Log the URL
		var tokenString string

		// Check for Authorization header first
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		} else {
			// If no Authorization header, check for token in URL parameters
			tokenString = r.URL.Query().Get("token")
		}

		if tokenString == "" {
			http.Error(w, "Missing authorization token", http.StatusUnauthorized)
			return
		}

		if email, exists := profileStore.GetEmailByJWT(tokenString); exists {
			r.Header.Set("X-User-Email", email)
			next.ServeHTTP(w, r)
			return
		}

		publicKeys, err := googleKeyStore.GetPublicKeys()
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to get Google's public keys: %v", err), http.StatusInternalServerError)
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			kid, ok := token.Header["kid"].(string)
			if !ok {
				return nil, fmt.Errorf("kid header not found")
			}
			key, ok := publicKeys[kid]
			if !ok {
				return nil, fmt.Errorf("unable to find key with kid: %s", kid)
			}
			return key, nil
		})

		if err != nil {
			http.Error(w, fmt.Sprintf("Invalid token: %v", err), http.StatusUnauthorized)
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			email, ok := claims["email"].(string)
			if !ok {
				http.Error(w, "Invalid token claims: email not found", http.StatusUnauthorized)
				return
			}

			if _, exists := profileStore.Get(email); !exists {
				profileStore.Set(email, Profile{Email: email})
			}

			exp, ok := claims["exp"].(float64)
			if !ok {
				http.Error(w, "Invalid token claims: expiry not found", http.StatusUnauthorized)
				return
			}
			expiry := time.Unix(int64(exp), 0)

			profileStore.SetJWT(tokenString, email, expiry)

			r.Header.Set("X-User-Email", email)
			next.ServeHTTP(w, r)
		} else {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}
	}
}

func GetProfile(email string) (Profile, bool) {
	return profileStore.Get(email)
}
