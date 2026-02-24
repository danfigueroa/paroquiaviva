package handlers

import (
	"net/http"

	"parish-viva/backend/internal/http/shared"
)

type ModerationHandler struct{}

func NewModerationHandler() *ModerationHandler {
	return &ModerationHandler{}
}

func (h *ModerationHandler) Queue(w http.ResponseWriter, _ *http.Request) {
	shared.WriteJSON(w, http.StatusOK, map[string]any{"items": []any{}})
}
