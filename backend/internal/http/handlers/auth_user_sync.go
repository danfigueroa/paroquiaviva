package handlers

import (
	"net/http"

	"parish-viva/backend/internal/http/middleware"
	"parish-viva/backend/internal/services"
)

func ensureAuthUser(service *services.Service, r *http.Request) error {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	username := middleware.GetString(r.Context(), middleware.ContextKeyUsername)
	displayName := middleware.GetString(r.Context(), middleware.ContextKeyDisplayName)
	return service.EnsureAuthUser(r.Context(), userID, userEmail, username, displayName)
}
