# Copilot instructions for joshper-server-2

This file gives concise, actionable guidance to an AI coding agent working in this repository.

1. Project overview
- Full-stack Next.js (app router) frontend in [app](app) with server/client components; API handlers live in the repository `api/` folder (server code). The UI primitives and page components are in [components](components) and [components/ui](components/ui).
- Database/backups: development uses a local file `joshper.db` and `better-sqlite3` for local runs; production code integrates Postgres (see `lib/pg.ts`, `lib/postgres.ts`) and SQL migrations in [sql](sql) and [scripts](scripts).

2. Key workflows / commands
- Run development server (host 0.0.0.0): `npm run dev` (reads `.env`). See [package.json](package.json#L1).
- Build for production: `npm run build` then `npm run start` (or `npm run start:prod` to use port 3000).
- Backup DB: `npm run backup` which calls `scripts/backup.sh`.
- Docker & deployment: there is a `Dockerfile` and `docker-compose.yml`; nginx configs are in [nginx](nginx).

3. Common edit targets and conventions
- UI work: change shared components in [components/ui](components/ui). Production-facing pages live in [app](app) and use React Server Components — add `"use client"` at the top of a file when you need client-side hooks or state.
- API and server logic: edit route handlers in [api](api) and server helpers in [lib](lib). Authentication helpers live in [lib/auth.ts]. JWTs and `jsonwebtoken` are used for auth workflows.
- Database migrations & seeding: SQL schema and seeds are under [sql](sql) and [scripts/*.sql]. Use the scripts in [scripts](scripts) to reproduce DB changes locally.
- File uploads: Cloudinary integration exists in [lib/cloudinary.ts] and uploaded assets are stored under [public/uploads](public/uploads).

4. Notable patterns and gotchas
- Mixed DB drivers: repository contains `better-sqlite3` and `pg` / `@neondatabase/serverless`. Be careful when changing DB code — check `lib/pg.ts` and `lib/postgres.ts` for connection semantics and environment guards.
- No test harness present: there are no `test` scripts in `package.json`. Changes should be validated locally by running the app and exercising affected endpoints.
- Logging: `lib/logger.ts` uses `winston`; prefer structured logs for server-side changes.

5. File and feature pointers (examples)
- Edit UI primitives: [components/ui/alert.tsx](components/ui/alert.tsx)
- Auth helpers: [lib/auth.ts](lib/auth.ts)
- DB helpers: [lib/pg.ts](lib/pg.ts) and [lib/postgres.ts](lib/postgres.ts)
- SQL migrations: [sql/01-create-database.pg.sql](sql/01-create-database.pg.sql)
- Backup script: [scripts/backup.sh](scripts/backup.sh)

6. Style and PR guidance for AI edits
- Keep changes minimal and focused (small PRs). Update both server and UI when endpoints or shapes change.
- Respect `app/` server/client boundaries: prefer server components unless UI interactivity requires `use client`.
- When adding environment variables, add them to `.env` and `.env.production` and reference `process.env` via `lib/*` helpers where appropriate.

7. When in doubt / follow-up
- If the DB mode is ambiguous for a change, ask whether to target SQLite (local) or Postgres/Neon (production). Running `npm run dev` will use local DB files.
- If you need to run migrations or seed data, refer to SQL files in [sql](sql) and `scripts/*.sql`.

If anything here is unclear or you'd like more detail about a specific subsystem (auth, DB, uploads, deployment), tell me which area to expand.
