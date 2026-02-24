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
	groupHandler := handlers.NewGroupHandler(service)
	friendHandler := handlers.NewFriendHandler(service)

	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(logger))
	r.Use(middleware.CORS(cfg.CORSAllowedOrigins))
	r.Use(httprate.LimitByIP(cfg.RateLimitRequests, cfg.RateLimitWindow))

	r.Get("/health", healthHandler.GetHealth)

	r.Route("/api/v1", func(api chi.Router) {
		api.With(middleware.OptionalAuth(validator)).Get("/feed", prayerHandler.ListPublic)
		api.With(middleware.OptionalAuth(validator)).Get("/feed/public", prayerHandler.ListPublic)
		api.Get("/username-availability", profileHandler.UsernameAvailability)

		api.Group(func(protected chi.Router) {
			protected.Use(middleware.RequireAuth(validator))
			protected.Get("/profile", profileHandler.GetProfile)
			protected.Patch("/profile", profileHandler.UpdateProfile)
			protected.Get("/feed/home", prayerHandler.ListHome)
			protected.Get("/feed/groups", prayerHandler.ListGroupsFeed)
			protected.Get("/feed/friends", prayerHandler.ListFriendsFeed)
			protected.Get("/groups", groupHandler.ListMine)
			protected.Get("/groups/search", groupHandler.Search)
			protected.Post("/groups", groupHandler.Create)
			protected.Post("/groups/{id}/join-requests", groupHandler.RequestJoin)
			protected.Get("/groups/{id}/join-requests", groupHandler.ListJoinRequests)
			protected.Post("/groups/{id}/join-requests/{requestId}/approve", groupHandler.ApproveJoinRequest)
			protected.Get("/friends", friendHandler.ListFriends)
			protected.Get("/friends/requests", friendHandler.ListPendingRequests)
			protected.Post("/friends/requests", friendHandler.SendRequest)
			protected.Post("/friends/requests/{requestId}/accept", friendHandler.AcceptRequest)
			protected.Get("/users/search", friendHandler.SearchUsers)

			protected.Post("/requests", prayerHandler.Create)
			protected.Get("/requests/{id}", prayerHandler.GetByID)
			protected.Patch("/requests/{id}", prayerHandler.Update)
			protected.Delete("/requests/{id}", prayerHandler.Delete)
			protected.Post("/requests/{id}/pray", prayerHandler.Pray)
			protected.Get("/moderation/queue", moderationHandler.Queue)
		})
	})

	return r
}
