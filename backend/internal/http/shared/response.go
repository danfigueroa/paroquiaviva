package shared

import (
	"encoding/json"
	"net/http"
)

type ErrorBody struct {
	Error ErrorObject `json:"error"`
}

type ErrorObject struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details map[string]any `json:"details,omitempty"`
}

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func WriteError(w http.ResponseWriter, status int, code, message string, details map[string]any) {
	WriteJSON(w, status, ErrorBody{Error: ErrorObject{Code: code, Message: message, Details: details}})
}
