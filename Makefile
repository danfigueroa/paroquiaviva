.PHONY: dev

dev:
	@trap 'kill 0' SIGINT; \
	(cd backend && set -a && source .env && set +a && go run ./cmd/api) & \
	(cd frontend && npm run dev) & \
	wait
