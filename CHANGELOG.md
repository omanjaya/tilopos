# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Remediation of the 26 September 2026 audit
([Docs/audit/AUDIT-KEKURANGAN-2026-09-26.md](./Docs/audit/AUDIT-KEKURANGAN-2026-09-26.md)).
Engineering rules that came out of it: [Docs/ENGINEERING-RULES.md](./Docs/ENGINEERING-RULES.md).

### Changed

- License is now proprietary (all rights reserved); the MIT LICENSE file and README badge were inconsistent with `"license": "UNLICENSED"`.

### Security
- Browser access tokens now stay in memory; rotating httpOnly/Secure/SameSite refresh cookies
  use hashed server-side families with atomic reuse detection and logout revocation. Offline
  sales retain their original operator across refresh and account changes. `JWT_EXPIRES_IN`
  remains unchanged by owner decision; the proposed 15-minute lifetime is deferred.
- MFA and e-mail verification tokens are no longer accepted as access tokens; JWT is the first
  global guard, followed by roles, business scope and feature guards. Unauthenticated routes are
  explicit (`@Public()`) and every mutating route declares its roles (enforced by a unit test).
- Tenant isolation: cross-business / cross-outlet access (IDOR) closed across POS, orders,
  inventory, customers, settlements, online store and more via a shared `TenantAccessService`
  and a Prisma guard that rejects unscoped queries.
- Prices, discounts, promotions and vouchers are computed on the server; cashiers can no longer
  submit their own selling price.
- Production refuses to boot with missing/unsafe configuration (env validation) and no longer
  falls back to the mock payment gateway.
- The destructive demo seed only runs with `ALLOW_DESTRUCTIVE_SEED=true` outside production;
  `prisma migrate reset` needs the same flag.

### Fixed
- Scheduled sales, financial and inventory reports now generate PDF attachments and send
  through configured SMTP at 07:00 WIB. Durable claims prevent concurrent delivery;
  missing SMTP and uncertain outcomes are visible in settings instead of fake success.
- PDF generation awaits the installed asynchronous printer; email delivery checks SMTP
  acceptance, and exports reject oversized result sets instead of exhausting memory.
- Held bills now sync through tenant/outlet-scoped server APIs with server-priced snapshots,
  offline drafts, atomic claims and retry recovery; logout and 24-hour expiry no longer lose them.
- Settlement cron ran twice; double refunds; negative quantities at online-store checkout;
  offline POS sales never reaching the server; service worker caching `/api` responses.
- Business-day reports and crons now use Asia/Jakarta; crons take a distributed lock so they
  run once per cluster instead of once per replica.
- Web build (`tsc -b`) errors and vitest picking up Playwright specs.

### Changed - database (migration `20260927000000_audit_2026_09_schema_hardening`)
- Official migration for `transfer_templates`; per-tenant unique document numbers (receipts,
  invoices, work orders, tickets, outlet codes, vouchers); new FK indexes; explicit `onDelete`
  policies; idempotency key `clientTransactionId` and `refundOfId` on transactions;
  `migration_lock.toml` is now committed.

### Changed - infrastructure & tooling
- One Node.js LTS everywhere: 22 (`.nvmrc`, `engines`, CI, Dockerfiles).
- Dockerfiles build from the repository root with `npm ci` and the workspace lockfile, pinned base
  images, `HEALTHCHECK`, non-root users, `TZ=Asia/Jakarta`; migrations no longer run in the
  backend `CMD` (compose `migrate` service / k8s init container instead).
- Web image uses unprivileged nginx on port 8080 with a `/health` endpoint and a configurable
  backend upstream (`BACKEND_UPSTREAM`).
- `prisma`, `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` moved to runtime
  dependencies; unused `react-shepherd` / `shepherd.js` (AGPL-3.0) removed, and the redundant
  direct `react-router` dependency dropped (the app imports `react-router-dom` only).
- Kubernetes manifests fixed: env contract matches the code (`DATABASE_URL`, `JWT_EXPIRES_IN`,
  `CORS_ORIGIN`, S3/SMTP key names), probes on `/api/v1/health/live|ready`, ServiceAccount,
  RWX uploads PVC, UID alignment, Redis StatefulSet with password + `noeviction`,
  NetworkPolicies, PodDisruptionBudgets, nightly backup CronJob to a dedicated bucket, no
  gitignored file referenced by kustomize, no `:latest` images.
- CI re-enabled: lint without `--fix`, backend typecheck + unit tests, integration tests against
  Postgres/Redis (non-blocking for now), web vitest + build, Docker image builds, `npm audit`
  (non-blocking). The stale `ci-cd.yml.disabled` was removed. Dependabot, CODEOWNERS and a PR
  template were added.
- ELK: credentials for Kibana/Logstash, `tilo-logs-*` index, shared network with the app.
- Root `.env.example` for docker compose; backend `.env.example` covers every variable the code reads.
- RabbitMQ image upgraded to 4.1 (3.x is end of life). Existing 3.x volumes must have all feature
  flags enabled before upgrading, or be recreated in development.

### Documentation
- `docs/` merged into `Docs/`; stray refactoring notes moved to `Docs/archive/`.
- README: working setup steps, real seeded logins, fixed links, no CD claim.
- Backup & restore runbook: `Docs/operations/backup-restore.md`; deployment guide:
  `Docs/operations/deployment.md`.
- Progress tracker no longer lists GoFood / GrabFood / ShopeeFood and other stubs as done.

### Planned
- Mobile app (iOS & Android)
- Desktop app (Electron)
- Multi-language support
- Advanced analytics dashboard
- Integration with accounting software

---

## [0.1.0] - 2026-02-06

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
- ✅ **LICENSE** - Proprietary (all rights reserved)
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

## [0.1.0-beta] - 2026-02-01

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

## [0.1.0-alpha] - 2026-01-30

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
| **0.1.0** | 2026-02-06 | Security fixes, NestJS v11, Documentation |
| **0.1.0-beta** | 2026-02-01 | UX improvements, Code refactoring |
| **0.1.0-alpha** | 2026-01-30 | Core features implementation |

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
