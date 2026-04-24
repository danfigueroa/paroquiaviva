package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"parish-viva/backend/internal/auth"
)

func OptionalAuth(validator *auth.Validator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := parseToken(r, validator)
			if ok {
				next.ServeHTTP(w, r.WithContext(applyAuthClaims(r.Context(), claims)))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func RequireAuth(validator *auth.Validator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := parseToken(r, validator)
			if !ok {
				writeUnauthorized(w)
				return
			}
			next.ServeHTTP(w, r.WithContext(applyAuthClaims(r.Context(), claims)))
		})
	}
}

type authClaims struct {
	userID      string
	userEmail   string
	username    string
	displayName string
	tradition   string
}

func applyAuthClaims(ctx context.Context, c authClaims) context.Context {
	ctx = SetContextValue(ctx, ContextKeyUserID, c.userID)
	if c.userEmail != "" {
		ctx = SetContextValue(ctx, ContextKeyUserEmail, c.userEmail)
	}
	if c.username != "" {
		ctx = SetContextValue(ctx, ContextKeyUsername, c.username)
	}
	if c.displayName != "" {
		ctx = SetContextValue(ctx, ContextKeyDisplayName, c.displayName)
	}
	if c.tradition != "" {
		ctx = SetContextValue(ctx, ContextKeyTradition, c.tradition)
	}
	return ctx
}

func parseToken(r *http.Request, validator *auth.Validator) (authClaims, bool) {
	header := r.Header.Get("Authorization")
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return authClaims{}, false
	}
	claims, err := validator.ParseAndValidate(r.Context(), parts[1])
	if err != nil {
		return authClaims{}, false
	}
	sub, _ := claims["sub"].(string)
	if sub == "" {
		return authClaims{}, false
	}
	email, _ := claims["email"].(string)
	username := claimString(claims, "preferred_username")
	displayName := claimString(claims, "name")
	tradition := ""

	if meta, ok := claims["user_metadata"].(map[string]any); ok {
		if username == "" {
			username = anyToString(meta["username"])
		}
		if displayName == "" {
			displayName = anyToString(meta["display_name"])
		}
		if displayName == "" {
			displayName = anyToString(meta["displayName"])
		}
		if tradition == "" {
			tradition = anyToString(meta["tradition"])
		}
	}
	if meta, ok := claims["raw_user_meta_data"].(map[string]any); ok {
		if username == "" {
			username = anyToString(meta["username"])
		}
		if displayName == "" {
			displayName = anyToString(meta["display_name"])
		}
		if displayName == "" {
			displayName = anyToString(meta["displayName"])
		}
		if tradition == "" {
			tradition = anyToString(meta["tradition"])
		}
	}

	return authClaims{
		userID:      sub,
		userEmail:   email,
		username:    username,
		displayName: displayName,
		tradition:   strings.ToUpper(tradition),
	}, true
}

func claimString(claims map[string]any, key string) string {
	value, _ := claims[key]
	return anyToString(value)
}

func anyToString(value any) string {
	s, _ := value.(string)
	return strings.TrimSpace(s)
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
