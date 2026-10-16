# TiloPOS Documentation Index

> **Last Updated:** 27 September 2026
> **Project Status:** Belum siap produksi — lihat [Audit Kekurangan 2026-09-26](./audit/AUDIT-KEKURANGAN-2026-09-26.md).
> Angka persentase lama di bawah bersifat historis.

This is the single documentation root (the former lowercase `docs/` folder was merged
into `Docs/`). Main entry points:

| Topic | Document |
|-------|----------|
| Engineering rules (wajib dibaca) | [ENGINEERING-RULES.md](./ENGINEERING-RULES.md) |
| Latest audit & remediation list | [audit/AUDIT-KEKURANGAN-2026-09-26.md](./audit/AUDIT-KEKURANGAN-2026-09-26.md) |
| Feature docs per modul (sales pitch, user guide, feature audit) | [index.md](./index.md#peta-fitur) |
| Deployment (Docker Compose / Kubernetes) | [operations/deployment.md](./operations/deployment.md) |
| Backup & restore runbook | [operations/backup-restore.md](./operations/backup-restore.md) |
| Historical / superseded documents | [archive/](./archive/) |

---

## 📁 Documentation Structure

```
Docs/
├── 00-INDEX.md                           # You are here
├── index.md                              # Feature docs overview (modules 01-13)
├── 01-pos/ … 13-kds/                     # Per-module sales-pitch / user-guide / feature-audit
├── sales/                                # Sales material (business types, pricing, comparison)
├── ENGINEERING-RULES.md                  # Engineering rules
├── audit/                                # Audit reports
├── operations/                           # Deployment & backup/restore runbooks
├── archive/                              # Historical docs (not maintained)
├── security/                             # Security audit phases
├── analisa/                              # UX/system analysis
├── research/                             # Research & Analysis
│   └── 01-moka-pos-analysis.md          # Competitor analysis
├── architecture/                         # System Architecture
│   ├── 01-system-design.md              # High-level design
│   ├── 02-layered-architecture.md       # Layer patterns
│   ├── 03-clean-code-practices.md       # Coding standards
│   └── 04-integration-workflow.md       # Integration docs + diagrams
├── database/                             # Database Design
│   └── 01-database-schema.md            # Schema & ERD
├── ui/                                   # UI/UX Documentation
│   ├── 00-UI-UX-STRATEGY.md             # Strategy overview
│   ├── 01-RESPONSIVE-DESIGN.md          # Responsive patterns
│   ├── 02-DESIGN-SYSTEM.md              # Design tokens
│   ├── 03-SHARED-COMPONENTS.md          # Component library
│   ├── 04-LOADING-STATES.md             # Loading patterns
│   ├── 05-ACCESSIBILITY.md              # A11y guidelines
│   ├── 06-UI-IMPLEMENTATION-PLAN.md     # Implementation plan
│   ├── 07-COMPONENT-CLEANUP-FINDINGS.md # Cleanup notes
│   ├── 08-ACCESSIBILITY-IMPLEMENTATION.md # A11y implementation
│   ├── 09-LIGHTHOUSE-AUDIT-RESULTS.md   # Performance audit
│   └── 10-LIGHTHOUSE-IMPROVEMENTS-RESULTS.md # Improvements
├── maintenance/                          # Maintenance & Security
│   ├── 01-god-class-audit.md            # Code quality audit
│   ├── 02-report-improvements.md        # Report system fixes
│   ├── 03-ux-polish-guide.md            # UX polish & migration
│   └── 04-security.md                   # Security guidelines
└── progress/                             # Progress Tracking
    ├── 01-progress-tracker.md           # Main progress tracker
    ├── 02-implementation-summary.md     # Implementation details
    └── 03-ux-improvements-plan.md       # UX improvements plan
├── 10-BUSINESS-TYPE-CONFIGURATION.md     # Universal POS & Feature Toggle
```

---

## 🚀 Quick Start

### For New Developers
1. Start with [research/01-moka-pos-analysis.md](./research/01-moka-pos-analysis.md) - Understand the POS domain
2. Read [architecture/01-system-design.md](./architecture/01-system-design.md) - System overview
3. Review [architecture/03-clean-code-practices.md](./architecture/03-clean-code-practices.md) - Coding standards

### For Frontend Developers
1. [ui/02-DESIGN-SYSTEM.md](./ui/02-DESIGN-SYSTEM.md) - Design tokens & theming
2. [ui/03-SHARED-COMPONENTS.md](./ui/03-SHARED-COMPONENTS.md) - Component library
3. [ui/04-LOADING-STATES.md](./ui/04-LOADING-STATES.md) - Loading patterns

### For Backend Developers
1. [architecture/02-layered-architecture.md](./architecture/02-layered-architecture.md) - Layer patterns
2. [database/01-database-schema.md](./database/01-database-schema.md) - Database design
3. [architecture/04-integration-workflow.md](./architecture/04-integration-workflow.md) - Integration architecture

---

## 📊 Project Overview

### Vision
TiloPOS adalah sistem Point of Sale modern yang dirancang untuk bisnis F&B dan retail di Indonesia, dengan fokus pada:

- **Offline-First Architecture** - Tetap berfungsi tanpa internet
- **Multi-Outlet Support** - Kelola banyak outlet dari satu dashboard
- **Real-time Sync** - WebSocket untuk update instan
- **Integration Ready** - Xendit, Midtrans (GoFood/GrabFood/ShopeeFood masih stub, belum diimplementasikan)

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, TanStack Query, Zustand |
| Backend | NestJS, Prisma ORM, PostgreSQL, Redis |
| Real-time | Socket.IO, RabbitMQ |
| Infrastructure | Docker, Kubernetes, GitHub Actions |

### Completion Status

| Module | Status |
|--------|--------|
| POS Terminal | ✅ 95% |
| Inventory | ✅ 95% |
| Orders & KDS | ✅ 90% |
| Reports | ✅ 95% |
| Payments | ✅ 75% |
| Integrations | 🔄 marketplace (GoFood/GrabFood/ShopeeFood) masih stub |
| Mobile App | ⏳ 0% |

---

## 📚 Documentation Categories

### 🔬 Research
Analisis kompetitor dan riset pasar sebelum development.

| Document | Description |
|----------|-------------|
| [01-moka-pos-analysis.md](./research/01-moka-pos-analysis.md) | Deep dive Moka POS features, pricing, workflows |

### 🏗️ Architecture
Dokumentasi arsitektur sistem dan coding standards.

| Document | Description |
|----------|-------------|
| [01-system-design.md](./architecture/01-system-design.md) | High-level architecture, tech stack, subsystems |
| [02-layered-architecture.md](./architecture/02-layered-architecture.md) | Clean architecture patterns, layer responsibilities |
| [03-clean-code-practices.md](./architecture/03-clean-code-practices.md) | Naming conventions, error handling, testing |
| [04-integration-workflow.md](./architecture/04-integration-workflow.md) | Event-driven architecture, integration diagrams |

### 🗄️ Database
Desain database dan entity relationships.

| Document | Description |
|----------|-------------|
| [01-database-schema.md](./database/01-database-schema.md) | 55+ Prisma models, ERD, indexes |

### 🎨 UI/UX
Dokumentasi lengkap untuk frontend development.

| Document | Description |
|----------|-------------|
| [00-UI-UX-STRATEGY.md](./ui/00-UI-UX-STRATEGY.md) | Overall UX strategy |
| [01-RESPONSIVE-DESIGN.md](./ui/01-RESPONSIVE-DESIGN.md) | Breakpoints, mobile-first patterns |
| [02-DESIGN-SYSTEM.md](./ui/02-DESIGN-SYSTEM.md) | Colors, typography, spacing |
| [03-SHARED-COMPONENTS.md](./ui/03-SHARED-COMPONENTS.md) | Reusable component library |
| [04-LOADING-STATES.md](./ui/04-LOADING-STATES.md) | Skeleton, spinners, progress |
| [05-ACCESSIBILITY.md](./ui/05-ACCESSIBILITY.md) | WCAG guidelines, ARIA patterns |
| [06-UI-IMPLEMENTATION-PLAN.md](./ui/06-UI-IMPLEMENTATION-PLAN.md) | Phase-by-phase UI plan |

### 🔧 Maintenance
Audit, improvements, dan security guidelines.

| Document | Description |
|----------|-------------|
| [01-god-class-audit.md](./maintenance/01-god-class-audit.md) | Large file identification, refactoring plan |
| [02-report-improvements.md](./maintenance/02-report-improvements.md) | Report system fixes & enhancements |
| [03-ux-polish-guide.md](./maintenance/03-ux-polish-guide.md) | Phase 4 UX polish, migration guide |
| [04-security.md](./maintenance/04-security.md) | Security best practices, ExcelJS safety |
| [05-integration-audit.md](./maintenance/05-integration-audit.md) | **[NEW]** Integration issues, business flow analysis |

### 📈 Progress
Progress tracking dan implementation details.

| Document | Description |
|----------|-------------|
| [01-progress-tracker.md](./progress/01-progress-tracker.md) | Main progress with changelogs |
| [02-implementation-summary.md](./progress/02-implementation-summary.md) | Implementation completion matrix |
| [03-ux-improvements-plan.md](./progress/03-ux-improvements-plan.md) | Planned UX improvements |

---

## 🔗 External Resources

- **Repository:** Private GitHub repo
- **Design:** Figma (coming soon)
- **API Docs:** Swagger at `/api/docs` (when running)

---

## 📝 Contributing to Docs

When adding or updating documentation:

1. Follow the folder structure above
2. Use numbered prefixes for ordering (01-, 02-, etc.)
3. Use kebab-case for filenames
4. Include a clear header with purpose and last-updated date
5. Update this INDEX.md with new documents
