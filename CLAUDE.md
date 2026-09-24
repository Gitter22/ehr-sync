# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This repo is currently a **scaffold only** — three services wired together and proven end-to-end
with a connectivity smoke test, but no FHIR/domain logic yet. See `specs/requirements.txt` for the
business requirements this will eventually implement: pull patient/condition/medication data from
HAPI FHIR R4, Cerner/Oracle Health, and optionally Epic sandboxes, store it in this app's own
PostgreSQL, and present it in a dashboard. **There is no external sync target** — "Oracle Health"
(formerly Cerner) is one of the EHR vendors this app pulls _from_, not a destination system it
writes _to_. Do not assume domain models, vendor integrations, or auth exist — they don't yet.

## Commands

Run from the repo root unless noted.

```bash
npm install                          # installs apps/web + apps/api (npm workspaces)
cd apps/python && uv sync            # installs the Python service (separate from npm workspaces)

npm run dev:web                      # http://localhost:5173
npm run dev:api                      # http://localhost:3000
npm run dev:python                   # http://localhost:8000 (root-level wrapper: cd apps/python && uv run uvicorn ...)

npm run build                        # builds apps/web then apps/api
npm run typecheck                    # tsc --noEmit for both apps
npm run lint / npm run lint:fix      # ESLint across web+api (apps/python is excluded)
npm run format / npm run format:check  # Prettier across the whole repo
npm run check                        # full pipeline: lint, format:check, typecheck, build, prisma:validate, check:python
npm run check:python                 # ruff check, ruff format --check, mypy (in apps/python)

npm run prisma:generate              # regenerate client into generated/prisma (gitignored)
npm run prisma:migrate               # create + apply a dev migration
npm run prisma:migrate:deploy        # apply existing migrations (CI/prod)
npm run prisma:seed                  # run prisma/seed.ts
npm run prisma:validate              # validate prisma/schema.prisma

docker compose up --build            # full stack: postgres, migrate (one-shot), api, python, web
```

There is no test runner wired up yet (`npm run test` is a no-op `--if-present` passthrough, and
`apps/python` has `pytest` as a dev dependency but no tests). When adding the first test, wire a
real `test` script into the relevant `package.json` / add a `test` target under `check`.

### Single-package commands

`apps/web` and `apps/api` are npm workspaces — run their scripts directly with
`npm run <script> --workspace apps/web` (or `apps/api`), or `cd` into the package first.
`apps/python` is **not** an npm workspace; always `cd apps/python` before any `uv run ...`.

## Architecture

```
apps/web  →  apps/api  →  PostgreSQL (Prisma)
                ↓
           apps/python  →  same PostgreSQL (asyncpg)
```

- **Shared database, not shared ownership.** Both `apps/api` (via Prisma) and `apps/python` (via
  `asyncpg`) connect directly to the same PostgreSQL instance. Neither service proxies DB access
  through the other — this is deliberate so both the future HAPI FHIR pull (Node) and the future
  Oracle Health/Cerner pull (Python) can each own their own writes into the shared schema. Both are
  _pull_ integrations into this app's own database — nothing is synced out to an external system.
- **Prisma lives at the repo root, not inside `apps/api`.** Schema: `prisma/schema.prisma`.
  Generated client output: `generated/prisma` (gitignored, regenerate after install or schema
  changes). Config: `prisma.config.ts` at root (Prisma 6's config-file approach, not
  `package.json#prisma`). `apps/api/src/lib/prisma.ts` imports the client via a relative path
  (`../../../../generated/prisma`) — there is no `@prisma/client` package-based import. If you move
  any file in `apps/api/src`, that relative depth must stay correct (dist mirrors src, so the same
  relative path works after `tsc` builds it into `apps/api/dist`).
- **`apps/api` compiles to CommonJS**, not ESM — `apps/api/package.json` has no `"type": "module"`
  (unlike the repo root, which does, for `prisma.config.ts`/`prisma/seed.ts`), and
  `apps/api/tsconfig.json` overrides the root `tsconfig.base.json`'s `NodeNext` module settings
  with `"module": "CommonJS"` / `"moduleResolution": "Node"`. Relative imports inside `apps/api/src`
  have **no `.js` extension** (classic Node resolution, unlike NodeNext's ESM rules) — don't add one
  back. `config/env.ts` uses `__dirname` (CJS-native) rather than `import.meta.url` for this reason
  — `import.meta` isn't valid under a CommonJS `module` target.
- **`apps/api` is modular Express 5**: `app.ts` (Express app + middleware wiring) is separate from
  `server.ts` (just calls `app.listen`) — keep that split when adding routes. Layout:
  `src/{config,controllers,middleware,routes,services,lib}`. `config/env.ts` is the only place
  that reads `process.env` — a `required()` helper throws at startup if a required var is missing.
  Route → controller → service is the flow (see `routes/connectivity.ts` →
  `controllers/connectivityController.ts` → `services/connectivityService.ts` for the reference
  shape).
- **`apps/api` talks to `apps/python` over HTTP**, not a shared library — `services/pythonClient.ts`
  wraps an Axios instance pointed at `PYTHON_SERVICE_URL`. Any new Node→Python capability should go
  through a similar client wrapper, not ad-hoc Axios calls in controllers.
- **`apps/python` is FastAPI with a small module-per-concern layout**: `config.py` (pydantic
  Settings, fails fast on missing `DATABASE_URL`), `db.py` (asyncpg pool, one function per query),
  `http_client.py` (outbound HTTP abstraction — no raw `curl`/shell calls), `schemas.py` (pydantic
  response models), `main.py` (routes only). Uses FastAPI's `lifespan` context manager (not the
  deprecated `@app.on_event`) to close the asyncpg pool on shutdown.
- **`apps/web` structure**: `api/` (Axios client instance + one function per endpoint — components
  never call Axios directly), `store/` (Zustand, used sparingly — currently just holds the last
  smoke-test result), `theme/` (MUI `createTheme`), `routes/` (React Router route table),
  `pages/`. TanStack Query wraps the Axios calls from `api/` in components. MUI v9 is the UI system
  — prefer MUI components over raw HTML elements (see `src/pages/HomePage.tsx` for the pattern).
- **Environment variables** are documented in `.env.example` at the root; `apps/python` also loads
  the root `.env` (via `pydantic-settings`' `env_file="../../.env"`, relative to
  `apps/python` as cwd). Only `VITE_`-prefixed vars reach the browser bundle — never add secrets
  there. Inside Docker Compose, services reach each other by service name (`postgres`, `python`,
  `api`), never `localhost` — `localhost` inside a container means that container.
- **Each service deploys to Fly.io independently** (`fly.api.toml`, `fly.python.toml`,
  `fly.web.toml` at the repo root) since Fly doesn't run Docker Compose; Compose is local-dev-only
  orchestration. `apps/web`'s `VITE_API_URL` is baked in at Docker build time via a build arg
  (`fly.web.toml`'s `[build.args]`), since Vite env vars are compile-time, not runtime.

## Conventions worth knowing before editing

- TypeScript is pinned to a single `^5.7` line at the workspace root — don't add a per-package
  `typescript` devDependency to `apps/web` or `apps/api`; it hoists from root.
- ESLint config (`eslint.config.mjs`) ignores `apps/python/**` entirely — Python linting is Ruff,
  configured in `apps/python/pyproject.toml`, run via `npm run check:python`.
- Husky's pre-commit hook runs `lint-staged` (ESLint --fix + Prettier --write on staged files).
- The `ConnectivityCheck` Prisma model exists **only** to prove Node↔Postgres↔Python connectivity
  for the smoke test — it is not a domain table. When real domain models (Patient, Condition,
  Medication, etc.) are added, they go in `prisma/schema.prisma` alongside it; don't repurpose
  `ConnectivityCheck` for anything else.
- Prisma's config-based CLI (`prisma.config.ts`) does not auto-load `.env` the way the old
  `package.json#prisma` config did — `prisma.config.ts` explicitly calls `dotenv`'s `config()` for
  this reason. Keep that import if you touch the file.
