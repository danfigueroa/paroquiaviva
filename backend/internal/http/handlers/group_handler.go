package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"parish-viva/backend/internal/http/middleware"
	"parish-viva/backend/internal/http/shared"
	"parish-viva/backend/internal/models"
	"parish-viva/backend/internal/repositories"
	"parish-viva/backend/internal/services"
)

type GroupHandler struct {
	service *services.Service
}

type createGroupRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	ImageURL    *string `json:"imageUrl"`
	JoinPolicy  string  `json:"joinPolicy"`
}

func NewGroupHandler(service *services.Service) *GroupHandler {
	return &GroupHandler{service: service}
}

func (h *GroupHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	items, err := h.service.ListUserGroups(r.Context(), userID)
	if err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *GroupHandler) Search(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	query := r.URL.Query().Get("q")
	items, err := h.service.SearchGroupsByName(r.Context(), userID, query, 20)
	if err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *GroupHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	var req createGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		shared.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON payload", nil)
		return
	}

	group, err := h.service.CreateGroup(r.Context(), userID, req.Name, req.Description, req.ImageURL, models.GroupJoinPolicy(req.JoinPolicy))
	if err != nil {
		if errors.Is(err, services.ErrInvalidGroupName) || errors.Is(err, services.ErrInvalidGroupDescription) || errors.Is(err, services.ErrInvalidJoinPolicy) {
			shared.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil)
			return
		}
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}

	shared.WriteJSON(w, http.StatusCreated, group)
}

func (h *GroupHandler) RequestJoin(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	groupID := chi.URLParam(r, "id")
	err := h.service.RequestJoinGroup(r.Context(), userID, groupID)
	if err != nil {
		if errors.Is(err, repositories.ErrInviteOnlyGroup) {
			shared.WriteError(w, http.StatusForbidden, "GROUP_INVITE_ONLY", "This group is invite only", nil)
			return
		}
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, map[string]any{"status": "requested"})
}

func (h *GroupHandler) ListJoinRequests(w http.ResponseWriter, r *http.Request) {
	actorUserID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), actorUserID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	groupID := chi.URLParam(r, "id")
	items, err := h.service.ListGroupJoinRequests(r.Context(), actorUserID, groupID)
	if err != nil {
		if errors.Is(err, repositories.ErrGroupAdminRequired) {
			shared.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Group admin access required", nil)
			return
		}
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *GroupHandler) ApproveJoinRequest(w http.ResponseWriter, r *http.Request) {
	actorUserID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), actorUserID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	groupID := chi.URLParam(r, "id")
	requestID := chi.URLParam(r, "requestId")
	err := h.service.ApproveGroupJoinRequest(r.Context(), actorUserID, groupID, requestID)
	if err != nil {
		if errors.Is(err, repositories.ErrGroupAdminRequired) {
			shared.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Group admin access required", nil)
			return
		}
		if errors.Is(err, repositories.ErrJoinRequestNotFound) {
			shared.WriteError(w, http.StatusNotFound, "JOIN_REQUEST_NOT_FOUND", "Join request not found", nil)
			return
		}
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, map[string]any{"status": "approved"})
}
