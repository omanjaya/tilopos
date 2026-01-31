# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Rules

- NEVER create markdown files (.md) or any documentation files unless explicitly requested by the user.

## Project Overview

**TiloPOS** — Modern Point of Sale system for SME/UMKM businesses in Indonesia. Key differentiators: built-in Kitchen Display System (KDS), offline-first architecture, modern UI with dark mode, better refund handling, multi-platform (Web, iOS, Android, Desktop).

**Status:** Active development. Backend (NestJS) and Web Frontend (React) are implemented. Monorepo structure with `packages/backend` and `packages/web`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS + TypeScript (strict mode) |
| Database | PostgreSQL 15 with Prisma ORM |
| Cache | Redis 7 |
| Message Queue | RabbitMQ |
| Web Frontend | React 18 + TypeScript + Vite |
| State Management | Zustand + TanStack Query |
| UI Components | shadcn/ui + Radix UI + Tailwind CSS |
| Icons | Lucide React |
| Charts | Recharts |

## Commands

### Root Level (Monorepo)
```bash
npm install                    # Install all workspace dependencies
npm run dev                    # Start backend dev server
npm run dev:web                # Start frontend dev server
npm run build                  # Build all workspaces
npm run build:backend          # Build backend only
npm run build:web              # Build web only
npm run lint                   # Lint all workspaces
npm run test                   # Test all workspaces
npm run test:backend           # Test backend only
npm run test:web               # Test web only

# Docker commands
npm run docker:dev             # Start all services (backend, web, postgres, redis, rabbitmq)
npm run docker:dev:down        # Stop all services
npm run docker:dev:logs        # View logs

# Database commands (proxies to backend)
npm run db:generate            # Generate Prisma client
npm run db:migrate             # Run migrations (dev)
npm run db:seed                # Seed database
npm run db:studio              # Open Prisma Studio
```

### Backend (`packages/backend`)
```bash
npm run dev                    # Start with hot reload
npm run start:prod             # Start production build
npm run build                  # Build for production
npm run lint                   # ESLint
npm run test                   # Run unit tests
npm run test:watch             # Run tests in watch mode
npm run test:cov               # Run tests with coverage
npm run test:e2e               # Run E2E tests

# Prisma commands
npm run db:generate            # Generate Prisma client
npm run db:migrate             # Create and apply migration
npm run db:migrate:prod        # Apply migrations (production)
npm run db:push                # Push schema to database (dev only)
npm run db:seed                # Seed database
npm run db:studio              # Open Prisma Studio UI
```

### Web (`packages/web`)
```bash
npm run dev                    # Start dev server (port 5173)
npm run build                  # TypeScript check + Vite build
npm run preview                # Preview production build
npm run lint                   # ESLint
npm run test                   # Run unit tests (Vitest)
npm run test:watch             # Run tests in watch mode
npm run test:coverage          # Run tests with coverage
npm run test:e2e               # Run E2E tests (Playwright)
npm run test:e2e:ui            # Run E2E tests with UI
```

## Architecture

### Monorepo Structure
```
moka/
├── packages/
│   ├── backend/          # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules (auth, pos, products, etc.)
│   │   │   ├── infrastructure/  # Database, cache, message queue
│   │   │   ├── domain/          # Business logic (planned)
│   │   │   ├── application/     # Use cases (planned)
│   │   │   └── shared/          # Common utilities
│   │   ├── prisma/       # Database schema & migrations
│   │   └── test/         # E2E tests
│   └── web/              # React frontend
│       ├── src/
│       │   ├── features/ # Feature-based organization
│       │   ├── components/ # Shared UI components
│       │   ├── api/      # API client & endpoints
│       │   ├── stores/   # Zustand stores
│       │   ├── hooks/    # Custom React hooks
│       │   ├── lib/      # Utility functions
│       │   └── types/    # TypeScript types
│       └── public/       # Static assets
├── Docs/                 # Design documents
└── docker-compose*.yml   # Docker configurations
```

### Backend Architecture

**Clean Architecture** with layers (partially implemented):
- **Modules** (`src/modules/`): Feature-based NestJS modules - auth, pos, products, inventory, customers, employees, reports, settings, orders, tables, self-order, online-store
- **Infrastructure** (`src/infrastructure/`): Prisma repositories, Redis cache, RabbitMQ, file upload, seeders
- **Domain** & **Application** layers: Planned for future refactoring

**Key Modules:**
- `auth` - JWT authentication, role-based access control
- `pos` - Point of sale transactions, cart management
- `products` - Product CRUD, categories, variants, modifiers
- `inventory` - Stock levels, movements, transfers
- `orders` - Order management, KDS integration
- `reports` - Sales, financial, product, payment reports
- `self-order` - Customer self-ordering (QR code sessions)
- `online-store` - Online storefront management

### Frontend Architecture

**Feature-based** organization with shared components:

**Features** (`src/features/`):
- `auth/` - Login, authentication
- `dashboard/` - Dashboard with metrics & charts
- `pos/` - POS terminal (product grid, cart, payment)
- `products/` - Product management (CRUD, variants, modifiers)
- `inventory/` - Inventory management, stock transfers
- `customers/` - Customer management, segments
- `employees/` - Employee management, roles
- `reports/` - Sales, financial, product, payment reports
- `orders/` - Order management, table management
- `self-order/` - Customer-facing self-order interface
- `online-store/` - Online store setup & storefront
- `onboarding/` - First-time user wizard & tours
- `profile/` - User profile & account settings
- `help/` - Help center & tutorial library

**State Management:**
- `TanStack Query` - Server state (data fetching, caching, synchronization)
- `Zustand` - Client state (UI state, auth, cart)
- `localStorage` - Persistence (tokens, preferences)

**Routing:**
- React Router v7
- Nested routes under `/app` (protected)
- Auth guard for protected routes
- Public routes: `/login`, `/store/:slug`, `/self-order/:sessionCode`

## Key Patterns & Conventions

### Backend
- **Modules**: Feature-based NestJS modules with controllers, services, DTOs
- **Multi-tenancy**: All entities scoped by `businessId` (JWT payload)
- **RBAC**: Role-based access control via guards (`@Roles()` decorator)
- **Validation**: class-validator DTOs for request validation
- **Error handling**: Custom `AppException` with status codes
- **Database**: Prisma ORM with PostgreSQL
- **API versioning**: `/api/v1/*` endpoints

### Frontend
- **Component naming**: PascalCase files (e.g., `ProductCard.tsx`)
- **Hooks naming**: camelCase with `use` prefix (e.g., `useProducts.ts`)
- **Path alias**: `@/` maps to `src/`
- **UI components**: shadcn/ui components in `components/ui/`
- **Shared components**: Reusable components in `components/shared/`
- **Feature components**: Scoped to feature folder
- **TypeScript**: Strict mode, no `any`, explicit return types
- **Styling**: Tailwind CSS with design tokens
- **Forms**: React Hook Form + Zod validation

### Naming Conventions
- **Classes/Interfaces**: PascalCase
- **Functions**: camelCase, verb-first (e.g., `createTransaction`)
- **Constants**: UPPER_SNAKE_CASE
- **DB tables**: snake_case, plural (e.g., `product_variants`)
- **API endpoints**: kebab-case (e.g., `/api/v1/payment-methods`)
- **Booleans**: prefix with `is`, `has`, `can`

## Database

PostgreSQL with Prisma ORM. Multi-tenant design with `businessId` scoping.

**Key Tables:**
- Core: `businesses`, `outlets`, `employees`, `products`, `categories`, `customers`
- Transactions: `transactions`, `transaction_items`, `payments`
- Inventory: `stock_levels`, `stock_movements`, `stock_transfers`
- Modifiers: `modifier_groups`, `modifiers`, `product_modifier_groups`
- Orders: `orders`, `order_items`, `tables`
- Online: `online_stores`, `store_orders`, `self_order_sessions`
- System: `devices`, `audit_logs`, `notification_logs`

**Migrations:**
```bash
# Create new migration
cd packages/backend
npm run db:migrate

# Apply migrations (production)
npm run db:migrate:prod

# Reset database (dev only)
npx prisma migrate reset
```

## Development Workflow

### Local Development
```bash
# Option 1: Native (requires PostgreSQL, Redis, RabbitMQ installed)
npm install
cd packages/backend && cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev          # Terminal 1: Backend
npm run dev:web      # Terminal 2: Frontend

# Option 2: Docker (recommended)
npm run docker:dev   # Starts all services
# Backend: http://localhost:3001
# Frontend: http://localhost:5173
# Postgres: localhost:5432
# Redis: localhost:6379
# RabbitMQ UI: http://localhost:15672 (user: tilo, pass: tilopass)
```

### Environment Variables

**Backend** (`packages/backend/.env`):
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/tilopos
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
RABBITMQ_URL=amqp://user:pass@localhost:5672
```

**Frontend** (`packages/web/.env`):
```bash
VITE_API_URL=http://localhost:3001  # Backend API URL
VITE_CDN_URL=                        # Optional CDN for assets
```

### Testing

**Backend:**
```bash
npm run test           # Unit tests (Jest)
npm run test:watch     # Watch mode
npm run test:cov       # Coverage report
npm run test:e2e       # E2E tests
```

**Frontend:**
```bash
npm run test           # Unit tests (Vitest)
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
npm run test:e2e       # E2E tests (Playwright)
npm run test:e2e:ui    # Playwright UI mode
```

## API Integration

Frontend API client uses Axios with:
- Base URL: `/api` (proxied to backend in dev)
- JWT token interceptor (auto-attach from auth store)
- 401 auto-redirect to login
- Error response standardization

**API Endpoints Pattern:**
```typescript
// src/api/endpoints/products.api.ts
export const productsApi = {
  list: (params) => apiClient.get('/products', { params }),
  get: (id) => apiClient.get(`/products/${id}`),
  create: (data) => apiClient.post('/products', data),
  update: (id, data) => apiClient.put(`/products/${id}`, data),
  delete: (id) => apiClient.delete(`/products/${id}`),
};
```

**TanStack Query Usage:**
```typescript
// Fetch data
const { data, isLoading } = useQuery({
  queryKey: ['products', filters],
  queryFn: () => productsApi.list(filters),
});

// Mutation
const createMutation = useMutation({
  mutationFn: productsApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  },
});
```

## Key Features Implemented

### UX Improvements
- **Onboarding Wizard**: 4-step first-time user setup
- **Product Tours**: Interactive Shepherd.js tours for major features
- **Command Palette**: `⌘K` quick navigation
- **Keyboard Shortcuts**: Global shortcuts (`⌘D`, `⌘P`, `⌘E`, etc.) + `⌘/` help dialog
- **User Profile**: Self-service account settings, PIN change, photo upload
- **Help System**: Tutorial library, help center, contextual tooltips
- **Breadcrumbs**: Auto-generated navigation breadcrumbs

### Reports
- **Date Ranges**: Today, This Week, This Month, This Year, Custom (calendar picker)
- **Comparison Metrics**: Trend indicators vs previous period (↑ +15%, ↓ -5%)
- **Export**: PDF (jsPDF), Excel (xlsx), Print (optimized CSS)
- **Report Types**: Sales, Financial, Product, Payment Methods, Inventory

### POS Features
- **Product Grid**: Search, categories, variants, modifiers
- **Cart Management**: Add/remove items, quantity, notes, discounts
- **Payment**: Multiple methods (cash, card, QRIS, e-wallet, bank transfer)
- **Keyboard Shortcuts**: F1-F12 for common actions
- **Hold/Resume**: Save incomplete transactions

### Customer-Facing
- **Self-Order**: QR code session-based ordering for dine-in
- **Online Store**: Public storefront with cart & checkout
- **Product Recommendations**: Popular items display
- **Order Confirmation**: WhatsApp notifications, order tracking

## Troubleshooting

### Backend won't start
```bash
# Check database connection
cd packages/backend
npx prisma db push

# Check dependencies
npm install

# Check environment variables
cat .env
```

### Frontend won't start
```bash
# Check dependencies
cd packages/web
npm install

# Check backend is running
curl http://localhost:3001/health

# Clear Vite cache
rm -rf node_modules/.vite
```

### Database issues
```bash
# Reset database (dev only)
cd packages/backend
npx prisma migrate reset

# Regenerate Prisma client
npm run db:generate

# View database
npm run db:studio
```

### Docker issues
```bash
# Rebuild containers
npm run docker:dev:down
docker compose -f docker-compose.dev.yml up --build

# View logs
npm run docker:dev:logs

# Clean volumes (nuclear option)
docker compose -f docker-compose.dev.yml down -v
```

## Role Hierarchy

Super Admin > Owner > Manager > Supervisor > Cashier / Kitchen Staff / Inventory Staff

Auth uses JWT (Access + Refresh tokens) with RBAC.

## Documentation

Design documents in `Docs/`:
- `01-SYSTEM-DESIGN.md` - Architecture, tech stack, subsystems
- `02-LAYERED-ARCHITECTURE.md` - Clean architecture layers
- `03-CLEAN-CODE-PRACTICES.md` - Coding standards
- `04-SHARED-COMPONENTS.md` - UI component library
- `05-DATABASE-SCHEMA.md` - Database design
- `06-UI-UX-DESIGN.md` - Design system
- `tiloposanalysis.md` - Competitive analysis
