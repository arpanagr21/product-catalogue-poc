# Agent instructions

Product catalogue PoC: Laravel 13 API (`backend/`) + React/TypeScript SPA (`frontend/`), run with Docker Compose.
Read README.md (architecture) and DECISIONS.md (why) before changing structure.

## Environment
- Everything runs in Docker. Do not install PHP/Composer on the host. Use `docker compose exec backend …` / `docker compose exec frontend …`.
- Config comes from `docker-compose.yml` env (defaults) and the optional root `.env`. The backend has no `.env.example` of its own; don't add one.
- Use `localhost`, never `127.0.0.1` (Sanctum cookies).

## Commands
- Backend tests: `docker compose exec backend php artisan test`
- Frontend tests: `docker compose exec frontend npm test` · types: `npm run typecheck` · lint: `npx oxlint`
- Run both suites before committing. Tests must never hit the network (backend: `Http::preventStrayRequests`; frontend: MSW `onUnhandledFrame: 'error'`).

## Architecture rules
- Backend layout: `app/Contracts/ProductProvider` (the one interface) → `app/ProductProviders/*` (implementations) → `app/Services/ProductService` (what controllers use) → `app/Data` (Product, Category) and `app/Exceptions`.
- Controllers only call `ProductService`. Only files in `app/ProductProviders/` may know about Fake Store. Providers are chosen by the name→class map in `config/catalogue.php` (`CATALOGUE_PROVIDER`, falls back to Fake Store), bound in `AppServiceProvider::register()`. Keep it that simple; no extra service provider classes.
- Controllers stay thin: validation in FormRequests; the JSON shape comes from `Product`/`Category::jsonSerialize`. Upstream failures throw `CatalogueUnavailableException`.
- Frontend: only `src/lib/api/client.ts` calls `fetch`. Services wrap the client; React Query hooks in `src/hooks/queries.ts` wrap services; components use hooks.
- Keep `src/types/catalogue.ts` in sync with `app/Data/*::jsonSerialize`.
- Prefer simple over clever: add an abstraction only when there is a second implementation or a real reuse. Keep DRY via shared components (`QueryState`, `FormField`, `ProductGrid`) and helpers (`applyServerErrors`).
- UI uses shadcn/ui components from `src/components/ui` (add new ones with `npx shadcn@latest add <name>`).

## Conventions
- Commits: small, imperative subject, body explains why.
- Record new assumptions or cuts in DECISIONS.md.
