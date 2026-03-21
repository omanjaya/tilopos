# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Rules

- NEVER create markdown files (.md) or any documentation files unless explicitly requested by the user.

## Project Overview

**TiloPOS** — Point of Sale system for Indonesian SME/UMKM businesses. Monorepo with `packages/backend` (NestJS) and `packages/web` (React + Vite). Multi-tenant by `businessId` from JWT.

## Commands

### Development
```bash
npm run dev                    # Backend dev server (port 3001)
npm run dev:web                # Frontend dev server (port 5173)
npm run docker:dev             # All services via Docker
```

### Build & Lint
```bash
npm run build                  # Build all workspaces
npm run build:backend          # Backend only
npm run build:web              # Web only (runs tsc -b first)
npm run lint                   # Lint all workspaces
```

### Testing
```bash
# Backend (Jest) - from packages/backend or root
npm run test:backend                          # All backend tests
cd packages/backend && npx jest path/to/file  # Single test file
cd packages/backend && npx jest --watch       # Watch mode

# Frontend (Vitest) - from packages/web or root
npm run test:web                              # All frontend tests
cd packages/web && npx vitest run path/to/file  # Single test file
cd packages/web && npx vitest --watch           # Watch mode

# E2E (Playwright) - frontend
cd packages/web && npx playwright test
```

### Database (Prisma)
```bash
npm run db:generate            # Generate Prisma client
npm run db:migrate             # Create + apply migration (dev)
npm run db:seed                # Seed database
npm run db:studio              # Prisma Studio UI
```

## Architecture

### Backend (`packages/backend`)

**NestJS with Clean Architecture layers (partially implemented):**
- `src/modules/` — Feature modules (controller + service + DTOs)
- `src/infrastructure/` — Prisma repos, Redis cache, RabbitMQ, seeders
- `src/shared/` — Common utilities, guards, decorators

**Path aliases** (tsconfig.json):
- `@modules/*`, `@infrastructure/*`, `@shared/*`, `@domain/*`, `@application/*`

**Key patterns:**
- Multi-tenancy: all queries scoped by `businessId` from JWT payload
- RBAC: `@Roles()` decorator with role guards
- Validation: class-validator DTOs
- API prefix: `/api/v1/*`
- Global `ThrottlerGuard` for rate limiting
- WebSocket via Socket.IO for real-time features (KDS, orders)

### Frontend (`packages/web`)

**React 18 + TypeScript + Vite:**
- `src/features/` — Feature-based pages and components
- `src/components/` — Shared UI (`ui/` = shadcn/ui, `shared/` = reusable)
- `src/api/` — Axios client + endpoint definitions
- `src/stores/` — Zustand stores
- `src/hooks/` — Custom React hooks
- `src/routes/` — Route definitions (`app-routes.tsx`, `settings-routes.tsx`, `lazy-imports.tsx`)

**Path alias:** `@/` → `src/`

**Key patterns:**
- All routes lazy-loaded via `React.lazy` in `routes/lazy-imports.tsx`
- Desktop/Mobile: **separate files**, NOT responsive breakpoints. Desktop = `page.tsx`, Mobile = `page.mobile.tsx`, routed via `<DeviceRoute desktop={} mobile={} />`
- API client (`api/client.ts`): base URL `/api/v1`, auto-attaches JWT from `useAuthStore`, 401 → logout + redirect
- Vite proxies `/api` and `/socket.io` to backend (`localhost:3001`)
- State: TanStack Query for server state, Zustand for client state
- Forms: React Hook Form + Zod validation
- UI: shadcn/ui + Radix UI + Tailwind CSS + Lucide icons

### Routing Structure
- `/` — Landing page
- `/login` — Auth
- `/pos`, `/kds` — Fullscreen (no sidebar), auth-guarded
- `/app/*` — Backoffice with sidebar layout, auth-guarded
- `/order/:sessionCode` — Customer self-order (public)

## Git Hooks

Pre-commit runs `lint-staged` via Husky:
- Backend `.ts` files → `eslint --fix`
- Frontend `.ts`/`.tsx` files → `eslint --fix`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11 + TypeScript (strict) |
| Database | PostgreSQL 15 + Prisma 5 |
| Cache | Redis 7 (ioredis) |
| Queue | RabbitMQ + BullMQ |
| Frontend | React 18 + Vite 6 + TypeScript |
| State | Zustand 5 + TanStack Query 5 |
| UI | shadcn/ui + Radix UI + Tailwind CSS 3 |
| Testing | Jest (backend) + Vitest (frontend) + Playwright (e2e) |
| Monitoring | Sentry + Winston logging |

## Naming Conventions

- **Files**: PascalCase components (`ProductCard.tsx`), camelCase hooks (`useProducts.ts`), kebab-case modules (`online-store/`)
- **Code**: PascalCase classes/interfaces, camelCase functions (verb-first), UPPER_SNAKE_CASE constants
- **DB tables**: snake_case plural (`product_variants`)
- **API endpoints**: kebab-case (`/api/v1/payment-methods`)
- **Booleans**: prefix `is`, `has`, `can`

## Role Hierarchy

Super Admin > Owner > Manager > Supervisor > Cashier / Kitchen Staff / Inventory Staff

## Environment Variables

**Backend** (`packages/backend/.env`): `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `RABBITMQ_URL`

**Frontend** (`packages/web/.env`): `VITE_API_URL` (backend URL), `VITE_CDN_URL` (optional)

## Production / VPS Environment

**This project runs on a VPS used for testing (not real production).**

| Item | Detail |
|------|--------|
| OS | Ubuntu 24.04.3 LTS |
| CPU | 4 cores |
| RAM | 16 GB |
| Disk | 193 GB |
| Project path | `/root/tilopos` |

### Docker Setup

All services run via Docker Compose using `docker-compose.dev.yml`:

```bash
docker compose -f docker-compose.dev.yml up -d    # Start all services
docker compose -f docker-compose.dev.yml down      # Stop all services
docker compose -f docker-compose.dev.yml logs -f   # Follow logs
docker compose -f docker-compose.dev.yml restart backend  # Restart single service
```

**Containers:**

| Container | Image | Port | Notes |
|-----------|-------|------|-------|
| `tilopos-backend-1` | tilopos-backend | 3001 | NestJS, hot-reload via volume mounts |
| `tilopos-web-1` | tilopos-web | 5173 | Vite dev server, hot-reload via volume mounts |
| `tilopos-postgres-1` | postgres:15-alpine | 127.0.0.1:5432 | DB: `tilopos`, user: `tilopos` |
| `tilopos-redis-1` | redis:7-alpine | 127.0.0.1:6379 | AOF persistence enabled |
| `tilopos-rabbitmq-1` | rabbitmq:3-management-alpine | 127.0.0.1:5672 (AMQP), 127.0.0.1:15672 (UI) | User: `tilo` |

**Volume mounts:** Source code (`src/`, `prisma/`, config files) is mounted into containers, so code changes on host reflect immediately.

**Named volumes:** `pgdata_dev`, `redisdata_dev`, `rabbitmq_dev`, `backend_node_modules`, `web_node_modules`

### Running Commands Inside Containers

```bash
# Run Prisma migration inside backend container
docker compose -f docker-compose.dev.yml exec backend npx prisma migrate dev

# Generate Prisma client
docker compose -f docker-compose.dev.yml exec backend npx prisma db push

# Seed database
docker compose -f docker-compose.dev.yml exec backend npx prisma db seed

# Access PostgreSQL directly
docker compose -f docker-compose.dev.yml exec postgres psql -U tilopos -d tilopos

# Check backend logs
docker compose -f docker-compose.dev.yml logs -f backend

# Rebuild a specific container (after Dockerfile or dependency changes)
docker compose -f docker-compose.dev.yml up -d --build backend
```

### Other Projects on This VPS

- **FileForge** (`/root/project`) — also running via Docker, uses ports 8000, 8880, 8443. Unrelated to TiloPOS.
