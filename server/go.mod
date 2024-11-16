module github.com/levavakian/languagelearn/server

go 1.21

toolchain go1.22.2

require (
	github.com/golang-jwt/jwt/v5 v5.2.1
	github.com/google/uuid v1.6.0
	github.com/gorilla/mux v1.8.1
	github.com/gorilla/websocket v1.5.0
	github.com/mattn/go-sqlite3 v1.14.24
)

require github.com/lib/pq v1.10.9 // indirect
