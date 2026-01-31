# Tech Stack Rules - MokaPOS

## Backend

* Runtime: Node.js dengan TypeScript
* Framework: NestJS (WAJIB — jangan gunakan Express langsung)
* Database: PostgreSQL 15+ dengan Prisma ORM
* Cache: Redis 7+
* Message Queue: RabbitMQ
* Search: Elasticsearch
* File Storage: AWS S3 / MinIO
* Auth: JWT (Access + Refresh Token), RBAC

## Frontend

* Web Backoffice: React 18 + TypeScript
* POS Terminal: Electron + React
* Mobile: React Native
* KDS: React + WebSocket (Socket.io)
* State Management: Zustand (BUKAN Redux)
* UI: Custom Design System (BUKAN Material UI / Ant Design)
* Icons: Lucide Icons (BUKAN FontAwesome / Material Icons)
* Styling: CSS-in-JS atau Tailwind CSS
* Font: Inter (sans-serif), JetBrains Mono (monospace)

## Database Conventions

* Primary key: UUID (`gen_random_uuid()`)
* Timestamp: TIMESTAMPTZ dengan DEFAULT NOW()
* Soft delete: gunakan `is_active BOOLEAN DEFAULT true`, BUKAN deleted_at
* JSONB untuk data flexible (settings, metadata, permissions)
* Semua tabel harus punya: `id`, `created_at`, `updated_at` (kecuali log tables)
* Index wajib untuk: foreign keys, kolom yang sering di-query, composite untuk common queries
* Gunakan partial index untuk status-based queries

## API Design

* RESTful API dengan versioning: `/api/v1/`
* Response format: `{ data, meta, error }`
* Pagination: cursor-based untuk list endpoints
* Error response: `{ statusCode, code, message, details }`
* Rate limiting di API Gateway level

## Offline-First

* Local storage: SQLite (mobile/desktop), IndexedDB (web)
* Sync strategy: optimistic UI, background sync queue
* Conflict resolution: Last-Write-Wins + Manual untuk critical data
* Delta sync untuk efficiency
