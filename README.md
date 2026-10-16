# TiloPOS - Modern Point of Sale System

<div align="center">

![TiloPOS](https://img.shields.io/badge/TiloPOS-v0.1.0-blue?style=for-the-badge)
![Build Status](https://img.shields.io/github/actions/workflow/status/omanjaya/tilopos/ci.yml?style=for-the-badge&label=Build)

![NestJS](https://img.shields.io/badge/NestJS-v11.0-E0234E?style=flat-square&logo=nestjs)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-22_LTS-339933?style=flat-square&logo=nodedotjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)

![License](https://img.shields.io/badge/license-proprietary-red?style=flat-square)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)
![Maintenance](https://img.shields.io/badge/Maintained-Yes-success?style=flat-square)

**Modern, offline-first Point of Sale system untuk UMKM Indonesia**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Architecture](#-architecture)

</div>

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Development](#-development)
- [Architecture](#-architecture)
- [Documentation](#-documentation)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 About

**TiloPOS** adalah sistem Point of Sale modern yang dirancang khusus untuk UMKM Indonesia. Dengan fitur offline-first, built-in Kitchen Display System (KDS), dan interface yang user-friendly, TiloPOS membantu bisnis Anda berjalan lebih efisien.

### Key Differentiators

- ✅ **Offline-First Architecture** - Tetap berjalan tanpa internet
- ✅ **Built-in KDS** - Kitchen Display System terintegrasi
- ✅ **Modern UI/UX** - Dark mode, responsive, accessible
- ✅ **Web / PWA** - Jalan di browser tablet, laptop & desktop (aplikasi native masih rencana)
- ✅ **Better Refund Handling** - Proses refund yang mudah
- ✅ **Real-time Sync** - Sinkronisasi otomatis antar device

---

## ✨ Features

### 🛍️ Point of Sale (POS)
- **Quick Sales** - Interface cepat untuk transaksi
- **Product Grid** - Tampilan produk dengan kategori & search
- **Variants & Modifiers** - Kelola varian produk & add-ons
- **Multiple Payment Methods** - Cash, card, QRIS, e-wallet
- **Hold/Resume** - Simpan transaksi untuk dilanjutkan
- **Split Bill** - Pisah tagihan untuk multiple customers
- **Keyboard Shortcuts** - F1-F12 untuk operasi cepat

### 🍳 Kitchen Display System (KDS)
- **Real-time Orders** - Order langsung muncul di dapur
- **Bump System** - Tandai order selesai dengan mudah
- **Station Management** - Kelola multiple kitchen stations
- **Priority Indicators** - Warna untuk urgency level
- **Sound Notifications** - Alert untuk order baru
- **Timer Display** - Tracking waktu persiapan

### 📊 Reports & Analytics
- **Sales Reports** - Laporan penjualan harian/bulanan
- **Financial Reports** - Revenue, cost, profit, margin
- **Product Performance** - Top products by revenue/quantity
- **Payment Breakdown** - Analisis metode pembayaran
- **Export Options** - PDF, Excel, Print
- **Date Range Filters** - Today, This Week, Month, Year, Custom

### 👥 Customer Management
- **Customer Database** - Simpan data pelanggan
- **Purchase History** - Riwayat pembelian per customer
- **Loyalty Program** - Poin & tier system
- **Customer Segments** - VIP, Regular, New, At-Risk, Churned
- **Birthday Tracking** - Notifikasi ulang tahun
- **Import/Export** - CSV/JSON support

### 📦 Inventory Management
- **Stock Tracking** - Real-time stock levels
- **Low Stock Alerts** - Notifikasi stok menipis
- **Stock Transfers** - Transfer antar outlet
- **Stock Adjustments** - Koreksi stok manual
- **Supplier Management** - Kelola data supplier
- **Multi-outlet Support** - Inventori per outlet

### 🌐 Online Features
- **Self-Order** - QR code untuk customer order sendiri
- **Online Store** - Storefront untuk online ordering
- **Order Management** - Kelola online & dine-in orders
- **Table Management** - Floor plan & table status
- **Waiting List** - Queue management system

### 👤 User Management
- **Role-Based Access** - Owner, Manager, Cashier, Kitchen, etc.
- **Multi-outlet** - Kelola multiple outlets
- **Employee Management** - Shift, attendance, commission
- **Audit Logs** - Track semua aktivitas user
- **2FA/MFA** - Two-factor authentication

### 🎨 UX Features
- **Onboarding Wizard** - Setup guide untuk user baru
- **Command Palette** - `⌘K` quick navigation
- **Keyboard Shortcuts** - Global shortcuts + help dialog (`⌘/`)
- **Help Center** - Tutorial library & contextual help
- **Dark Mode** - Support tema gelap
- **Responsive Design** - Mobile, tablet, desktop optimized

---

## 🛠️ Tech Stack

### Backend
- **Framework:** NestJS 11 + TypeScript (strict mode)
- **Database:** PostgreSQL 15 with Prisma ORM
- **Cache:** Redis 7
- **Message Queue:** RabbitMQ
- **Authentication:** JWT access token (login e-mail + PIN, MFA opsional)
- **File Upload:** AWS S3 / Local storage
- **Real-time:** Socket.io
- **Monitoring:** Health checks (`/api/v1/health/*`), Prometheus metrics (opsional)
- **Logging:** Winston (+ ELK opsional)

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **State Management:** Zustand + TanStack Query
- **UI Components:** shadcn/ui + Radix UI
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **Routing:** React Router v7
- **Export:** ExcelJS + jsPDF
- **PWA:** Service worker (offline POS)

### DevOps & Tools
- **Monorepo:** npm workspaces
- **Linting:** ESLint + Prettier
- **Testing:** Jest (backend) + Vitest (frontend) + Playwright (E2E)
- **Git Hooks:** Husky + lint-staged
- **CI:** GitHub Actions (lint, unit tests, build). No automated deployment (CD) yet.
- **Docker:** Docker Compose (dev & single-host), Kubernetes manifests in `k8s/`

---

## 🚀 Quick Start

### Prerequisites

- Node.js 22 LTS (see `.nvmrc`; `nvm use` / `fnm use`)
- Docker + Docker Compose (recommended), **or** locally installed PostgreSQL 15+, Redis 7+ (RabbitMQ optional)

### Option A: Docker (recommended)

```bash
git clone https://github.com/omanjaya/tilopos.git
cd tilopos

# Compose reads ./.env - only JWT_SECRET is required for development
cp .env.example .env
# set JWT_SECRET to >= 32 random chars, e.g.: openssl rand -base64 48

npm run docker:dev            # backend, web, postgres, redis, rabbitmq (migrations run on start)

# Load demo data (TRUNCATES all tables - development only)
docker compose -f docker-compose.dev.yml exec -e ALLOW_DESTRUCTIVE_SEED=true backend npm run db:seed
```

Other commands: `npm run docker:dev:logs`, `npm run docker:dev:down`,
`docker compose -f docker-compose.dev.yml down -v` (also deletes the volumes).

### Option B: Local Node.js

```bash
npm install                                   # installs all workspaces from the root lockfile

# Postgres/Redis/RabbitMQ can still come from Docker:
docker compose -f docker-compose.dev.yml up -d postgres redis rabbitmq

cp packages/backend/.env.example packages/backend/.env   # defaults match the dev containers
cp packages/web/.env.example packages/web/.env

npm run db:generate
npm run db:migrate                            # prisma migrate dev
ALLOW_DESTRUCTIVE_SEED=true npm run db:seed   # demo data (truncates all tables)

npm run dev                                   # backend  http://localhost:3001
npm run dev:web                               # frontend http://localhost:5173 (new terminal)
```

`prisma migrate reset` also runs the seed and therefore needs `ALLOW_DESTRUCTIVE_SEED=true` as well.

### Services

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api/v1
- API docs (non-production only): http://localhost:3001/api/docs
- Health: http://localhost:3001/api/v1/health/ready
- PostgreSQL: localhost:5432 (user `tilopos`, password `tilopos_dev`, db `tilopos`)
- Redis: localhost:6379
- RabbitMQ UI: http://localhost:15672 (user `tilo`, password `tilopass_dev` or `RABBITMQ_PASSWORD` from `.env`)

### Demo logins (after seeding)

Login uses **e-mail + PIN**. All demo accounts share the PIN from `SEED_DEFAULT_PIN` (default `1234`).

| Role | E-mail |
| --- | --- |
| Super Admin | `superadmin@tilopos.id` |
| Owner | `budi@brewbites.id` |
| Manager | `siti@brewbites.id` |
| Supervisor | `agus@brewbites.id` |
| Cashier | `dewi@brewbites.id`, `rina@brewbites.id` |
| Kitchen | `joko@brewbites.id` |
| Inventory | `hendra@brewbites.id` |

The seeder refuses to run in production. Never use these accounts or PINs outside development.

---

## 💻 Development

### Project Structure

```
tilopos/
├── packages/
│   ├── backend/              # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/      # Feature modules
│   │   │   ├── infrastructure/ # Database, cache, queue
│   │   │   ├── application/  # Use cases
│   │   │   └── shared/       # Common utilities
│   │   ├── prisma/           # Database schema & migrations
│   │   └── test/             # E2E tests
│   └── web/                  # React frontend
│       ├── src/
│       │   ├── features/     # Feature-based organization
│       │   ├── components/   # Shared UI components
│       │   ├── api/          # API client & endpoints
│       │   ├── stores/       # Zustand stores
│       │   ├── hooks/        # Custom React hooks
│       │   └── lib/          # Utility functions
│       └── public/           # Static assets
├── Docs/                     # All documentation (index: Docs/00-INDEX.md)
│   ├── architecture/         # System design, layers, clean code
│   ├── database/             # Schema documentation
│   ├── operations/           # Deployment, backup & restore
│   ├── ui/                   # UI/UX documentation
│   └── ENGINEERING-RULES.md  # Mandatory engineering rules
├── k8s/                      # Kubernetes manifests (kustomize)
├── docker-compose*.yml       # Docker configurations
└── CLAUDE.md                 # Development guidelines
```

### Common Commands

```bash
# Root (Monorepo)
npm install              # Install all dependencies
npm run dev              # Start backend
npm run dev:web          # Start frontend
npm run build            # Build all workspaces
npm run lint             # Lint all workspaces (auto-fix)
npm run lint:check       # Lint without fixing (what CI runs)
npm run test             # Test all workspaces

# Backend
cd packages/backend
npm run dev              # Start with hot reload
npm run build            # Build for production
npm run lint             # ESLint
npm run test             # Unit tests
npm run test:e2e         # Integration tests (needs a seeded database)
npm run db:migrate       # Create/apply migrations (prisma migrate dev)
npm run db:seed          # Seed demo data (needs ALLOW_DESTRUCTIVE_SEED=true)
npm run db:studio        # Open Prisma Studio

# Frontend
cd packages/web
npm run dev              # Start dev server
npm run build            # TypeScript + Vite build
npm run preview          # Preview production build
npm run lint             # ESLint
npm run test             # Unit tests (Vitest)
npm run test:e2e         # E2E tests (Playwright)
```

### Coding Standards

- **TypeScript Strict Mode** - No `any`, explicit return types
- **ESLint + Prettier** - Automated formatting
- **Conventional Commits** - Standardized commit messages
- **No Emojis in Code** - Unless explicitly requested
- **Single Responsibility** - One purpose per file/function
- **KISS Principle** - Keep it simple

See [Docs/ENGINEERING-RULES.md](./Docs/ENGINEERING-RULES.md) and [CLAUDE.md](./CLAUDE.md) for detailed development guidelines.

---

## 🏗️ Architecture

### Backend Architecture

**Clean Architecture** dengan layers:

```
┌─────────────────────────────────────────┐
│          Presentation Layer             │
│    (Controllers, Guards, Interceptors)  │
├─────────────────────────────────────────┤
│         Application Layer               │
│           (Use Cases)                   │
├─────────────────────────────────────────┤
│           Domain Layer                  │
│      (Business Logic, Entities)         │
├─────────────────────────────────────────┤
│       Infrastructure Layer              │
│  (Database, Cache, Queue, External APIs)│
└─────────────────────────────────────────┘
```

**Key Modules:**
- `auth` - Authentication & authorization
- `pos` - Point of sale operations
- `products` - Product management
- `inventory` - Stock management
- `orders` - Order processing
- `customers` - Customer management
- `reports` - Analytics & reporting
- `kds` - Kitchen display system

### Frontend Architecture

**Feature-based** organization:

```
src/
├── features/           # Feature modules
│   ├── pos/           # POS terminal
│   ├── kds/           # Kitchen display
│   ├── products/      # Product management
│   └── reports/       # Reports & analytics
├── components/        # Shared UI components
├── stores/            # Zustand state management
├── hooks/             # Custom React hooks
├── api/               # API client
└── lib/               # Utility functions
```

**State Management:**
- **TanStack Query** - Server state (API calls, caching)
- **Zustand** - Client state (UI state, auth, cart)
- **localStorage** - Persistence

### Multi-tenancy

All entities scoped by `businessId` from JWT payload:

```typescript
// Every query automatically filtered by businessId
const products = await prisma.product.findMany({
  where: { businessId: user.businessId }
});
```

### Real-time Features

- **WebSocket (Socket.io)** for real-time updates
- **KDS** - Order updates
- **Inventory** - Stock changes
- **Queue** - Waiting list updates

---

## 📚 Documentation

Start at the [documentation index](./Docs/00-INDEX.md).

### Architecture Docs
- [System Design](./Docs/architecture/01-system-design.md) - Overall architecture
- [Layered Architecture](./Docs/architecture/02-layered-architecture.md) - Clean architecture layers
- [Database Schema](./Docs/database/01-database-schema.md) - ERD & table descriptions
- [Engineering Rules](./Docs/ENGINEERING-RULES.md) - Mandatory rules for every change

### Development Docs
- [Clean Code Practices](./Docs/architecture/03-clean-code-practices.md) - Coding standards
- [Shared Components](./Docs/ui/03-SHARED-COMPONENTS.md) - UI component library
- [UI/UX Strategy](./Docs/ui/00-UI-UX-STRATEGY.md) - Design direction

### Operations
- [Deployment Guide](./Docs/operations/deployment.md) - Env contract, migrations, release checklist
- [Backup & Restore](./Docs/operations/backup-restore.md) - Backup schedule and restore runbook
- [Kubernetes](./k8s/README.md) - Manifests, secrets, overlays

### Status & Audits
- [Audit 2026-09-26](./Docs/audit/AUDIT-KEKURANGAN-2026-09-26.md) - Known gaps and remediation
- [Progress Tracker](./Docs/progress/01-progress-tracker.md)
- [God Class Audit](./Docs/maintenance/01-god-class-audit.md) - Code quality improvements
- [UX Improvements](./Docs/progress/03-ux-improvements-plan.md) - UX enhancement roadmap

### UI/UX Docs
- [UI Strategy](./Docs/ui/00-UI-UX-STRATEGY.md)
- [Responsive Design](./Docs/ui/01-RESPONSIVE-DESIGN.md)
- [Design System](./Docs/ui/02-DESIGN-SYSTEM.md)
- [Accessibility](./Docs/ui/05-ACCESSIBILITY.md)
- [Lighthouse Audit](./Docs/ui/09-LIGHTHOUSE-AUDIT-RESULTS.md)

---

## 🧪 Testing

### Backend Testing

```bash
cd packages/backend

# Unit tests
npm run test

# Integration tests (Postgres + Redis with seeded demo data)
ALLOW_DESTRUCTIVE_SEED=true npm run db:seed
npm run test:e2e

# Coverage
npm run test:cov
```

### Frontend Testing

```bash
cd packages/web

# Unit tests (Vitest)
npm run test
npm run test:watch
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e
npm run test:e2e:ui      # With UI
```

### Continuous Integration

`.github/workflows/ci.yml` runs on pushes and pull requests to `main`/`develop`:
lint without `--fix`, backend typecheck + unit tests, backend integration tests against
Postgres/Redis (non-blocking for now), web vitest + production build, Docker image builds,
and `npm audit` (non-blocking). Nothing is deployed automatically.

---

## 🚢 Deployment

### Production Build

```bash
# Build all packages
npm run build

# Or build individually
npm run build:backend
npm run build:web
```

### Environment Variables

The backend validates its environment at boot and refuses to start in production when
something required is missing (`packages/backend/src/config/env.validation.ts`).

- Always: `DATABASE_URL`, `JWT_SECRET` (>= 32 chars in production), `JWT_EXPIRES_IN`
- Production: `CORS_ORIGIN`, `FRONTEND_URL`, `REDIS_HOST`, and `PAYMENT_GATEWAY=midtrans|xendit`
  with its keys (`mock` is rejected)
- Optional: `TRUST_PROXY`, `METRICS_ENABLED`, S3 (`S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, ...),
  SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, ...), RabbitMQ (`RABBITMQ_URL`)

Full references: [`packages/backend/.env.example`](./packages/backend/.env.example) (local),
[`.env.example`](./.env.example) (docker compose), [`k8s/base/configmap.yaml`](./k8s/base/configmap.yaml) +
[`k8s/base/secrets.yaml.example`](./k8s/base/secrets.yaml.example) (Kubernetes).

Frontend `VITE_*` variables ([`packages/web/.env.example`](./packages/web/.env.example)) are baked in at build time.

### Docker (single host)

```bash
cp .env.example .env     # fill every [prod] value
npm run docker:prod      # builds images from the repo root, runs migrations once, starts the stack
npm run docker:prod:down
```

### Kubernetes

See [k8s/README.md](./k8s/README.md) and the [deployment guide](./Docs/operations/deployment.md).

---

## 🤝 Contributing

Contributions are by invitation only (proprietary project). Team members, please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Code style changes
refactor: Code refactoring
test: Add tests
chore: Maintenance tasks
```

### Pull Request Guidelines

- Keep PRs focused and small
- Write clear descriptions
- Include tests for new features
- Update documentation if needed
- Ensure `npm run lint:check` and all tests pass
- Follow coding standards

---

## 📄 License

Proprietary software — all rights reserved. See [LICENSE](./LICENSE). Use, copying or distribution requires prior written permission.

---

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Backend framework
- [React](https://react.dev/) - Frontend library
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Prisma](https://www.prisma.io/) - Database ORM
- [TanStack Query](https://tanstack.com/query) - Data fetching

---

## 📞 Support

- **Documentation:** [Docs](./Docs/00-INDEX.md)
- **Issues:** [GitHub Issues](https://github.com/omanjaya/tilopos/issues)
- **Email:** support@tilopos.com

---

<div align="center">

Made with ❤️ for UMKM Indonesia

**[⬆ Back to Top](#tilopos---modern-point-of-sale-system)**

</div>
