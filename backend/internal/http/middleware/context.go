package middleware

import "context"

type contextKey string

const (
	ContextKeyRequestID   contextKey = "requestId"
	ContextKeyUserID      contextKey = "userId"
	ContextKeyUserEmail   contextKey = "userEmail"
	ContextKeyUsername    contextKey = "username"
	ContextKeyDisplayName contextKey = "displayName"
)

func SetContextValue[T any](ctx context.Context, key contextKey, value T) context.Context {
	return context.WithValue(ctx, key, value)
}

func GetString(ctx context.Context, key contextKey) string {
	v, _ := ctx.Value(key).(string)
	return v
}
