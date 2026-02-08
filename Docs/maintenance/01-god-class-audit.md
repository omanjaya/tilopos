# God Class & God File Audit - TiloPOS

**Date**: 2026-02-06
**Purpose**: Identify files/classes that are too large and violate Single Responsibility Principle

---

## 🔴 Critical Issues (>1000 LOC)

### Backend

#### 1. **seed.ts** - 1,828 lines 🔴 CRITICAL
**Location**: `packages/backend/src/infrastructure/database/seeders/seed.ts`

**Problems:**
- Single monolithic seeding script
- Handles ALL database seeding in one file
- Difficult to maintain and debug
- Long execution time
- Hard to seed specific entities

**Recommendation:**
Split into multiple seeder files by domain:
```
seeders/
├── index.ts                    # Orchestrator
├── business.seeder.ts          # Business & outlets
├── products.seeder.ts          # Products, categories, variants
├── customers.seeder.ts         # Customers & segments
├── employees.seeder.ts         # Employees & roles
├── inventory.seeder.ts         # Stock levels, movements
├── orders.seeder.ts            # Orders & transactions
├── loyalty.seeder.ts           # Loyalty programs
├── online-store.seeder.ts      # Online store data
└── settings.seeder.ts          # Settings & configurations
```

**Estimated Refactoring Time**: 2-3 days
**Priority**: HIGH (but not urgent - seed files are dev-only)

---

#### 2. **reports.controller.ts** - 1,071 lines 🔴 GOD CLASS
**Location**: `packages/backend/src/modules/reports/reports.controller.ts`

**Problems:**
- Handles 10+ different report types in one controller
- Sales, Inventory, Customers, Financial, Employees, Kitchen, Products, Payment Methods, Promotions, Custom Reports
- Violates Single Responsibility Principle
- Difficult to test
- Hard to add new report types

**Current Structure:**
```typescript
@Controller('reports')
export class ReportsController {
  @Get('sales') async salesReport()
  @Get('sales/daily') async dailySales()
  @Get('inventory') async inventoryReport()
  @Get('customers') async customerReport()
  @Get('financial') async financialReport()
  @Get('employees') async employeeReport()
  @Get('kitchen') async kitchenReport()
  @Get('products') async productReport()
  @Get('payment-methods') async paymentMethodReport()
  @Get('promotions') async promotionReport()
  @Get('sales/export') async exportSalesReport()
  @Get('inventory/export') async exportInventoryReport()
  @Post('custom') async buildCustomReport()
  @Get('custom/metrics')
  @Post('custom/templates') async saveReportTemplate()
  @Get('custom/templates') async getSavedTemplates()
}
```

**Recommendation:**
Split into separate controllers by domain:
```
reports/
├── reports.module.ts
├── controllers/
│   ├── sales-reports.controller.ts       # Sales & daily sales
│   ├── inventory-reports.controller.ts   # Inventory reports
│   ├── customer-reports.controller.ts    # Customer analytics
│   ├── financial-reports.controller.ts   # Financial reports
│   ├── employee-reports.controller.ts    # Employee performance
│   ├── product-reports.controller.ts     # Product analytics
│   ├── payment-reports.controller.ts     # Payment methods
│   ├── promotion-reports.controller.ts   # Promotion effectiveness
│   └── custom-reports.controller.ts      # Custom report builder
└── services/
    └── report-builder.service.ts         # Shared logic
```

**Routes After Refactoring:**
- `/api/v1/reports/sales/*` → SalesReportsController
- `/api/v1/reports/inventory/*` → InventoryReportsController
- `/api/v1/reports/customers/*` → CustomerReportsController
- etc.

**Estimated Refactoring Time**: 3-4 days
**Priority**: MEDIUM-HIGH

---

#### 3. **online-store.service.ts** - 1,045 lines 🔴 GOD CLASS
**Location**: `packages/backend/src/modules/online-store/online-store.service.ts`

**Problems:**
- Too many interfaces defined in service file (~400 lines of interfaces)
- Handles catalog sync, analytics, inventory, shipping calculation, storefront data
- Multiple responsibilities in one service
- Interfaces should be in separate files

**Current Structure:**
```typescript
// ~400 lines of interfaces at top
export interface CatalogSyncResult { ... }
export interface StoreAnalyticsResult { ... }
export interface StoreInventoryItem { ... }
export interface StoreInventoryResult { ... }
export interface StoreSettingsInput { ... }
export interface ShippingCalculateInput { ... }
export interface ShippingEstimate { ... }
export interface DeliveryZone { ... }
export interface StorefrontData { ... }
// ... many more

@Injectable()
export class OnlineStoreService {
  // Service methods
}
```

**Recommendation:**
1. Extract all interfaces to separate files:
```
online-store/
├── interfaces/
│   ├── catalog.interface.ts
│   ├── analytics.interface.ts
│   ├── inventory.interface.ts
│   ├── shipping.interface.ts
│   └── storefront.interface.ts
├── services/
│   ├── online-store.service.ts           # Main orchestrator
│   ├── catalog-sync.service.ts           # Catalog syncing
│   ├── store-analytics.service.ts        # Analytics
│   ├── store-inventory.service.ts        # Inventory management
│   └── shipping-calculator.service.ts    # Shipping calculation
└── online-store.module.ts
```

2. Split service by responsibility

**Estimated Refactoring Time**: 2-3 days
**Priority**: MEDIUM

---

### Frontend

#### 4. **storefront-page.tsx** - 1,084 lines 🔴 GOD COMPONENT
**Location**: `packages/web/src/features/online-store/storefront-page.tsx`

**Problems:**
- Handles EVERYTHING in one component:
  - Product listing & filtering
  - Shopping cart management
  - Product selection with variants & modifiers
  - Checkout flow (3 steps)
  - Customer information form
  - Delivery method selection
  - Order submission
  - Success/Error states
- 18+ state variables
- Multiple complex functions
- Impossible to test properly
- Poor reusability

**Current Structure:**
```typescript
export function StorefrontPage() {
  // 18+ useState declarations
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<...>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [customerInfo, setCustomerInfo] = useState({ ... });
  const [deliveryMethod, setDeliveryMethod] = useState<...>('delivery');
  const [orderStatus, setOrderStatus] = useState<...>('idle');
  // ... more states

  // Multiple complex functions
  const addToCart = () => { ... }
  const updateQuantity = () => { ... }
  const removeFromCart = () => { ... }
  const submitOrder = () => { ... }
  const getItemTotal = () => { ... }

  // Inline components
  function ProductCard() { ... }
  function CartPanel() { ... }
  function CheckoutForm() { ... }

  // 1000+ lines of JSX
  return (...)
}
```

**Recommendation:**
Split into multiple components and custom hooks:
```
online-store/
├── storefront-page.tsx              # Main container (50-100 lines)
├── hooks/
│   ├── useStorefront.ts             # Fetch store data
│   ├── useCart.ts                   # Cart state & logic
│   ├── useProductSelection.ts       # Product/variant/modifier selection
│   └── useCheckout.ts               # Checkout flow
├── components/
│   ├── ProductGrid.tsx              # Product listing
│   ├── ProductCard.tsx              # Individual product
│   ├── ProductDetailModal.tsx       # Variant/modifier selection
│   ├── CartPanel.tsx                # Shopping cart
│   ├── CartItem.tsx                 # Cart item
│   ├── CheckoutFlow.tsx             # Checkout container
│   ├── CustomerInfoForm.tsx         # Step 1
│   ├── DeliveryMethodSelect.tsx     # Step 2
│   ├── OrderSummary.tsx             # Step 3
│   └── OrderSuccess.tsx             # Success state
└── types/
    └── storefront.types.ts          # Shared interfaces
```

**Estimated Refactoring Time**: 4-5 days
**Priority**: HIGH (impacts customer experience)

---

#### 5. **kds-page.tsx** - 759 lines 🟡 LARGE COMPONENT
**Location**: `packages/web/src/features/kds/kds-page.tsx`

**Problems:**
- Kitchen Display System in one large component
- Handles order display, status updates, timer management, sound effects
- Multiple views (grid, list, done)
- Real-time updates with WebSocket

**Recommendation:**
Split into:
```
kds/
├── kds-page.tsx                  # Main container
├── hooks/
│   ├── useKdsOrders.ts           # Order fetching & filtering
│   ├── useKdsRealtime.ts         # WebSocket updates
│   └── useKdsSound.ts            # Sound effects
├── components/
│   ├── OrderCard.tsx             # Order display
│   ├── OrderTimer.tsx            # Timer display
│   ├── StatusButtons.tsx         # Status change actions
│   ├── KdsFilters.tsx            # Filter controls
│   └── KdsSettings.tsx           # Settings modal
└── types/
    └── kds.types.ts
```

**Estimated Refactoring Time**: 2-3 days
**Priority**: MEDIUM

---

## 🟡 Warning Issues (500-1000 LOC)

### Backend

| File | Lines | Issue |
|------|-------|-------|
| **prisma-settings.repository.ts** | 905 | Too many setting types in one repository |
| **marketplace.service.ts** | 878 | Multiple marketplace integrations in one service |
| **xendit-gateway.ts** | 834 | Large payment gateway with many methods |
| **self-order.service.ts** | 796 | Complex self-order logic |
| **loyalty.service.ts** | 789 | Loyalty program logic too complex |
| **employees.service.ts** | 697 | Employee management + permissions |
| **customers.service.ts** | 678 | Customer + segment management |

**Recommendation**: Consider splitting repositories by setting type, separate services for each marketplace/gateway.

---

### Frontend

| File | Lines | Issue |
|------|-------|-------|
| **sync-engine.service.ts** | 688 | Offline sync logic in one service |
| **pos-page.tsx** | 659 | POS terminal in one component |
| **use-realtime.ts** | 655 | Complex WebSocket hook |
| **landing-page.tsx** | 650 | Marketing page with many sections |
| **empty-illustrations.tsx** | 612 | All empty state SVGs in one file |
| **customer-self-order-page.tsx** | 598 | Self-order page too complex |
| **router.tsx** | 589 | All routes in one file (acceptable) |
| **table-layout-editor.tsx** | 587 | Table layout editor complex |

**Recommendation**:
- Extract illustrations to separate files
- Split POS page into smaller components
- Break down self-order page

---

## 📊 Statistics

### Backend
- **Total files analyzed**: 53,732 lines
- **Files > 1000 LOC**: 3 files (CRITICAL)
- **Files 500-1000 LOC**: 7 files (WARNING)
- **Largest file**: seed.ts (1,828 lines)
- **Largest service**: online-store.service.ts (1,045 lines)
- **Largest controller**: reports.controller.ts (1,071 lines)

### Frontend
- **Total files analyzed**: 50,611 lines
- **Files > 1000 LOC**: 1 file (CRITICAL)
- **Files 500-1000 LOC**: 8 files (WARNING)
- **Largest component**: storefront-page.tsx (1,084 lines)
- **Largest service**: sync-engine.service.ts (688 lines)
- **Largest hook**: use-realtime.ts (655 lines)

---

## 🎯 Refactoring Priority

### Phase 1: Critical (High Impact, High Priority)
1. **storefront-page.tsx** (1,084 lines) - Customer-facing, hard to maintain
2. **reports.controller.ts** (1,071 lines) - API organization, testing difficulty

**Estimated Time**: 1-2 weeks
**Impact**: HIGH

### Phase 2: Important (Medium Impact, Medium Priority)
3. **online-store.service.ts** (1,045 lines) - Code organization, interfaces
4. **kds-page.tsx** (759 lines) - Kitchen operations, real-time complexity
5. **pos-page.tsx** (659 lines) - Core business feature

**Estimated Time**: 2-3 weeks
**Impact**: MEDIUM-HIGH

### Phase 3: Nice to Have (Lower Impact)
6. **seed.ts** (1,828 lines) - Dev-only, low urgency
7. Various 500-700 LOC services/components

**Estimated Time**: 2-3 weeks
**Impact**: MEDIUM

---

## 🛠️ Refactoring Guidelines

### When to Split a File:
- **> 500 lines**: Consider splitting if it has multiple responsibilities
- **> 800 lines**: Should split into smaller modules
- **> 1000 lines**: Must split - god class/file territory

### Single Responsibility Principle:
- One component = One feature/view
- One service = One business domain
- One controller = One resource type
- One hook = One piece of state logic

### Refactoring Steps:
1. **Identify responsibilities** - List what the file does
2. **Group related logic** - Find cohesive pieces
3. **Extract interfaces/types** - Move to separate files
4. **Create new files** - Split by responsibility
5. **Update imports** - Fix references
6. **Write tests** - Ensure nothing breaks
7. **Remove old file** - After validation

---

## 📝 Notes

**Why This Matters:**
- Easier maintenance and debugging
- Better testability
- Improved code reusability
- Faster onboarding for new developers
- Reduced merge conflicts
- Better performance (smaller bundle chunks)

**Trade-offs:**
- More files to navigate
- More imports to manage
- Initial refactoring time investment

**Recommendation:** Tackle Phase 1 items first (storefront-page.tsx and reports.controller.ts) as they have the highest impact on maintainability and user experience.

---

**Total Estimated Refactoring Time**: 5-8 weeks (if done sequentially)
**Can be parallelized** if multiple developers work on different areas.
