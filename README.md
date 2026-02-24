# Paróquia Viva

Paróquia Viva is a prayer requests wall for parish communities, focused on safe sharing, group-based visibility, and moderation workflows.

## Product Summary

Paróquia Viva allows users to post prayer requests with privacy controls, engage through an `I prayed` action, and organize requests inside groups with moderation rules.

Core principles:
- Simple architecture and maintainable code
- Real-world production readiness for MVP
- Abuse prevention and moderation auditability

## Tech Stack

- Backend: Go, chi, pgx, handwritten SQL
- Frontend: React, TypeScript, Vite, React Query, Tailwind
- Database and Auth: Supabase Postgres + Supabase Auth
- Migrations: golang-migrate (SQL files)

## Repository Structure

- `backend`
- `backend/cmd/api`
- `backend/internal/config`
- `backend/internal/http`
- `backend/internal/services`
- `backend/internal/repositories`
- `backend/internal/models`
- `backend/internal/auth`
- `backend/internal/db/migrations`
- `frontend`
- `frontend/src/app`
- `frontend/src/pages`
- `frontend/src/components`
- `docs/product-spec.md`

## Current Status

### Implemented

- Base backend scaffold with layered flow: handlers -> services -> repositories
- HTTP middlewares: request id, structured logging, auth, basic rate limiting
- Supabase JWT validation via JWKS with cache
- Initial REST routes scaffold:
  - `GET /health`
  - `GET /api/v1/feed`
  - `GET /api/v1/profile`
  - `PATCH /api/v1/profile`
  - `POST /api/v1/requests`
  - `POST /api/v1/requests/{id}/pray`
  - `GET /api/v1/moderation/queue`
- SQL migration with required core tables and indexes
- Frontend route scaffold for all required pages
- React Query wiring and minimal UI components
- CI workflow for backend and frontend build validation

### Pending

- Full Supabase Auth flow integration in frontend (`/auth` page with real flows)
- Group management endpoints and role enforcement
- Moderation actions endpoints and queue transitions
- Notifications pipeline (email in MVP, in-app in v1)
- Full test suite (unit, integration, e2e)
- Deployment automation

## Development Phases

### Phase 0 Setup

Status: `IN PROGRESS`

Checklist:
- [x] Monorepo with `backend` and `frontend`
- [x] Base backend architecture (`handlers -> services -> repositories`)
- [x] Base frontend routing and API client
- [x] Supabase JWT validation by JWKS
- [x] Initial SQL migration applied in Supabase
- [x] Local run and smoke validation (`/health`, `/feed`, `/profile` unauthorized)
- [x] CI workflow for backend test and frontend build
- [ ] Add backend lint in CI
- [ ] Add frontend lint in CI
- [ ] Add migration check in CI
- [ ] Add deployment skeleton and environment mapping

Technical detail:
- Endpoints currently available:
  - `GET /health`
  - `GET /api/v1/feed`
  - `GET /api/v1/profile`
  - `PATCH /api/v1/profile`
  - `POST /api/v1/requests`
  - `POST /api/v1/requests/{id}/pray`
  - `GET /api/v1/moderation/queue`
- Tables created and active:
  - `users`
  - `groups`
  - `group_memberships`
  - `prayer_requests`
  - `prayer_request_groups`
  - `prayer_request_updates`
  - `prayer_actions`
  - `moderation_queue`
  - `moderation_actions`
  - `bans`
  - `notifications`

Prompt for this phase:
```text
Audit the current monorepo and finalize Phase 0 hardening. Add lint jobs to CI for Go and frontend, add a migration validation step, and create deployment skeleton files for backend and frontend with environment variable mapping. Keep architecture simple and avoid introducing new frameworks.
```

### Phase 1 MVP

Status: `STARTED`

Checklist:
- [ ] Implement Supabase auth flows in frontend (`email/password`, `magic link`, `password reset`)
- [x] Profile endpoints scaffolded
- [ ] Persist and enforce notification preferences in profile API
- [ ] Implement `POST /groups`, `GET /groups/{id}`, `POST /groups/{id}/join`
- [ ] Implement role enforcement for group membership actions
- [x] `POST /api/v1/requests` scaffolded
- [ ] Enforce visibility rules by membership and ownership
- [x] `POST /api/v1/requests/{id}/pray` with anti-abuse window
- [ ] Create moderation queue items on request creation according to rules
- [ ] Implement `approve` and `reject` actions with status transitions
- [ ] Send moderation outcome email events
- [ ] Add unit/integration tests for MVP flows

Technical detail:
- Required endpoints to complete in this phase:
  - `POST /api/v1/groups`
  - `GET /api/v1/groups/{id}`
  - `POST /api/v1/groups/{id}/join`
  - `POST /api/v1/moderation/queue/{id}/approve`
  - `POST /api/v1/moderation/queue/{id}/reject`
- Main tables impacted:
  - `groups`
  - `group_memberships`
  - `prayer_requests`
  - `prayer_request_groups`
  - `moderation_queue`
  - `moderation_actions`

Prompt for this phase:
```text
Implement Phase 1 MVP end-to-end using the existing stack. Complete group creation and membership endpoints, enforce visibility access checks, implement moderation queue approve/reject actions, and wire frontend auth with Supabase (email/password and magic link). Add integration tests for request creation, prayed action rate limit, and moderation transitions.
```

### Phase 2 v1

Status: `PLANNED`

Checklist:
- [ ] Enforce mandatory moderation for all `PUBLIC` requests
- [ ] Build moderation dashboard with queue filters and actions
- [ ] Implement `request_changes`, `remove`, and `ban` flows
- [ ] Persist full moderation audit payloads
- [ ] Implement notifications API (`email + in-app`)
- [ ] Add category search and pagination to feed endpoints
- [ ] Add frontend moderation page with role gating
- [ ] Add e2e coverage for moderation and notifications

Technical detail:
- Endpoints to add:
  - `GET /api/v1/requests/search`
  - `POST /api/v1/moderation/queue/{id}/request-changes`
  - `POST /api/v1/requests/{id}/remove`
  - `POST /api/v1/groups/{id}/bans`
  - `GET /api/v1/notifications`
  - `POST /api/v1/notifications/{id}/read`
- Main tables impacted:
  - `moderation_queue`
  - `moderation_actions`
  - `bans`
  - `notifications`

Prompt for this phase:
```text
Implement Phase 2 v1 moderation and notifications. Add mandatory moderation for public requests, complete moderator action endpoints (request changes, remove, ban), store all moderation audit payloads, and implement notifications listing/read API. Update frontend with moderation dashboard and paginated/searchable feed.
```

### Phase 3 v2

Status: `PLANNED`

Checklist:
- [ ] Add comments on prayer requests with moderation support
- [ ] Add advanced privacy controls per request and group
- [ ] Implement analytics dashboard for group admins
- [ ] Implement account export flow
- [ ] Implement account deletion and data anonymization flow
- [ ] Add retention policy jobs and compliance checks
- [ ] Add e2e scenarios for privacy/export/deletion

Technical detail:
- Endpoints to add:
  - `POST /api/v1/requests/{id}/comments`
  - `GET /api/v1/groups/{id}/analytics`
  - `POST /api/v1/account/export`
  - `POST /api/v1/account/delete`
- Main tables impacted:
  - `prayer_requests`
  - `prayer_actions`
  - `moderation_queue`
  - `moderation_actions`
  - `notifications`
  - `comments` (new)

Prompt for this phase:
```text
Implement Phase 3 v2 focused on growth and compliance. Add moderated comments, privacy controls, analytics for group admins, and account export/deletion flows with anonymization safeguards. Keep implementation simple, with clear service-level rules and integration tests.
```

## Features

### Auth and Profile

- Sign up and sign in with email/password
- Magic link sign in
- Password reset
- Profile fields: `displayName`, `avatarUrl`, notification preferences

### Prayer Requests

- Create request with:
  - `title`
  - `body`
  - `category`: `HEALTH`, `FAMILY`, `WORK`, `GRIEF`, `THANKSGIVING`, `OTHER`
  - `visibility`: `PUBLIC`, `GROUP_ONLY`, `PRIVATE`
  - `allowAnonymous`
- Status lifecycle:
  - `PENDING_REVIEW`
  - `ACTIVE`
  - `CLOSED`
  - `ARCHIVED`
  - `REMOVED`
- Append-only updates timeline

### Engagement

- `I prayed` action with counter + per-user history
- Anti-abuse window: one action per user per request each 12 hours

### Groups and Moderation

- Groups with join policy: `OPEN`, `REQUEST`, `INVITE_ONLY`
- Membership roles: `MEMBER`, `MODERATOR`, `ADMIN`
- Moderation queue and audit logs
- Group bans

## Prerequisites

- Go 1.22+
- Node.js 20+
- npm 10+
- Supabase project (database + auth)
- Optional for migrations: `migrate` CLI

## Environment Setup

### Backend

1. Copy env template:

```bash
cp backend/.env.example backend/.env
```

2. Configure `backend/.env`:

- `HTTP_ADDR`
- `DATABASE_URL`
- `JWT_ISSUER`
- `JWKS_URL`
- `JWKS_CACHE_TTL`
- `RATE_LIMIT_REQUESTS`
- `RATE_LIMIT_WINDOW`
- `PRAYED_WINDOW_HOURS`
- `PRAYED_IP_BURST_PER_HOUR`

`DATABASE_URL`, `JWT_ISSUER`, and `JWKS_URL` are required.

### Frontend

1. Copy env template:

```bash
cp frontend/.env.example frontend/.env
```

2. Configure `frontend/.env`:

- `VITE_API_BASE_URL`

Default local value:
- `http://localhost:8080/api/v1`

## Install Dependencies

### Backend

```bash
cd backend
go mod tidy
```

### Frontend

```bash
cd frontend
npm install
```

## Database Migrations

Migration files are in:
- `backend/internal/db/migrations`

Example with `golang-migrate`:

```bash
migrate -path backend/internal/db/migrations -database "$DATABASE_URL" up
```

## Run Locally

### Run backend and frontend together

From repository root:

```bash
(cd backend && set -a && source .env && set +a && GOCACHE=/tmp/go-build go run ./cmd/api) & (cd frontend && npm run dev) & sleep 6 && curl -i http://localhost:8080/health && curl -i http://localhost:8080/api/v1/feed && wait
```

### Run separately

Backend:

```bash
cd backend
set -a && source .env && set +a
GOCACHE=/tmp/go-build go run ./cmd/api
```

Frontend:

```bash
cd frontend
npm run dev
```

## Build and Test

### Backend tests

```bash
cd backend
GOCACHE=/tmp/go-build go test ./...
```

### Frontend build

```bash
cd frontend
npm run build
```

## API Error Contract

All API errors follow:

```json
{
  "error": {
    "code": "STRING_ENUM",
    "message": "English message",
    "details": {}
  }
}
```

## Security Notes

- JWT validation uses Supabase JWKS and issuer check
- Request id and structured logs enabled
- Basic IP rate limit middleware enabled
- `I prayed` anti-abuse time window enabled

## Product And Technical Specification

See full specification:
- `docs/product-spec.md`

## Immediate Next Steps

1. Implement real auth handlers and frontend auth integration with Supabase session SDK.
2. Implement groups endpoints and role-based authorization checks.
3. Implement moderation action endpoints with audit log writes.
4. Add integration tests for prayer creation, moderation transitions, and prayed window behavior.
5. Deploy MVP skeleton: frontend on Vercel, backend on Render or Railway, DB/Auth on Supabase.
