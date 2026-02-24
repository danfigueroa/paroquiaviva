package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"parish-viva/backend/internal/http/middleware"
	"parish-viva/backend/internal/http/shared"
	"parish-viva/backend/internal/models"
	"parish-viva/backend/internal/repositories"
	"parish-viva/backend/internal/services"
)

type PrayerHandler struct {
	service          *services.Service
	prayedWindowHour int
}

type createPrayerRequest struct {
	Title          string   `json:"title"`
	Body           string   `json:"body"`
	Category       string   `json:"category"`
	Visibility     string   `json:"visibility"`
	AllowAnonymous bool     `json:"allowAnonymous"`
	GroupIDs       []string `json:"groupIds"`
}

type updatePrayerRequest struct {
	Title          string   `json:"title"`
	Body           string   `json:"body"`
	Category       string   `json:"category"`
	Visibility     string   `json:"visibility"`
	AllowAnonymous bool     `json:"allowAnonymous"`
	GroupIDs       []string `json:"groupIds"`
}

type prayRequest struct {
	ActionType string `json:"actionType"`
}

func NewPrayerHandler(service *services.Service, prayedWindowHour int) *PrayerHandler {
	return &PrayerHandler{service: service, prayedWindowHour: prayedWindowHour}
}

func (h *PrayerHandler) ListPublic(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, err := h.service.ListPublicPrayerRequests(r.Context(), limit, offset)
	if err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *PrayerHandler) ListHome(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	items, err := h.service.ListHomePrayerRequests(r.Context(), userID, limit, offset)
	if err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *PrayerHandler) ListGroupsFeed(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	items, err := h.service.ListGroupsPrayerRequests(r.Context(), userID, limit, offset)
	if err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *PrayerHandler) ListFriendsFeed(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	items, err := h.service.ListFriendsPrayerRequests(r.Context(), userID, limit, offset)
	if err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *PrayerHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	var req createPrayerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		shared.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON payload", nil)
		return
	}

	prayer, err := h.service.CreatePrayerRequest(r.Context(), models.CreatePrayerRequestInput{
		AuthorID:       userID,
		Title:          req.Title,
		Body:           req.Body,
		Category:       models.PrayerCategory(req.Category),
		Visibility:     models.Visibility(req.Visibility),
		AllowAnonymous: req.AllowAnonymous,
		GroupIDs:       req.GroupIDs,
	})
	if err != nil {
		if errors.Is(err, repositories.ErrGroupAccessDenied) {
			shared.WriteError(w, http.StatusForbidden, "GROUP_ACCESS_DENIED", "You can only post to groups where you are a member", nil)
			return
		}
		if errors.Is(err, services.ErrInvalidCategory) || errors.Is(err, services.ErrInvalidVisibility) {
			shared.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil)
			return
		}
		shared.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil)
		return
	}
	shared.WriteJSON(w, http.StatusCreated, prayer)
}

func (h *PrayerHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	requestID := chi.URLParam(r, "id")
	prayer, err := h.service.GetPrayerRequestByID(r.Context(), userID, requestID)
	if err != nil {
		if errors.Is(err, repositories.ErrPrayerRequestNotFound) {
			shared.WriteError(w, http.StatusNotFound, "REQUEST_NOT_FOUND", "Prayer request not found", nil)
			return
		}
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, prayer)
}

func (h *PrayerHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}

	var req updatePrayerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		shared.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON payload", nil)
		return
	}

	prayer, err := h.service.UpdatePrayerRequest(r.Context(), models.UpdatePrayerRequestInput{
		RequestID:      chi.URLParam(r, "id"),
		EditorID:       userID,
		Title:          req.Title,
		Body:           req.Body,
		Category:       models.PrayerCategory(req.Category),
		Visibility:     models.Visibility(req.Visibility),
		AllowAnonymous: req.AllowAnonymous,
		GroupIDs:       req.GroupIDs,
	})
	if err != nil {
		if errors.Is(err, repositories.ErrGroupAccessDenied) {
			shared.WriteError(w, http.StatusForbidden, "GROUP_ACCESS_DENIED", "You can only post to groups where you are a member", nil)
			return
		}
		if errors.Is(err, repositories.ErrPrayerRequestNotFound) {
			shared.WriteError(w, http.StatusNotFound, "REQUEST_NOT_FOUND", "Prayer request not found", nil)
			return
		}
		if errors.Is(err, services.ErrInvalidCategory) || errors.Is(err, services.ErrInvalidVisibility) || errors.Is(err, services.ErrInvalidTitle) || errors.Is(err, services.ErrInvalidBody) || errors.Is(err, services.ErrGroupIDsRequired) {
			shared.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil)
			return
		}
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, prayer)
}

func (h *PrayerHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	requestID := chi.URLParam(r, "id")
	err := h.service.DeletePrayerRequest(r.Context(), userID, requestID)
	if err != nil {
		if errors.Is(err, repositories.ErrPrayerRequestNotFound) {
			shared.WriteError(w, http.StatusNotFound, "REQUEST_NOT_FOUND", "Prayer request not found", nil)
			return
		}
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, map[string]any{"status": "deleted"})
}

func (h *PrayerHandler) Pray(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetString(r.Context(), middleware.ContextKeyUserID)
	userEmail := middleware.GetString(r.Context(), middleware.ContextKeyUserEmail)
	if err := h.service.EnsureAuthUser(r.Context(), userID, userEmail); err != nil {
		shared.WriteError(w, http.StatusInternalServerError, "USER_SYNC_FAILED", "Could not prepare user profile", nil)
		return
	}
	requestID := chi.URLParam(r, "id")
	var req prayRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	actionType := req.ActionType
	if actionType == "" {
		actionType = string(models.PrayerActionHailMary)
	}
	err := h.service.RecordPrayerAction(r.Context(), userID, requestID, models.PrayerActionType(actionType), h.prayedWindowHour)
	if err != nil {
		if errors.Is(err, repositories.ErrDuplicatePrayedAction) {
			shared.WriteError(w, http.StatusTooManyRequests, "PRAYED_RATE_LIMITED", "You can pray again later for this request", nil)
			return
		}
		if errors.Is(err, services.ErrInvalidPrayerActionType) {
			shared.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid prayer action type", nil)
			return
		}
		shared.WriteError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", nil)
		return
	}
	shared.WriteJSON(w, http.StatusOK, map[string]any{"status": "recorded"})
}
