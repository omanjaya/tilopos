# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Mobile app (iOS & Android)
- Desktop app (Electron)
- Multi-language support
- Advanced analytics dashboard
- Integration with accounting software

---

## [0.1.0] - 2025-02-06

### Added - Security & Documentation 🔒📚

#### Security Fixes
- ✅ **Fixed all 14 npm security vulnerabilities** (HIGH/MODERATE)
  - Replaced vulnerable `xlsx` library with secure `exceljs`
  - Upgraded `bcrypt` to v6.0.0 (fixed tar path traversal)
  - Fixed `glob` command injection vulnerability
  - **Result: 0 vulnerabilities** 🎉

#### Major Upgrades
- ✅ **Upgraded to NestJS v11** (from v10)
  - All @nestjs packages updated to v11
  - Fixed breaking changes in JWT, interceptors, and observables
  - Deduplicated dependencies
  - All builds passing

#### Documentation
- ✅ **Comprehensive README.md** with badges
  - Complete feature documentation
  - Quick start guide with Docker
  - Architecture overview
  - Development workflow

- ✅ **CONTRIBUTING.md** - Detailed contribution guide
  - Code of conduct
  - Development setup
  - Coding standards
  - Commit guidelines
  - PR process

- ✅ **CHANGELOG.md** - Version history (this file)
- ✅ **SECURITY.md** - Security policy
- ✅ **LICENSE** - MIT License
- ✅ **GitHub Issue Templates** - Bug report & feature request

#### Repository Cleanup
- ✅ Removed `.agent/` directory from tracking (15 files)
- ✅ Removed log files from tracking
- ✅ Updated `.gitignore` with comprehensive exclusions
- ✅ Clean, professional repository structure

### Changed

#### Excel Export
- **Replaced** `xlsx` with `exceljs` for security
- **Improved** export functionality with better styling
- **Added** async/await support for export operations

#### Code Quality
- **Fixed** all ESLint `no-explicit-any` violations
- **Improved** TypeScript strict type checking
- **Resolved** peer dependency conflicts

---

## [0.1.0-beta] - 2025-02-01

### Added - UX Improvements & Code Quality ✨

#### UX Features (Phase 1-5 Complete)
- ✅ **Onboarding Wizard** - 4-step setup for new users
- ✅ **Product Tours** - Interactive tutorials with Shepherd.js
- ✅ **Command Palette** - ⌘K quick navigation
- ✅ **Keyboard Shortcuts** - Global shortcuts + help dialog (⌘/)
- ✅ **User Profile** - Self-service account settings
- ✅ **Help Center** - Tutorial library & contextual help
- ✅ **Breadcrumbs** - Auto-generated navigation

#### Performance Optimizations
- ✅ **Bundle Splitting** - Manual chunks for better caching
  - React vendor bundle
  - UI vendor bundle
  - Chart vendor bundle
  - PDF vendor bundle
  - **Result**: 97% reduction on payment-report chunk

- ✅ **Lighthouse Optimizations**
  - Performance: 85/100 → 92/100
  - Accessibility: 95/100 → 98/100
  - Best Practices: 100/100
  - SEO: 100/100

#### Code Refactoring (God Class Elimination)
- ✅ **Phase 1** - Critical files >1000 LOC (6 files)
  - `seed.ts` → 11 seeders (1,828 → avg 185 lines)
  - `reports.controller.ts` → 10 controllers
  - `storefront-page.tsx` → 18 files
  - `kds-page.tsx` → 13 files
  - `pos-page.tsx` → 8 files
  - `sync-engine.service.ts` → 5 services

- ✅ **Phase 2** - Warning level 500-1000 LOC (12 files)
  - Backend: 7 services refactored
  - Frontend: 5 components refactored
  - **Total**: 18 god classes eliminated
  - **Impact**: 249 files changed, +27K/-9K lines
  - **Documentation**: 40+ new doc files created

---

## [0.1.0-alpha] - 2025-01-30

### Added - Core Features 🚀

#### Point of Sale (POS)
- ✅ Quick sales interface
- ✅ Product grid with categories & search
- ✅ Variants & modifiers support
- ✅ Multiple payment methods (cash, card, QRIS, e-wallet)
- ✅ Hold/Resume transactions
- ✅ Split bill functionality
- ✅ Keyboard shortcuts (F1-F12)

#### Kitchen Display System (KDS)
- ✅ Real-time order display
- ✅ Bump system for order completion
- ✅ Station management
- ✅ Priority indicators
- ✅ Sound notifications
- ✅ Timer display

#### Reports & Analytics
- ✅ Sales reports (daily/monthly)
- ✅ Financial reports (revenue, cost, profit, margin)
- ✅ Product performance reports
- ✅ Payment method breakdown
- ✅ Export to PDF, Excel, Print
- ✅ Date range filters

#### Customer Management
- ✅ Customer database
- ✅ Purchase history
- ✅ Loyalty program (points & tiers)
- ✅ Customer segments (VIP, Regular, New, At-Risk, Churned)
- ✅ Birthday tracking
- ✅ Import/Export (CSV/JSON)

#### Inventory Management
- ✅ Stock tracking
- ✅ Low stock alerts
- ✅ Stock transfers between outlets
- ✅ Stock adjustments
- ✅ Supplier management
- ✅ Multi-outlet support

#### Online Features
- ✅ Self-order (QR code)
- ✅ Online store
- ✅ Order management
- ✅ Table management
- ✅ Waiting list system

#### User Management
- ✅ Role-based access control
- ✅ Multi-outlet support
- ✅ Employee management
- ✅ Audit logs
- ✅ 2FA/MFA support

### Technical

#### Backend
- ✅ NestJS 10 + TypeScript
- ✅ PostgreSQL 15 + Prisma ORM
- ✅ Redis caching
- ✅ RabbitMQ message queue
- ✅ JWT authentication
- ✅ Socket.io real-time
- ✅ Sentry monitoring

#### Frontend
- ✅ React 18 + TypeScript + Vite
- ✅ Zustand + TanStack Query
- ✅ shadcn/ui + Radix UI
- ✅ Tailwind CSS
- ✅ React Router v7
- ✅ PWA support (offline-first)

#### DevOps
- ✅ Docker Compose development environment
- ✅ ESLint + Prettier
- ✅ Husky + lint-staged
- ✅ Jest + Vitest + Playwright
- ✅ GitHub Actions CI/CD

---

## Version History Summary

| Version | Date | Description |
|---------|------|-------------|
| **0.1.0** | 2025-02-06 | Security fixes, NestJS v11, Documentation |
| **0.1.0-beta** | 2025-02-01 | UX improvements, Code refactoring |
| **0.1.0-alpha** | 2025-01-30 | Core features implementation |

---

## Links

- [Repository](https://github.com/omanjaya/tilopos)
- [Issues](https://github.com/omanjaya/tilopos/issues)
- [Releases](https://github.com/omanjaya/tilopos/releases)
- [Documentation](./Docs/)

---

## Notes

### Semantic Versioning

- **MAJOR** version (1.0.0) - Incompatible API changes
- **MINOR** version (0.1.0) - New features, backward compatible
- **PATCH** version (0.0.1) - Bug fixes, backward compatible

### Types of Changes

- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security fixes

---

<div align="center">

**[⬆ Back to Top](#changelog)**

</div>
