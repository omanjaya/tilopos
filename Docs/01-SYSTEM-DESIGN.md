# System Design - TiloPOS

> **Version:** 1.0  
> **Last Updated:** January 2026  
> **Status:** Planning Phase

---

## 1. System Overview

### 1.1 Vision Statement
Build a modern, reliable, and scalable Point of Sale system that addresses the pain points identified in existing solutions while providing enterprise-grade features for SME & UMKM businesses in Indonesia.

### 1.2 Core Objectives
| Objective | Description |
|-----------|-------------|
| **Stability First** | Zero tolerance for downtime, bulletproof architecture |
| **Feature Complete** | Include KDS (Kitchen Display System) from day one |
| **Modern UX** | Contemporary design with dark mode support |
| **Offline First** | Full functionality without internet connection |
| **Multi-Platform** | Support iOS, Android, Web, and Desktop |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│   Web App       │   iOS App       │   Android App   │   Desktop App       │
│   (React)       │   (React Native)│   (React Native)│   (Electron)        │
└────────┬────────┴────────┬────────┴────────┬────────┴──────────┬──────────┘
         │                 │                 │                   │
         └─────────────────┴─────────────────┴───────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY                                       │
│                    (Kong / AWS API Gateway)                                  │
│    ┌──────────────────────────────────────────────────────────────────┐    │
│    │  Rate Limiting │ Authentication │ Load Balancing │ SSL/TLS      │    │
│    └──────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVICE LAYER                                       │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│   Auth Service  │   POS Service   │   Inventory     │   Order Service     │
│                 │                 │   Service       │                     │
├─────────────────┼─────────────────┼─────────────────┼─────────────────────┤
│   Customer      │   Employee      │   Analytics     │   Kitchen Display   │
│   Service       │   Service       │   Service       │   Service (KDS)     │
├─────────────────┼─────────────────┼─────────────────┼─────────────────────┤
│   Promotion     │   Payment       │   Notification  │   Integration       │
│   Service       │   Service       │   Service       │   Service           │
├─────────────────┼─────────────────┼─────────────────┼─────────────────────┤
│   Self-Order    │   Online Store  │   Device        │   Audit             │
│   Service       │   Service       │   Service       │   Service           │
└────────┬────────┴────────┬────────┴────────┬────────┴──────────┬──────────┘
         │                 │                 │                   │
         └─────────────────┴─────────────────┴───────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│   PostgreSQL    │   Redis         │   Elasticsearch │   AWS S3            │
│   (Primary DB)  │   (Cache/Queue) │   (Search)      │   (File Storage)    │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────┘
```

---

## 3. Technology Stack

### 3.1 Backend Infrastructure

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Runtime** | Node.js (TypeScript) | Fast execution, strong ecosystem |
| **Framework** | NestJS | Enterprise-grade, modular architecture |
| **Database** | PostgreSQL 15+ | ACID compliance, JSON support |
| **Cache** | Redis 7+ | Session management, real-time pub/sub |
| **Message Queue** | RabbitMQ | Reliable message delivery |
| **Search Engine** | Elasticsearch | Fast product/customer search |
| **File Storage** | AWS S3 / MinIO | Scalable object storage |

### 3.2 Frontend Technologies

| Platform | Technology | Notes |
|----------|------------|-------|
| **Web Backoffice** | React 18 + TypeScript | Admin dashboard |
| **POS Terminal** | React + Electron | Desktop POS application |
| **Mobile App** | React Native | iOS & Android |
| **KDS Display** | React | Kitchen display screens |
| **State Management** | Zustand | Lightweight, performant |
| **UI Library** | Custom Design System | Premium iconography |

### 3.3 DevOps & Infrastructure

| Component | Technology |
|-----------|------------|
| **Container** | Docker |
| **Orchestration** | Kubernetes (K8s) |
| **CI/CD** | GitHub Actions |
| **Monitoring** | Prometheus + Grafana |
| **Logging** | ELK Stack |
| **Cloud Provider** | AWS / GCP / DigitalOcean |

---

## 4. Core Subsystems

### 4.1 Point of Sale (POS) Engine
```
┌─────────────────────────────────────────────────────────────────┐
│                     POS ENGINE                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Cart      │  │   Payment   │  │   Receipt   │            │
│  │   Manager   │  │   Processor │  │   Generator │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                    │
│         └────────────────┼────────────────┘                    │
│                          ▼                                      │
│               ┌─────────────────────┐                          │
│               │   Transaction       │                          │
│               │   Orchestrator      │                          │
│               └─────────────────────┘                          │
│                          │                                      │
│         ┌────────────────┼────────────────┐                    │
│         ▼                ▼                ▼                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Stock     │  │   Loyalty   │  │   Promo     │            │
│  │   Deduction │  │   Points    │  │   Engine    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Kitchen Display System (KDS)
```
┌─────────────────────────────────────────────────────────────────┐
│                 KITCHEN DISPLAY SYSTEM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    WebSocket     ┌──────────────┐            │
│  │  POS Order   │ ───────────────▶ │  KDS Server  │            │
│  │  Submission  │                  │              │            │
│  └──────────────┘                  └───────┬──────┘            │
│                                            │                    │
│                    ┌───────────────────────┼───────────────┐   │
│                    ▼                       ▼               ▼   │
│             ┌──────────┐           ┌──────────┐     ┌──────────┐│
│             │ Station 1│           │ Station 2│     │ Station 3││
│             │ (Grill)  │           │ (Drinks) │     │ (Dessert)││
│             └──────────┘           └──────────┘     └──────────┘│
│                                                                  │
│  Features:                                                       │
│  • Real-time order display                                       │
│  • Cooking timer per item                                        │
│  • Order priority system                                         │
│  • Bump bar/touch completion                                     │
│  • Kitchen performance analytics                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Offline-First Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    OFFLINE-FIRST SYNC                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     CLIENT DEVICE                         │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │  │
│  │  │ SQLite/    │  │ Sync       │  │ Conflict           │  │  │
│  │  │ IndexedDB  │  │ Engine     │  │ Resolution         │  │  │
│  │  └────────────┘  └─────┬──────┘  └────────────────────┘  │  │
│  └────────────────────────┼─────────────────────────────────┘  │
│                           │                                     │
│                           ▼ (When Online)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     CLOUD SERVER                          │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │  │
│  │  │ PostgreSQL │  │ Sync       │  │ Version            │  │  │
│  │  │            │  │ Coordinator│  │ Control            │  │  │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Sync Strategy:                                                  │
│  • Optimistic UI updates                                         │
│  • Background sync queue                                         │
│  • Conflict resolution (Last-Write-Wins + Manual)                │
│  • Delta sync for efficiency                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Self-Order System (TILO Order)
```
┌─────────────────────────────────────────────────────────────────┐
│                    SELF-ORDER SYSTEM                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Customer Journey:                                               │
│                                                                  │
│  ┌──────────────┐    QR Scan     ┌──────────────┐              │
│  │  QR Code on  │ ─────────────▶ │  Self-Order  │              │
│  │  Table/Kiosk │                │  Web App     │              │
│  └──────────────┘                └───────┬──────┘              │
│                                          │                      │
│                      ┌───────────────────┼───────────────┐     │
│                      ▼                   ▼               ▼     │
│               ┌──────────┐        ┌──────────┐    ┌──────────┐│
│               │ Browse   │        │ Customize│    │ Submit   ││
│               │ Menu     │        │ & Cart   │    │ Order    ││
│               └──────────┘        └──────────┘    └────┬─────┘│
│                                                        │       │
│                                          ┌─────────────┘       │
│                                          ▼                      │
│                                   ┌──────────────┐             │
│                                   │  POS Auto-   │             │
│                                   │  Receive     │             │
│                                   └───────┬──────┘             │
│                                           │                     │
│                              ┌────────────┼────────────┐       │
│                              ▼                         ▼       │
│                       ┌──────────┐              ┌──────────┐  │
│                       │  Kitchen │              │  Payment  │  │
│                       │  (KDS)   │              │  (QRIS)   │  │
│                       └──────────┘              └──────────┘  │
│                                                                  │
│  Features:                                                       │
│  • QR code per table → unique session                           │
│  • Browse menu with images & descriptions                       │
│  • Modifier/customization selection                              │
│  • Multi-language support (ID/EN)                                │
│  • QRIS payment at table                                         │
│  • Auto-send to POS & KDS                                       │
│  • Reduce staff workload                                         │
│  • Session expiration (configurable)                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Online Store & Social Commerce
```
┌─────────────────────────────────────────────────────────────────┐
│                    ONLINE STORE SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    STOREFRONT (PWA)                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │  │
│  │  │ Product    │  │ Shopping   │  │ Checkout &         │  │  │
│  │  │ Catalog    │  │ Cart       │  │ Payment            │  │  │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    SYNC LAYER                              │  │
│  │  • Real-time product & inventory sync                     │  │
│  │  • Order sync to POS                                       │  │
│  │  • Price sync across channels                              │  │
│  │  • Stock availability update                               │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│           ┌──────────────────┼──────────────────┐              │
│           ▼                  ▼                  ▼              │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│    │  POS System  │  │  Inventory   │  │  Shipping    │      │
│    │  (Record)    │  │  (Deduct)    │  │  (Fulfill)   │      │
│    └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                                  │
│  Social Commerce Integration:                                    │
│  ├── Instagram Catalog Sync                                     │
│  ├── Facebook Shop                                               │
│  ├── Google Shopping                                             │
│  ├── Shopee (product listing sync)                              │
│  ├── Tokopedia (product listing sync)                           │
│  └── WhatsApp Catalog                                            │
│                                                                  │
│  Store Features:                                                 │
│  • Custom subdomain / own domain                                │
│  • Customizable theme & branding                                │
│  • SEO-friendly product pages                                    │
│  • Wishlist & reviews                                            │
│  • Shipping calculator integration                               │
│  • Order tracking for customers                                  │
│  • Responsive design (mobile-first)                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.6 Device Management
```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVICE MANAGEMENT                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    DEVICE REGISTRY                         │  │
│  │                                                            │  │
│  │  Supported Devices:                                        │  │
│  │  ├── POS Terminal (Android tablet, iPad, Electron)        │  │
│  │  ├── Mobile App (iOS, Android)                             │  │
│  │  ├── KDS Display (dedicated screen)                       │  │
│  │  ├── Self-Order Kiosk (tablet)                            │  │
│  │  └── Web Backoffice (browser)                              │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐  │
│  │                    OPERATIONS                              │  │
│  │                                                            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │  │
│  │  │ Register   │  │ Monitor    │  │ Remote Wipe        │  │  │
│  │  │ Device     │  │ Status     │  │ & Unregister       │  │  │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │  │
│  │                                                            │  │
│  │  Features:                                                 │  │
│  │  • Device fingerprint registration                        │  │
│  │  • Assign device to outlet                                │  │
│  │  • App version tracking                                    │  │
│  │  • Last sync & activity monitoring                        │  │
│  │  • Remote data wipe on lost/stolen device                 │  │
│  │  • Force logout from backoffice                           │  │
│  │  • Auto-reconnect on network recovery                     │  │
│  │  • Push update notification                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.7 Notification & Alert System
```
┌─────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Event Sources:                                                  │
│  ├── Low Stock Alert (threshold reached)                        │
│  ├── Large Transaction Alert (amount > threshold)               │
│  ├── Refund/Void Alert (suspicious activity)                    │
│  ├── Online Order Received (GoFood/GrabFood)                    │
│  ├── Shift Reminder (upcoming shift)                            │
│  ├── System Error (downtime/failure)                            │
│  ├── Settlement Report (daily settlement ready)                 │
│  └── Customer Birthday (loyalty reward trigger)                 │
│                                                                  │
│  Delivery Channels:                                              │
│  ├── Push Notification (mobile/desktop)                         │
│  ├── Email                                                       │
│  ├── SMS                                                         │
│  ├── WhatsApp (Business API)                                    │
│  └── In-App Notification (bell icon)                            │
│                                                                  │
│  Configuration:                                                  │
│  • Per-outlet notification rules                                │
│  • Per-employee channel preferences                             │
│  • Threshold-based triggers                                      │
│  • Scheduled reports (daily/weekly email)                       │
│  • Notification history & read tracking                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Security Architecture

### 5.1 Authentication & Authorization
```
┌─────────────────────────────────────────────────────────────────┐
│                   SECURITY LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Authentication:                                                 │
│  ├── JWT Tokens (Access + Refresh)                              │
│  ├── OAuth 2.0 / OpenID Connect                                 │
│  ├── Multi-factor Authentication (MFA)                          │
│  └── Device fingerprinting                                       │
│                                                                  │
│  Authorization:                                                  │
│  ├── Role-Based Access Control (RBAC)                           │
│  ├── Permission granularity per feature                         │
│  ├── Outlet-level access restriction                            │
│  └── API scope limiting                                          │
│                                                                  │
│  Data Protection:                                                │
│  ├── AES-256 encryption at rest                                 │
│  ├── TLS 1.3 in transit                                         │
│  ├── PCI-DSS compliance for payments                            │
│  └── GDPR-ready data handling                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Role Hierarchy
| Role | Access Level |
|------|--------------|
| **Super Admin** | Full system access, all outlets |
| **Owner** | Full access to owned business |
| **Manager** | Outlet management, reports, settings |
| **Supervisor** | Refunds, voids, employee management |
| **Cashier** | POS transactions, limited reports |
| **Kitchen Staff** | KDS access only |
| **Inventory Staff** | Stock management only |

---

## 6. Integration Architecture

### 6.1 Payment Gateway Integration
```
┌──────────────────────────────────────────────────────────────┐
│                  PAYMENT INTEGRATION                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐                                             │
│  │  Payment    │                                             │
│  │  Processor  │                                             │
│  └──────┬──────┘                                             │
│         │                                                     │
│         ├──────────▶ GoPay API                               │
│         ├──────────▶ OVO API                                 │
│         ├──────────▶ DANA API                                │
│         ├──────────▶ ShopeePay API                           │
│         ├──────────▶ LinkAja API                             │
│         ├──────────▶ QRIS Standard                           │
│         ├──────────▶ Bank Transfer (Virtual Account)         │
│         └──────────▶ Credit/Debit Card (EDC Integration)     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Third-Party Integrations
| Category | Integration |
|----------|-------------|
| **Food Delivery** | GoFood, GrabFood, ShopeeFood |
| **E-Commerce** | Shopee, Tokopedia, Lazada |
| **Accounting** | Accurate, Jurnal.id, ERPNext |
| **Communication** | WhatsApp Business, Telegram Bot |
| **Analytics** | Google Analytics, Mixpanel |

---

## 7. Scalability Design

### 7.1 Horizontal Scaling Strategy
```
┌─────────────────────────────────────────────────────────────────┐
│                  SCALABILITY ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Load Balancer (Nginx / AWS ALB)                                │
│         │                                                        │
│         ├────────▶ API Server Pod 1                             │
│         ├────────▶ API Server Pod 2                             │
│         ├────────▶ API Server Pod 3                             │
│         └────────▶ API Server Pod N (Auto-scale)                │
│                                                                  │
│  Database Scaling:                                               │
│  ├── Read Replicas for reporting                                │
│  ├── Connection Pooling (PgBouncer)                             │
│  ├── Partitioning by outlet/date                                │
│  └── Archive old transactions                                    │
│                                                                  │
│  Performance Targets:                                            │
│  ├── < 100ms API response time (95th percentile)                │
│  ├── 99.99% uptime SLA                                          │
│  ├── Support 10,000+ concurrent users                           │
│  └── Handle 1,000+ transactions/second peak                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Monitoring & Observability

### 8.1 Observability Stack
| Component | Tool | Purpose |
|-----------|------|---------|
| **Metrics** | Prometheus | System & application metrics |
| **Visualization** | Grafana | Dashboards & alerts |
| **Logging** | ELK Stack | Centralized logging |
| **Tracing** | Jaeger | Distributed tracing |
| **APM** | New Relic / Datadog | Application performance |
| **Error Tracking** | Sentry | Error monitoring |

### 8.2 Key Metrics to Monitor
- Transaction success rate
- API response times
- Error rates by service
- Database query performance
- Cache hit ratios
- System resource utilization
- Active users per outlet
- Sync queue depth (offline)

---

## 9. Disaster Recovery

### 9.1 Backup Strategy
| Data Type | Frequency | Retention |
|-----------|-----------|-----------|
| **Database** | Every 6 hours | 30 days |
| **Transaction Logs** | Real-time | 90 days |
| **Files/Media** | Daily | 1 year |
| **Config/Secrets** | On change | Forever |

### 9.2 Recovery Objectives
| Metric | Target |
|--------|--------|
| **RTO** (Recovery Time Objective) | < 1 hour |
| **RPO** (Recovery Point Objective) | < 15 minutes |
| **Multi-region failover** | Automatic |

---

## 10. Development Phases

| Phase | Focus | Timeline | Deliverable |
|-------|-------|----------|-------------|
| **Phase 1** | Core POS + Inventory | 3-4 months | MVP Launch |
| **Phase 2** | Employee + CRM + Promo | 2 months | Feature expansion |
| **Phase 3** | Kitchen Display (KDS) | 2 months | F&B Ready |
| **Phase 4** | Multi-outlet + Reports | 2 months | Enterprise features |
| **Phase 5** | Analytics + AI | 2 months | Intelligence layer |
| **Phase 6** | Marketplace Integration | 2 months | Full ecosystem |
| **Phase 7** | Mobile Apps (Native) | 3 months | Mobile presence |

**Total Estimated Timeline:** 12-18 months for enterprise-ready product

---

> **Next Document:** [02-LAYERED-ARCHITECTURE.md](./02-LAYERED-ARCHITECTURE.md)
