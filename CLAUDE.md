# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Rules

- NEVER create markdown files (.md) or any documentation files unless explicitly requested by the user.

## Project Overview

TiloPOS — a modern Point of Sale system for SME/UMKM businesses in Indonesia. Key differentiators: built-in Kitchen Display System (KDS), offline-first architecture, modern UI with dark mode, better refund handling, multi-platform (Web, iOS, Android, Desktop).

**Status:** Planning/documentation phase. No source code implemented yet — only design documents exist in `Docs/`.

## Planned Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + NestJS + TypeScript (strict mode) |
| Database | PostgreSQL 15+ with Prisma ORM |
| Cache | Redis 7+ |
| Message Queue | RabbitMQ |
| Search | Elasticsearch |
| Web Frontend | React 18 + TypeScript, Zustand for state |
| Desktop POS | Electron + React |
| Mobile | React Native |
| KDS | React (WebSocket-based real-time) |
| Icons | Lucide Icons |

## Planned Commands

```bash
npm install          # Install dependencies
cp .env.example .env # Setup environment
npm run db:migrate   # Run database migrations
npm run dev          # Start development server
```

## Architecture

**Clean Architecture** with 4 layers — dependency flows inward only:

```
Presentation → Application → Domain → Infrastructure
```

- **Presentation** (`src/presentation/`): UI for web backoffice, POS terminal (Electron), KDS displays, and mobile (React Native)
- **Application** (`src/application/`): Use cases, DTOs, mappers, services. Each use case is a single class with an `execute()` method. Organized by domain: pos, inventory, orders, kds, customers, employees, promotions, tables, billing, self-order, online-store, ingredients, suppliers, stock-transfers, devices, notifications, audit, settlements, reports
- **Domain** (`src/domain/`): Entities, value objects (Money, SKU, etc.), aggregates, business rules, domain events, repository interfaces
- **Infrastructure** (`src/infrastructure/`): Prisma repositories, Redis cache, payment gateway adapters, marketplace adapters (GoFood, GrabFood, ShopeeFood), social commerce adapters, hardware integrations (thermal printer, barcode scanner), shipping service, offline sync

**NestJS Modules** (`src/modules/`): Feature-based organization — auth, pos, inventory, orders, kds, tables, customers, employees, promotions, reports, settings, integrations, self-order, online-store, ingredients, suppliers, stock-transfers, devices, notifications, audit, settlements.

**Microservices**: Auth, POS, Inventory, Order, KDS, Customer, Employee, Analytics, Promotion, Payment, Notification, Integration, Self-Order, Online Store, Device, Audit, Settlement.

## Key Patterns

- **Use Case pattern**: Each business operation is a dedicated use case class with constructor-injected dependencies and a single `execute()` method
- **Repository pattern**: Domain defines interfaces (`ITransactionRepository`), infrastructure implements them (`PrismaTransactionRepository`)
- **Event-driven**: Transaction creation triggers events consumed by Inventory, Loyalty, Analytics, and KDS services via RabbitMQ
- **Offline-first**: Local SQLite/IndexedDB with sync engine, conflict resolution (Last-Write-Wins + Manual), delta sync
- **Multi-tenancy**: All entities scoped by `business_id`
- **Audit trail**: All sensitive operations (void, refund, discount, stock adjust) logged to `audit_logs` with old/new values
- **Stock Transfer workflow**: Request → Approve → Ship → Receive with multi-step validation
- **Partial refund**: Supports per-item refund with proportional tax/discount recalculation, store credit via credit notes
- **Split/Merge bill**: Child transactions linked to parent, per-split payment processing
- **Self-order**: QR code session-based, customer-facing menu with modifier selection, auto-sends to POS & KDS
- **Ingredient auto-deduction**: Recipe-based ingredient tracking, auto-deducts raw materials on product sale

## Conventions

- **Classes/Interfaces**: PascalCase. Interfaces prefixed with `I` (e.g., `ITransactionRepository`)
- **Functions**: camelCase, verb-first (e.g., `createTransaction`, `calculateDiscount`)
- **Constants**: UPPER_SNAKE_CASE
- **DB tables**: snake_case, plural (e.g., `product_variants`)
- **API endpoints**: kebab-case (e.g., `/api/v1/transactions`)
- **Booleans**: prefix with `is`, `has`, `can`
- **TypeScript**: strict mode, no `any`, no `console.log` in production code
- **Functions**: max 30 lines, max 3-4 parameters (use object params for more)
- **Error handling**: Custom error classes extending `AppError` with `statusCode` and `code`
- **Testing**: Arrange-Act-Assert pattern. Coverage targets: Domain 95%+, Application 85%+, Infrastructure 80%+, Presentation 70%+

## Documentation

All design documents are in `Docs/`:

| File | Contents |
|------|----------|
| `01-SYSTEM-DESIGN.md` | Architecture, tech stack, subsystems, security, scaling |
| `02-LAYERED-ARCHITECTURE.md` | Clean architecture layers, file structure, data flow, DI |
| `03-CLEAN-CODE-PRACTICES.md` | Naming, error handling, type safety, testing |
| `04-SHARED-COMPONENTS.md` | UI component library, design system, hooks |
| `05-DATABASE-SCHEMA.md` | PostgreSQL schema, entity relationships, indexes |
| `06-UI-UX-DESIGN.md` | Colors, typography, layouts, accessibility |
| `tiloposanalysis.md` | TILO competitive analysis, pain points, opportunities |

## Database

PostgreSQL with multi-tenant design. All tables have `business_id` for tenant isolation.

**Core**: `businesses`, `outlets`, `employees`, `products`, `product_variants`, `categories`, `customers`, `shifts`

**Transactions**: `transactions`, `transaction_items`, `transaction_item_modifiers`, `payments`, `payment_settlements`

**Inventory**: `stock_levels`, `stock_movements`, `stock_transfers`, `stock_transfer_items`

**Modifiers**: `modifier_groups`, `modifiers`, `product_modifier_groups`

**Ingredients**: `ingredients`, `ingredient_stock_levels`, `ingredient_stock_movements`, `recipes`, `recipe_items`

**Suppliers**: `suppliers`, `purchase_orders`, `purchase_order_items`

**Orders & KDS**: `orders`, `order_items`, `tables`, `waiting_list`

**Loyalty**: `loyalty_programs`, `loyalty_tiers`, `loyalty_transactions`

**Promotions**: `promotions`, `vouchers`

**Online**: `online_orders`, `online_stores`, `store_orders`, `store_order_items`, `self_order_sessions`, `self_order_items`

**System**: `devices`, `audit_logs`, `notification_settings`, `notification_logs`

## Role Hierarchy

Super Admin > Owner > Manager > Supervisor > Cashier / Kitchen Staff / Inventory Staff. Auth uses JWT (Access + Refresh tokens) with RBAC.
