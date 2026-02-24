package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"parish-viva/backend/internal/http/middleware"
	"parish-viva/backend/internal/http/shared"
	"parish-viva/backend/internal/repositories"
	"parish-viva/backend/internal/services"
)

type FriendHandler struct {
	service *services.Service
}

type sendFriendRequestInput struct {
	TargetUsername string `json:"targetUsername"`
}

func NewFriendHandler(service *services.Service) *FriendHandler {
	return &FriendHandler{service: service}
}

func (h *FriendHandler) ListFriends(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	items, err := h.service.ListFriends(r.Context(), userID)
	if err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *FriendHandler) ListPendingRequests(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	items, err := h.service.ListPendingFriendRequests(r.Context(), userID)
	if err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *FriendHandler) SendRequest(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	var req sendFriendRequestInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		shared.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON payload", nil)
		return
	}

	err := h.service.SendFriendRequest(r.Context(), userID, req.TargetUsername)
	if err != nil {
		if errors.Is(err, services.ErrInvalidUsername) {
			shared.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid target username", nil)
			return
		}
		if errors.Is(err, repositories.ErrCannotAddSelf) {
			shared.WriteError(w, http.StatusBadRequest, "CANNOT_ADD_SELF", "You cannot add yourself", nil)
			return
		}
		if errors.Is(err, repositories.ErrFriendUserNotFound) {
			shared.WriteError(w, http.StatusNotFound, "USER_NOT_FOUND", "User not found", nil)
			return
		}
		if errors.Is(err, repositories.ErrFriendRequestAlreadyExists) {
			shared.WriteError(w, http.StatusConflict, "FRIEND_REQUEST_EXISTS", "Friend request already exists", nil)
			return
		}
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}

	shared.WriteJSON(w, http.StatusCreated, map[string]any{"status": "requested"})
}

func (h *FriendHandler) AcceptRequest(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	requestID := chi.URLParam(r, "requestId")
	err := h.service.AcceptFriendRequest(r.Context(), userID, requestID)
	if err != nil {
		if errors.Is(err, repositories.ErrFriendRequestNotFound) {
			shared.WriteError(w, http.StatusNotFound, "FRIEND_REQUEST_NOT_FOUND", "Friend request not found", nil)
			return
		}
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, map[string]any{"status": "accepted"})
}

func (h *FriendHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	query := r.URL.Query().Get("q")
	items, err := h.service.SearchUsersForFriendship(r.Context(), userID, query, 20)
	if err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}
