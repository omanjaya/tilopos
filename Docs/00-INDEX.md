# TiloPOS - Documentation Index

> **Version:** 1.0  
> **Last Updated:** January 2026  
> **Status:** Development Phase - ~15% Complete

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01-SYSTEM-DESIGN.md](./01-SYSTEM-DESIGN.md) | High-level architecture, tech stack, subsystems |
| [02-LAYERED-ARCHITECTURE.md](./02-LAYERED-ARCHITECTURE.md) | Clean architecture layers, module organization |
| [03-CLEAN-CODE-PRACTICES.md](./03-CLEAN-CODE-PRACTICES.md) | Naming conventions, error handling, testing |
| [04-SHARED-COMPONENTS.md](./04-SHARED-COMPONENTS.md) | Design system, UI components, hooks |
| [05-DATABASE-SCHEMA.md](./05-DATABASE-SCHEMA.md) | PostgreSQL schema, all tables, indexes |
| [06-UI-UX-DESIGN.md](./06-UI-UX-DESIGN.md) | Colors, typography, layouts, accessibility |
| [07-PROGRESS.md](./07-PROGRESS.md) | Progress tracker, completion matrix, next steps |

---

## Project Overview

**TiloPOS** is a modern Point of Sale system designed for SME & UMKM businesses in Indonesia. This project aims to address the pain points of existing POS solutions while delivering enterprise-grade features.

### Key Differentiators

| Feature | Description |
|---------|-------------|
| **Kitchen Display System** | Built-in KDS from day one (competitor gap) |
| **Offline-First** | Full functionality without internet |
| **Better Refunds** | Proper partial refund handling |
| **Modern UI** | Premium design with dark mode |
| **Multi-Platform** | Web, iOS, Android, Desktop |

---

## Technology Stack Summary

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js + NestJS + TypeScript |
| **Database** | PostgreSQL 15+ |
| **Cache** | Redis 7+ |
| **Frontend Web** | React 18 + TypeScript |
| **Mobile** | React Native |
| **Desktop** | Electron |
| **Icons** | Lucide Icons (premium, open-source) |

---

## Development Phases

| Phase | Scope | Timeline |
|-------|-------|----------|
| **Phase 1** | Core POS + Inventory | 3-4 months |
| **Phase 2** | Employee + CRM + Promo | 2 months |
| **Phase 3** | Kitchen Display (KDS) | 2 months |
| **Phase 4** | Multi-outlet + Reports | 2 months |
| **Phase 5** | Analytics + AI | 2 months |
| **Phase 6** | Marketplace Integration | 2 months |
| **Phase 7** | Mobile Apps | 3 months |

**Total:** 12-18 months for enterprise-ready product

---

## Core Features Checklist

### POS & Transactions
- [x] Product catalog with variants
- [ ] Multi-payment support (Cash, QRIS, E-Wallet) — backend done, UI belum
- [ ] Receipt printing (thermal)
- [ ] Discount & promotion engine — partial
- [x] Refund handling (full & partial) — backend done

### Inventory Management
- [x] Real-time stock tracking — backend done
- [x] Low stock alerts — backend done
- [ ] Barcode scanner integration
- [x] Stock transfer between outlets — backend done
- [ ] Ingredient/recipe management — schema done, logic partial

### Kitchen Display System (KDS)
- [ ] Real-time order display — WebSocket gateway done, UI belum
- [ ] Station-based routing
- [ ] Cooking timer per item
- [x] Bump/complete functionality — backend done
- [ ] Kitchen performance analytics

### Employee Management
- [x] Role-based access control — done (7 roles)
- [x] Shift management — backend done
- [x] PIN-based login — done
- [ ] Sales per employee tracking

### Customer & Loyalty
- [x] Customer database — basic CRUD done
- [ ] Loyalty points system — schema done
- [ ] Tier-based rewards — schema done
- [ ] Purchase history

### Reporting & Analytics
- [x] Sales reports — backend done
- [x] Inventory reports — backend done
- [ ] Employee performance
- [x] Dashboard with KPIs — basic frontend done

---

## Design Principles

1. **Stability First** - Zero tolerance for downtime
2. **Speed Optimized** - Fast POS for retail/F&B context
3. **Offline Capable** - Works without internet
4. **Touch Friendly** - Large tap targets, gesture support
5. **Premium Aesthetics** - Modern design, no generic look

---

## Getting Started

```bash
# Clone repository
git clone https://github.com/[org]/tilopos.git

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

---

## Contact & Support

- **Project Lead:** [TBD]
- **Technical Lead:** [TBD]
- **Repository:** [TBD]

---

> **Status:** In Development — see [07-PROGRESS.md](./07-PROGRESS.md) for detailed progress
