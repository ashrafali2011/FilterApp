# Asset Manager

![Package Manager](https://img.shields.io/badge/package%20manager-pnpm-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

A pnpm workspace for building asset management tooling, including a backend API server, a React-based admin interface, and a UI mockup sandbox.

## What this project does--

This repository is a monorepo for asset management and UI prototyping:

- `artifacts/api-server`: Express-based backend for authentication, filters, cartridge management, history, settings, and banners.
- `artifacts/water-tracker`: React/Vite frontend for filtering, history, admin controls, and application settings.
- `artifacts/mockup-sandbox`: UI prototyping sandbox for mockup canvas and component previews.
- `lib/api-zod`: Shared Zod schema package for type-safe API contracts.
- `lib/api-client-react`: Reusable React Query client helpers for frontend API integration.
- `lib/api-spec`: API schema and OpenAPI contract definitions.

## Why this project is useful

- Centralizes backend and frontend packages in a single workspace.
- Provides shared type-safe API schema and client layers for consistent integration.
- Supports rapid local development with package-level `dev` scripts.
- Helps teams build, validate, and preview UI workflows while maintaining an Express API backend.

## Workspace structure

- `package.json` — root workspace scripts and dependency management.
- `pnpm-workspace.yaml` — defines workspace packages and centralized dependency catalog.
- `artifacts/api-server` — backend service with `/api` route handlers.
- `artifacts/water-tracker` — main admin frontend.
- `artifacts/mockup-sandbox` — UI mockup canvas sandbox.
- `lib/api-client-react` — shared React client utilities.
- `lib/api-zod` — shared validation and API schema package.
- `lib/api-spec` — OpenAPI definitions and API contract sources.
- `scripts` — developer tooling scripts.

## Getting started

### Prerequisites

- Node.js (recommended 18+)
- pnpm
- Unix-like shell support for workspace scripts on Windows (Git Bash, WSL, or compatible shell)

### Install dependencies

```bash
cd Asset-Manager
pnpm install
```

### Run workspace checks

```bash
pnpm run typecheck
pnpm run build
```

### Start services locally

#### API server

```bash
cd artifacts/api-server
export PORT=3000
pnpm dev
```

> On Windows, run this in Git Bash, WSL, or another shell that supports `export`.

#### Water Tracker frontend

```bash
cd artifacts/water-tracker
pnpm dev
```

#### Mockup sandbox frontend

```bash
cd artifacts/mockup-sandbox
pnpm dev
```

## Package-specific commands

From the workspace root, you can run package scripts using pnpm filters:

```bash
pnpm --filter ./artifacts/api-server dev
pnpm --filter ./artifacts/water-tracker dev
pnpm --filter ./artifacts/mockup-sandbox dev
pnpm --filter ./artifacts/api-server build
pnpm --filter ./artifacts/water-tracker typecheck
```

## How to use it

- Open `artifacts/api-server` to run and extend the backend routes under `/api`.
- Open `artifacts/water-tracker` to work on the admin interface, filters, history, settings, and admin pages.
- Open `artifacts/mockup-sandbox` to prototype UI components and preview canvases.
- Use `lib/api-zod` and `lib/api-client-react` to share API contracts and React client logic across packages.

## Where to get help

- Review the workspace `package.json` and `pnpm-workspace.yaml` for workspace configuration.
- Inspect package-level `package.json` scripts for available commands.
- Open issues in the repository if this project is hosted on GitHub.

## Contributing

- This repository is a private pnpm workspace with several packages.
- If you want to contribute, start by adding changes in the appropriate package directory and use `pnpm install` at the root.
- Run `pnpm run typecheck` and package-level `pnpm dev` or `pnpm build` commands before submitting changes.

## Maintainers

Maintained by the project maintainers and contributors listed in the repository.

## Notes

- This workspace is configured for pnpm and relies on `pnpm-workspace.yaml`.
- The backend requires a `PORT` environment variable when running `artifacts/api-server`.
