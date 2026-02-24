# Parish Viva

Parish Viva is a prayer requests wall for parish communities, focused on safe sharing, group-based visibility, and moderation workflows.

## Product Summary

Parish Viva allows users to post prayer requests with privacy controls, engage through an `I prayed` action, and organize requests inside groups with moderation rules.

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

Done:
- Monorepo scaffolding
- Initial backend/frontend build pipeline
- Base migration and auth validator skeleton

Remaining:
- Finalize CI checks (lint + tests + migration check)
- Create deploy skeleton in chosen providers

### Phase 1 MVP

Scope:
- Auth + profile
- Groups + memberships
- Prayer requests for `GROUP_ONLY` and `PRIVATE`
- `I prayed` with time-window anti-abuse
- Basic moderation queue approve/reject

Current progress:
- Started and partially scaffolded

### Phase 2 v1

Scope:
- Public feed with mandatory moderation
- Moderation dashboard, audit logs, bans
- Notifications (email + in-app)
- Search and pagination

Current progress:
- Planned only

### Phase 3 v2

Scope:
- Comments with moderation
- Advanced privacy controls
- Group analytics
- Export and data deletion flows

Current progress:
- Planned only

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
