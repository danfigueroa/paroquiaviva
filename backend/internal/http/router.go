package http

import (
	"net/http"

	"parish-viva/backend/internal/auth"
	"parish-viva/backend/internal/config"
	"parish-viva/backend/internal/http/handlers"
	"parish-viva/backend/internal/http/middleware"
	"parish-viva/backend/internal/services"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"
	"go.uber.org/zap"
)

func NewRouter(cfg config.Config, logger *zap.Logger, service *services.Service) http.Handler {
	r := chi.NewRouter()
	validator := auth.NewValidator(cfg.JWTIssuer, cfg.JWKSURL, cfg.JWKSCacheTTL)

	healthHandler := handlers.NewHealthHandler()
	profileHandler := handlers.NewProfileHandler(service)
	prayerHandler := handlers.NewPrayerHandler(service, cfg.PrayedWindowHours)
	moderationHandler := handlers.NewModerationHandler()

	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(logger))
	r.Use(httprate.LimitByIP(cfg.RateLimitRequests, cfg.RateLimitWindow))

	r.Get("/health", healthHandler.GetHealth)

	r.Route("/api/v1", func(api chi.Router) {
		api.With(middleware.OptionalAuth(validator)).Get("/feed", prayerHandler.ListPublic)

		api.Group(func(protected chi.Router) {
			protected.Use(middleware.RequireAuth(validator))
			protected.Get("/profile", profileHandler.GetProfile)
			protected.Patch("/profile", profileHandler.UpdateProfile)

			protected.Post("/requests", prayerHandler.Create)
			protected.Post("/requests/{id}/pray", prayerHandler.Pray)
			protected.Get("/moderation/queue", moderationHandler.Queue)
		})
	})

	return r
}
