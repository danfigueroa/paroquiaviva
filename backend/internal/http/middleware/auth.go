package middleware

import (
	"encoding/json"
	"net/http"
	"strings"

	"parish-viva/backend/internal/auth"
)

func OptionalAuth(validator *auth.Validator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, userEmail, ok := parseToken(r, validator)
			if ok {
				ctx := SetContextValue(r.Context(), ContextKeyUserID, userID)
				if userEmail != "" {
					ctx = SetContextValue(ctx, ContextKeyUserEmail, userEmail)
				}
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func RequireAuth(validator *auth.Validator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, userEmail, ok := parseToken(r, validator)
			if !ok {
				writeUnauthorized(w)
				return
			}
			ctx := SetContextValue(r.Context(), ContextKeyUserID, userID)
			if userEmail != "" {
				ctx = SetContextValue(ctx, ContextKeyUserEmail, userEmail)
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func parseToken(r *http.Request, validator *auth.Validator) (string, string, bool) {
	header := r.Header.Get("Authorization")
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", "", false
	}
	claims, err := validator.ParseAndValidate(r.Context(), parts[1])
	if err != nil {
		return "", "", false
	}
	sub, _ := claims["sub"].(string)
	if sub == "" {
		return "", "", false
	}
	email, _ := claims["email"].(string)
	return sub, email, true
}

func writeUnauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"error": map[string]any{
			"code":    "UNAUTHORIZED",
			"message": "Authentication is required",
		},
	})
}
