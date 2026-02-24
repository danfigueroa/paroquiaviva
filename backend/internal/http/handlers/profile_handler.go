package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"parish-viva/backend/internal/http/middleware"
	"parish-viva/backend/internal/http/shared"
	"parish-viva/backend/internal/services"
)

type ProfileHandler struct {
	service *services.Service
}

type updateProfileRequest struct {
	DisplayName string  `json:"displayName"`
	AvatarURL   *string `json:"avatarUrl"`
}

func NewProfileHandler(service *services.Service) *ProfileHandler {
	return &ProfileHandler{service: service}
}

func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	profile, err := h.service.GetProfile(r.Context(), userID)
	if err != nil {
		shared.WriteError(w, http.StatusNotFound, "USER_NOT_FOUND", "User not found", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, profile)
}

func (h *ProfileHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	var req updateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		shared.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON payload", nil)
		return
	}
	profile, err := h.service.UpdateProfile(r.Context(), userID, req.DisplayName, req.AvatarURL)
	if err != nil {
		if errors.Is(err, services.ErrInvalidDisplayName) {
			shared.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid displayName", nil)
			return
		}
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, profile)
}
