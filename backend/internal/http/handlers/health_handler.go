package handlers

import (
	"net/http"

	"parish-viva/backend/internal/http/shared"
)

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

func (h *HealthHandler) GetHealth(w http.ResponseWriter, _ *http.Request) {
	shared.WriteJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}
