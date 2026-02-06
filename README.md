# TiloPOS - Modern Point of Sale System

<div align="center">

![TiloPOS](https://img.shields.io/badge/TiloPOS-v0.1.0-blue)
![NestJS](https://img.shields.io/badge/NestJS-v11.0-red)
![React](https://img.shields.io/badge/React-18.3-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

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
- ✅ **Multi-Platform** - Web, iOS, Android, Desktop
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
- **Product Tours** - Interactive tutorials (Shepherd.js)
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
- **Authentication:** JWT (Access + Refresh tokens)
- **File Upload:** AWS S3 / Local storage
- **Real-time:** Socket.io
- **Monitoring:** Sentry
- **Logging:** Winston

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
- **PWA:** Workbox

### DevOps & Tools
- **Monorepo:** npm workspaces
- **Linting:** ESLint + Prettier
- **Testing:** Jest (backend) + Vitest (frontend) + Playwright (E2E)
- **Git Hooks:** Husky + lint-staged
- **CI/CD:** GitHub Actions
- **Docker:** Docker Compose for dev environment

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (LTS)
- PostgreSQL 15+
- Redis 7+
- RabbitMQ 3.12+ (optional for queue features)

### Installation

```bash
# Clone repository
git clone https://github.com/omanjaya/tilopos.git
cd tilopos

# Install dependencies
npm install

# Setup environment variables
cd packages/backend
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

### Development

```bash
# Start backend (http://localhost:3001)
npm run dev

# Start frontend (http://localhost:5173) - in new terminal
npm run dev:web

# Or use Docker Compose (recommended)
npm run docker:dev
```

### Using Docker (Recommended)

```bash
# Start all services (backend, frontend, postgres, redis, rabbitmq)
npm run docker:dev

# Stop services
npm run docker:dev:down

# View logs
npm run docker:dev:logs

# Clean volumes (nuclear option)
docker compose -f docker-compose.dev.yml down -v
```

**Accessing Services:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- RabbitMQ UI: http://localhost:15672 (user: tilo, pass: tilopass)

### Default Credentials

After seeding, you can login with:

**Super Admin:**
- Email: `admin@tilopos.com`
- Password: `admin123`

**Manager:**
- Email: `manager@outlet1.com`
- Password: `manager123`

**Cashier:**
- Email: `cashier@outlet1.com`
- Password: `cashier123`

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
├── Docs/                     # Design & architecture docs
│   ├── 01-SYSTEM-DESIGN.md
│   ├── 02-LAYERED-ARCHITECTURE.md
│   ├── 05-DATABASE-SCHEMA.md
│   └── ui/                   # UI/UX documentation
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
npm run lint             # Lint all workspaces
npm run test             # Test all workspaces

# Backend
cd packages/backend
npm run dev              # Start with hot reload
npm run build            # Build for production
npm run lint             # ESLint
npm run test             # Unit tests
npm run test:e2e         # E2E tests
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database
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

See [CLAUDE.md](./CLAUDE.md) for detailed development guidelines.

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

### Architecture Docs
- [System Design](./Docs/01-SYSTEM-DESIGN.md) - Overall architecture
- [Layered Architecture](./Docs/02-LAYERED-ARCHITECTURE.md) - Clean architecture layers
- [Database Schema](./Docs/05-DATABASE-SCHEMA.md) - ERD & table descriptions

### Development Docs
- [Clean Code Practices](./Docs/03-CLEAN-CODE-PRACTICES.md) - Coding standards
- [Shared Components](./Docs/04-SHARED-COMPONENTS.md) - UI component library
- [UI/UX Design](./Docs/06-UI-UX-DESIGN.md) - Design system

### Feature Docs
- [God Class Audit](./Docs/11-GOD-CLASS-AUDIT.md) - Code quality improvements
- [UX Improvements](./Docs/08-UX-IMPROVEMENTS-PLAN.md) - UX enhancement roadmap

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

# E2E tests
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

### Test Coverage Goals

- Unit Tests: >80% coverage
- Integration Tests: Critical paths
- E2E Tests: Happy paths & key user flows

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

**Backend** (`.env`):
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/tilopos

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# AWS S3 (optional)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=your-bucket

# Sentry (optional)
SENTRY_DSN=your-sentry-dsn

# RabbitMQ (optional)
RABBITMQ_URL=amqp://user:pass@host:5672
```

**Frontend** (`.env`):
```bash
VITE_API_URL=https://api.yourdomain.com
VITE_CDN_URL=https://cdn.yourdomain.com
```

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

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
- Ensure all tests pass
- Follow coding standards

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Backend framework
- [React](https://react.dev/) - Frontend library
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Prisma](https://www.prisma.io/) - Database ORM
- [TanStack Query](https://tanstack.com/query) - Data fetching

---

## 📞 Support

- **Documentation:** [Docs](./Docs/)
- **Issues:** [GitHub Issues](https://github.com/omanjaya/tilopos/issues)
- **Email:** support@tilopos.com

---

<div align="center">

Made with ❤️ for UMKM Indonesia

**[⬆ Back to Top](#tilopos---modern-point-of-sale-system)**

</div>
