package config

import (
	"errors"
	"os"
	"strconv"
	"time"
)

type Config struct {
	HTTPAddr             string
	DatabaseURL          string
	JWTIssuer            string
	JWKSURL              string
	JWKSCacheTTL         time.Duration
	RateLimitRequests    int
	RateLimitWindow      time.Duration
	PrayedWindowHours    int
	PrayedIPBurstPerHour int
}

func Load() (Config, error) {
	cfg := Config{
		HTTPAddr:             envOrDefault("HTTP_ADDR", ":8080"),
		DatabaseURL:          os.Getenv("DATABASE_URL"),
		JWTIssuer:            os.Getenv("JWT_ISSUER"),
		JWKSURL:              os.Getenv("JWKS_URL"),
		JWKSCacheTTL:         durationOrDefault("JWKS_CACHE_TTL", 10*time.Minute),
		RateLimitRequests:    intOrDefault("RATE_LIMIT_REQUESTS", 120),
		RateLimitWindow:      durationOrDefault("RATE_LIMIT_WINDOW", time.Minute),
		PrayedWindowHours:    intOrDefault("PRAYED_WINDOW_HOURS", 12),
		PrayedIPBurstPerHour: intOrDefault("PRAYED_IP_BURST_PER_HOUR", 200),
	}
	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}
	if cfg.JWTIssuer == "" {
		return Config{}, errors.New("JWT_ISSUER is required")
	}
	if cfg.JWKSURL == "" {
		return Config{}, errors.New("JWKS_URL is required")
	}
	return cfg, nil
}

func envOrDefault(key, value string) string {
	v := os.Getenv(key)
	if v == "" {
		return value
	}
	return v
}

func intOrDefault(key string, value int) int {
	v := os.Getenv(key)
	if v == "" {
		return value
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return value
	}
	return i
}

func durationOrDefault(key string, value time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return value
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return value
	}
	return d
}
