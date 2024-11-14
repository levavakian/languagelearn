package course

import (
	"github.com/gorilla/mux"

	"github.com/levavakian/languagelearn/server/auth"
)

func SetupRoutes(api *mux.Router) {
	// Course routes
	api.HandleFunc("/course", auth.AuthMiddleware(createCourse)).Methods("POST")
	api.HandleFunc("/courses", auth.AuthMiddleware(getUserCourses)).Methods("GET")
	api.HandleFunc("/course/{id}", auth.AuthMiddleware(getCourse)).Methods("GET")
	api.HandleFunc("/course/{id}", auth.AuthMiddleware(updateCourse)).Methods("PUT")
	api.HandleFunc("/course/{id}", auth.AuthMiddleware(deleteCourse)).Methods("DELETE")

	// Lesson plan routes
	api.HandleFunc("/course/{id}/lesson-plan", auth.AuthMiddleware(createLessonPlan)).Methods("POST")
	api.HandleFunc("/course/{id}/lesson-plans", auth.AuthMiddleware(getCourseLessonPlans)).Methods("GET")
	api.HandleFunc("/course/{id}/lesson-plan/{planId}", auth.AuthMiddleware(getLessonPlan)).Methods("GET")
	api.HandleFunc("/course/{id}/lesson-plan/{planId}", auth.AuthMiddleware(updateLessonPlan)).Methods("PUT")
	api.HandleFunc("/course/{id}/lesson-plan/{planId}", auth.AuthMiddleware(deleteLessonPlan)).Methods("DELETE")

	// Lesson routes
	api.HandleFunc("/course/{id}/lesson", auth.AuthMiddleware(createLesson)).Methods("POST")
	api.HandleFunc("/course/{id}/lessons", auth.AuthMiddleware(getCourseLessons)).Methods("GET")
	api.HandleFunc("/course/{id}/lesson/{lessonId}", auth.AuthMiddleware(updateLesson)).Methods("PUT")
	api.HandleFunc("/course/{id}/lesson/{lessonId}", auth.AuthMiddleware(deleteLesson)).Methods("DELETE")

	// Vocab list routes
	api.HandleFunc("/course/{id}/vocab", auth.AuthMiddleware(updateVocabList)).Methods("PUT")
	api.HandleFunc("/course/{id}/vocab", auth.AuthMiddleware(getVocabList)).Methods("GET")

	// Default course routes
	api.HandleFunc("/course/default", auth.AuthMiddleware(createDefaultCourse)).Methods("POST")

	// Course settings routes
	api.HandleFunc("/course/{id}/settings", auth.AuthMiddleware(getCourseSettings)).Methods("GET")
	api.HandleFunc("/course/{id}/settings", auth.AuthMiddleware(updateCourseSettings)).Methods("POST")

	// Chat routes
	api.HandleFunc("/chat", auth.AuthMiddleware(createChat)).Methods("POST")
	api.HandleFunc("/chat/{id}/ws", auth.AuthMiddleware(handleWebSocket))
	api.HandleFunc("/chats", auth.AuthMiddleware(getUserChats)).Methods("GET")
	api.HandleFunc("/standalone-chats", auth.AuthMiddleware(getStandaloneUserChats)).Methods("GET")
	api.HandleFunc("/chat/{id}", auth.AuthMiddleware(deleteChat)).Methods("DELETE")
	api.HandleFunc("/chats/names", auth.AuthMiddleware(getChatNames)).Methods("POST")
	api.HandleFunc("/chat/{id}/settings", auth.AuthMiddleware(getChatSettings)).Methods("GET")
	api.HandleFunc("/chat/{id}/settings", auth.AuthMiddleware(updateChatSettings)).Methods("POST")

	// Lesson summary routes
	api.HandleFunc("/lesson/{lessonId}/generate-summary", auth.AuthMiddleware(generateLessonSummary)).Methods("POST")
	api.HandleFunc("/lesson/{lessonId}/generate-vocab", auth.AuthMiddleware(generateVocabUpdates)).Methods("POST")
	api.HandleFunc("/lesson/generate-next-plan", auth.AuthMiddleware(generateNextLessonPlan)).Methods("POST")

	// Add this new route in SetupRoutes
	api.HandleFunc("/course/{id}/lesson-names", auth.AuthMiddleware(getCourseLessonNames)).Methods("GET")

	// Add credit endpoints
	api.HandleFunc("/user/credits", auth.AuthMiddleware(getUserCredits)).Methods("GET")
	api.HandleFunc("/user/credits/buy", auth.AuthMiddleware(buyCredits)).Methods("POST")
}