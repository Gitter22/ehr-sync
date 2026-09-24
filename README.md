# EHR Sync

## Project Overview

EHR Sync pulls sandbox patient data from EHR developer APIs (HAPI FHIR R4, Cerner/Oracle Health,
and optionally Epic), stores it in its own PostgreSQL database, and presents it through a web
dashboard. There is no external sync target — "Oracle Health" (formerly Cerner) is one of the EHR
_sources_ this app pulls from, not a destination system it writes to. See
`specs/requirements.txt` for the full business requirements.

**This repository is currently a scaffold only.** It contains no FHIR or domain-specific logic
yet — just a working, deployable three-service architecture (React, Node API, Python service)
sharing a PostgreSQL database, wired together and proven end-to-end with a connectivity smoke
test. Business logic is intentionally deferred until this foundation is in place.

## Architecture

```
React (apps/web)
  │  Axios, TanStack Query
  ▼
Node API (apps/api)  ── Express 5, TypeScript
  │  Prisma           │  Axios
  ▼                   ▼
PostgreSQL 16   Python service (apps/python) ── FastAPI, uv
                      │  httpx / asyncpg
                      ▼
                PostgreSQL 16 (same database)
```

- **apps/web** calls the Node API over HTTP (via `VITE_API_URL`).
- **apps/api** is the primary backend: it owns most HTTP traffic from the browser, talks to
  PostgreSQL via Prisma, and calls the Python service over HTTP for anything Python-specific.
- **apps/python** is a separate service with its own PostgreSQL access (via `asyncpg`), reserved
  for the future Oracle Health (Cerner) sandbox _pull_ integration — fetching patients, conditions,
  and medications from that vendor's API, the same way `apps/api` will fetch from HAPI FHIR. It
  also makes outbound HTTP calls to external services.
- **PostgreSQL** is shared: both Node (via Prisma) and Python (via `asyncpg`) connect to it
  directly. Neither service owns the database exclusively.

### Future architecture (not implemented yet)

```
Node API  → HAPI FHIR sandbox (pull patients, conditions, medications)
Python    → Oracle Health (Cerner) sandbox (pull patients, conditions, medications)
              [Epic sandbox is a stretch goal, likely also owned by Node]
```

Both are **pull** integrations — data flows from the EHR vendor sandbox into this app's own
PostgreSQL, never out to an external system. The Node API owns the HAPI FHIR integration
(pagination, rate limits, dedupe on re-sync); the Python service owns the Oracle Health/Cerner
integration for the same reasons. Both write to the same PostgreSQL database, which is why the
scaffold proves that shared-database access up front.

## Repository Structure

```
apps/
  web/                React 18 + TypeScript frontend (Vite)
  api/                Node 24 + Express 5 API (TypeScript)
  python/             FastAPI service, managed with uv
generated/
  prisma/             Generated Prisma Client (gitignored, regenerated via `npm run prisma:generate`)
prisma/
  schema.prisma        Prisma schema (root-level, shared by the whole repo)
  migrations/           SQL migration history
  seed.ts               Database seed script
  reference-data/        Static reference data for future seeding
specs/
  requirements.txt      Original business requirements (not yet implemented)
docker-compose.yml       Local orchestration for postgres/api/python/web
Dockerfile.web / .api / .python   Multi-stage production Docker builds per service
fly.web.toml / fly.api.toml / fly.python.toml   Independent Fly.io app configs
```

Each service under `apps/` is deployed as an independent Fly.io app, while Docker Compose remains
the local-development orchestrator only.

## Technology Stack

| Layer          | Technology                                                              | Notes                                                                            |
| -------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Frontend       | React 18, TypeScript, Vite                                              | React 19 was what `create-vite` scaffolds by default; pinned back to 18 per spec |
| UI             | MUI v9, Emotion, React Router v7, TanStack Query, Axios, Zustand        | MUI is the primary UI system; Zustand only holds the smoke-test result           |
| Node API       | Node.js 24, Express 5, TypeScript                                       | strict TypeScript, compiled to CommonJS                                          |
| Python service | Python 3.12, FastAPI, Uvicorn, uv, httpx, asyncpg                       | `uv` manages the venv and lockfile                                               |
| Database       | PostgreSQL 16, Prisma 6                                                 | Prisma config lives at the repo root; Python accesses the same DB via `asyncpg`  |
| Tooling        | ESLint 9 + typescript-eslint, Prettier, Ruff, mypy, Husky + lint-staged | one JS/TS lint+format toolchain, one Python toolchain                            |
| Deployment     | Fly.io (Docker-based), one app per service                              | not Vercel                                                                       |

TypeScript is pinned to a single `^5.7` line at the workspace root (not TypeScript 7, which isn't
yet broadly compatible with this ecosystem) and is shared by both `apps/web` and `apps/api`.

## Local Development

### Prerequisites

- Node.js 24+ and npm 11+
- Python 3.12+ and [`uv`](https://docs.astral.sh/uv/)
- PostgreSQL 16 (via Docker, or installed locally)
- Docker + Docker Compose (optional, for the full containerized stack)

### Install dependencies

```bash
npm install                 # installs apps/web + apps/api (npm workspaces)
cd apps/python && uv sync   # installs the Python service
```

### Environment setup

```bash
cp .env.example .env
```

Edit `.env` as needed. See [Environment Variables](#environment-variables) below for what each
variable does and how it differs between Docker and local Postgres.

### PostgreSQL options

**Option A — Docker Compose Postgres only:**

```bash
docker compose up postgres -d
```

Use `DATABASE_URL=postgresql://ehr_sync:ehr_sync@localhost:5432/ehr_sync` in `.env` (the Compose
service publishes port 5432 to the host).

**Option B — a Postgres installed directly on your machine:**

Set `DATABASE_URL` to point at it, e.g.
`postgresql://ehr_sync:ehr_sync@localhost:5432/ehr_sync`, using whatever user/password/port your
local install uses. Create the `ehr_sync` database and role yourself if they don't already exist.

Either way, **inside Docker containers**, services reach Postgres via the Compose service name
(`postgres`), not `localhost` — `localhost` inside a container refers to that same container, not
the host machine or a sibling container.

### Running services independently (no Docker)

```bash
npm run prisma:migrate      # apply migrations to your local/Docker Postgres
npm run prisma:generate     # regenerate the Prisma Client into generated/prisma
npm run prisma:seed         # optional: seed data

npm run dev:api             # Node API on http://localhost:3000
npm run dev:python          # Python service on http://localhost:8000
npm run dev:web             # React app on http://localhost:5173
```

In `.env`, make sure `PYTHON_SERVICE_URL=http://localhost:8000` and
`VITE_API_URL=http://localhost:3000` for local (non-Docker) runs — set these explicitly in `.env`,
since `.env.example` intentionally ships with empty values, not working defaults.

### Running the full stack with Docker Compose

```bash
docker compose up --build
```

This builds and starts `postgres`, runs Prisma migrations via a one-shot `migrate` service, then
starts `api`, `python`, and `web`. The web app is served on `http://localhost:5173`, the API on
`http://localhost:3000`, and the Python service on `http://localhost:8000`.

### Database migrations, Prisma generation, and seeding

```bash
npm run prisma:migrate          # create/apply a migration in development
npm run prisma:migrate:deploy   # apply existing migrations (CI/production)
npm run prisma:generate         # regenerate the client into generated/prisma
npm run prisma:seed             # run prisma/seed.ts
npm run prisma:validate         # validate schema.prisma
```

The generated Prisma Client lives at `generated/prisma` (not inside `apps/api`) and is gitignored
— regenerate it after installing or after any schema change.

## Environment Variables

- `.env` — your local values; **never commit this file** (it's gitignored).
- `.env.example` — variable names and safe placeholders only; keep this in sync when adding new
  variables.

Server-only variables (`DATABASE_URL`, `PYTHON_SERVICE_URL`, `CORS_ORIGIN`, etc.) are read by the
Node API and Python service and are never exposed to the browser. Only `VITE_`-prefixed variables
(currently just `VITE_API_URL`) are bundled into the frontend — never put secrets there, since
Vite exposes them to anyone who loads the page.

## Available Commands

Run from the repo root unless noted otherwise.

| Command                                                      | Purpose                                                                             |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `npm run dev:web` / `npm run dev:api` / `npm run dev:python` | Run one service in dev mode                                                         |
| `npm run build`                                              | Build `apps/web` and `apps/api` for production                                      |
| `npm run lint` / `npm run lint:fix`                          | ESLint across the JS/TS workspace                                                   |
| `npm run format` / `npm run format:check`                    | Prettier across the whole repo                                                      |
| `npm run typecheck`                                          | TypeScript project checks for both apps                                             |
| `npm run prisma:*`                                           | See [Database migrations](#database-migrations-prisma-generation-and-seeding) above |
| `npm run check`                                              | Full validation pipeline: lint, format check, typecheck, build, Prisma validate     |
| `cd apps/python && uv run ruff check .`                      | Python lint                                                                         |
| `cd apps/python && uv run ruff format .`                     | Python format                                                                       |
| `cd apps/python && uv run mypy app`                          | Python type check                                                                   |
| `cd apps/python && uv run pytest`                            | Python tests                                                                        |

Husky runs `lint-staged` (ESLint + Prettier on staged files) on every commit.

## Docker Architecture

| Service    | Image                                         | Port (host) | Notes                                                   |
| ---------- | --------------------------------------------- | ----------- | ------------------------------------------------------- |
| `postgres` | `postgres:16-alpine`                          | 5432        | Data persisted in the `postgres_data` named volume      |
| `migrate`  | built from `Dockerfile.api` (`build` stage)   | —           | One-shot: runs `prisma migrate deploy`, then exits      |
| `api`      | built from `Dockerfile.api`                   | 3000        | Waits on `postgres` (healthy) and `python` (healthy)    |
| `python`   | built from `Dockerfile.python`                | 8000        | Waits on `postgres` (healthy)                           |
| `web`      | built from `Dockerfile.web`, served via nginx | 5173 → 80   | `VITE_API_URL` is baked in at build time as a build arg |

Containers reach each other by Compose service name (`postgres`, `python`, `api`); the browser
reaches `web` and `api` via the host-published ports (`localhost:5173`, `localhost:3000`) since
browser JavaScript cannot resolve Compose's internal DNS.

## Smoke Test

The home page (`http://localhost:5173`) has a **"Run EHR Sync Connectivity Test"** button. It
triggers this chain:

1. React calls `POST /api/connectivity-check` on the Node API.
2. Node API writes a row to PostgreSQL via Prisma.
3. Node API calls the Python service's `POST /connectivity-check`.
4. Python service makes an outbound HTTP request (proves the async HTTP client works), then writes
   a row to PostgreSQL via `asyncpg`.
5. Python returns its result to Node.
6. Node combines its own result with Python's and returns the combined response.
7. React renders both results plus an overall status.

Health checks are also available directly: `GET /health` on both the Node API (port 3000) and the
Python service (port 8000).

## Fly.io Deployment

Each service is deployed as an **independent Fly.io app** (Fly doesn't run Docker Compose
directly), using Docker-based builds:

- `fly.api.toml` → `ehr-sync-api`, built from `Dockerfile.api`
- `fly.python.toml` → `ehr-sync-python`, built from `Dockerfile.python`
- `fly.web.toml` → `ehr-sync-web`, built from `Dockerfile.web` (nginx serving the static build;
  `VITE_API_URL` is passed as a Fly build arg pointing at the deployed API's public URL)

`fly.api.toml` sets `[deploy] release_command = "npx prisma migrate deploy ..."`, so migrations run
automatically before each `ehr-sync-api` deploy takes traffic (Fly's equivalent of the Compose
stack's one-shot `migrate` service) — you don't need to run migrations separately against
production.

Deploy each from the repo root, e.g.:

```bash
fly deploy --config fly.api.toml
fly deploy --config fly.python.toml
fly deploy --config fly.web.toml
```

Use `fly secrets set DATABASE_URL=... PYTHON_SERVICE_URL=...` (per app) for production secrets —
never commit them. A managed Postgres (Fly Postgres or an external provider) is required; it isn't
provisioned by these configs.

## Future Development

The following are intentionally **not implemented** in this scaffold and are where future work
should build on top of it:

- HAPI FHIR R4 pull integration — planned to live in `apps/api/src/services`.
- Cerner/Oracle Health sandbox pull integration — planned to live in `apps/python/app`.
- Epic SMART on FHIR pull integration (stretch goal) — or, if not completed, a written summary of
  how far registration got and what the auth flow looks like, per `specs/requirements.txt`.
- Patient/Condition/Medication data modeling and the sync logic that dedupes on repeated pulls.
- The dashboard UI for toggling between EHRs and viewing a patient's pulled data.

See `specs/requirements.txt` for the full business requirements these will implement.
