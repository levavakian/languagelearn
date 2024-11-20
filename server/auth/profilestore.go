package auth

import (
	"sync"
	"time"
)

type Profile struct {
	Email string `json:"email"`
}

type JWTInfo struct {
	Email  string
	Expiry time.Time
}

type ProfileStore struct {
	profiles map[string]Profile
	jwtMap   map[string]JWTInfo // Map JWT to email and expiry
	mu       sync.RWMutex
	done     chan struct{}      // Channel to signal goroutine to stop
}

func NewProfileStore() *ProfileStore {
	ps := &ProfileStore{
		profiles: make(map[string]Profile),
		jwtMap:   make(map[string]JWTInfo),
		done:     make(chan struct{}),
	}
	go ps.cleanupExpiredJWTs()
	return ps
}

func (ps *ProfileStore) cleanupExpiredJWTs() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			ps.mu.Lock()
			for jwt, info := range ps.jwtMap {
				if time.Now().After(info.Expiry.Add(24 * time.Hour)) {
					delete(ps.jwtMap, jwt)
				}
			}
			ps.mu.Unlock()
		case <-ps.done:
			return
		}
	}
}

func (ps *ProfileStore) Close() {
	close(ps.done)
}

func (ps *ProfileStore) Get(email string) (Profile, bool) {
	ps.mu.RLock()
	defer ps.mu.RUnlock()
	profile, exists := ps.profiles[email]
	return profile, exists
}

func (ps *ProfileStore) Set(email string, profile Profile) {
	ps.mu.Lock()
	defer ps.mu.Unlock()
	ps.profiles[email] = profile
}

func (ps *ProfileStore) GetEmailByJWT(jwt string) (string, bool) {
	ps.mu.RLock()
	defer ps.mu.RUnlock()
	info, exists := ps.jwtMap[jwt]
	if exists && time.Now().Before(info.Expiry.Add(24 * time.Hour)) {
		return info.Email, true
	}
	return "", false
}

func (ps *ProfileStore) SetJWT(jwt string, email string, expiry time.Time) {
	ps.mu.Lock()
	defer ps.mu.Unlock()
	ps.jwtMap[jwt] = JWTInfo{Email: email, Expiry: expiry}
}
