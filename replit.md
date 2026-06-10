# AquaTrack

A full-stack water filter maintenance and cartridge replacement tracking app with guest mode, optional auth, Arabic/English (RTL) support, dark/light theme, and a hidden admin panel for banner management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/water-tracker run dev` — run the React frontend (port 19144, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `SESSION_SECRET` — password hashing salt (default "salt")
- Optional env: `ADMIN_PIN` — admin panel PIN (default "1234")

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + Tailwind CSS + shadcn/ui + Framer Motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/water-tracker/src/` — React frontend
  - `pages/` — Dashboard, Login, NewFilter, FilterDetail, History, Settings, Admin
  - `components/` — Layout (nav), FilterCard, CartridgeCard, StatusBadge
  - `hooks/` — use-auth.tsx, use-theme.tsx, use-toast.ts
  - `lib/` — i18n.tsx, guest-storage.ts (localStorage CRUD for guest mode), filter-templates.ts
- `artifacts/api-server/src/routes/` — auth, filters, cartridges, replace-all, history, settings, banners
- `artifacts/api-server/src/middlewares/auth.ts` — optionalAuth, requireAdmin
- `lib/db/src/schema.ts` — DB schema (users, filters, cartridges, replacement_records, settings, banners)
- `lib/api-spec/openapi.yaml` — source-of-truth OpenAPI spec
- `lib/api-client-react/src/generated/` — generated React Query hooks + Zod schemas

## Architecture decisions

- **Token-based auth via localStorage**: Token stored as `aquatrack_token`; `setAuthTokenGetter` wired at startup so all generated hooks automatically attach `Authorization: Bearer <token>`.
- **Guest mode**: Full CRUD in `lib/guest-storage.ts` mirrors the API shape using localStorage. Components branch on `isAuthenticated` vs `isGuest` to call API or guest storage.
- **Filter templates**: Pre-defined cartridge sets for 1/3/5/7-stage filters; NewFilter page shows template picker then detail form.
- **Admin panel** at `/admin`: Hidden behind a PIN (env `ADMIN_PIN`, default "1234"). Manages banner ads shown on Dashboard and FilterDetail pages via `x-admin-token` header.
- **Banner system**: 3 positions — `home_top`, `home_bottom`, `filter_detail`. Only enabled banners are returned by the public endpoint.

## Product

- Dashboard: health summary cards, upcoming replacements list, filter cards grid
- Filter detail: per-cartridge progress bars, individual/bulk replace, edit/delete filter, history toggle
- History: searchable full replacement log
- Settings: theme (light/dark/system), language (EN/AR with RTL), notification reminder days, data export/import
- Admin: PIN-protected banner management (create/edit/delete/toggle)
- Auth: register/login with token; guest mode with localStorage

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/db run push` after schema changes before restarting the API server.
- Always run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI spec.
- The banners router is mounted at root level (not `/banners`) in `routes/index.ts` so its paths (`/banners`, `/admin/*`) exactly match the generated API hooks.
- Admin routes use `x-admin-token: <PIN>` header — the frontend stores the PIN as the token after verification.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
