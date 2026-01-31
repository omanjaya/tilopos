# Architecture Rules - MokaPOS

## Clean Architecture (WAJIB)

* Project ini menggunakan Clean Architecture 4 layer: Presentation → Application → Domain → Infrastructure
* Dependency hanya boleh mengalir ke dalam (inward): Presentation → Application → Domain ← Infrastructure
* Domain layer TIDAK BOLEH import dari layer lain
* Infrastructure layer implement interface dari Domain layer

## Layer Rules

### Domain Layer (`src/domain/`)
* Berisi: Entities, Value Objects, Aggregates, Interfaces, Events, Rules, Exceptions
* TIDAK BOLEH import NestJS, Prisma, atau library external apapun
* Entity harus immutable — gunakan method untuk perubahan state
* Value Objects harus immutable dan comparable by value

### Application Layer (`src/application/`)
* Berisi: Use Cases, DTOs, Mappers, Services
* Setiap use case = 1 class dengan method `execute()`
* Use case menerima input DTO, return output DTO
* Dependency injection via constructor — inject interfaces, bukan implementations

### Infrastructure Layer (`src/infrastructure/`)
* Berisi: Prisma Repositories, Redis Cache, External API Adapters, Hardware Services
* Implement interfaces yang didefinisikan di Domain layer
* Repository menggunakan Prisma ORM
* Semua external call harus di-wrap dalam adapter pattern

### Presentation Layer (`src/presentation/`)
* Web Backoffice: React 18 + TypeScript
* POS Terminal: Electron + React
* KDS Display: React + WebSocket
* Mobile: React Native
* State management: Zustand
* Icons: Lucide Icons

## NestJS Module Structure

* Setiap feature = 1 NestJS Module (`*.module.ts`)
* Module berisi: Controller, Use Cases, Services, Repository Providers
* Repository di-bind via interface: `{ provide: 'ITransactionRepository', useClass: PrismaTransactionRepository }`
* Module list: auth, pos, inventory, orders, kds, tables, customers, employees, promotions, reports, settings, integrations, self-order, online-store, ingredients, suppliers, stock-transfers, devices, notifications, audit, settlements

## Multi-Tenancy

* SEMUA data query harus di-filter by `business_id`
* Jangan pernah query tanpa tenant filter kecuali super admin
* Outlet-level data juga harus di-filter by `outlet_id`

## Event-Driven

* Gunakan RabbitMQ untuk async events antar service
* Event pattern: `EntityNameActionEvent` (contoh: `TransactionCreatedEvent`, `StockLevelChangedEvent`)
* Event handler harus idempotent
