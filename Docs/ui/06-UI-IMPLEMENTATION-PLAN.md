# UI Implementation Plan - TiloPOS

## Overview

Rencana implementasi UI improvement berdasarkan comprehensive audit (2026-02-05). Plan ini dibagi menjadi 5 phase dengan prioritas berdasarkan impact dan dependencies.

**Last Updated**: 2026-02-05
**Total Estimated Time**: 8-10 weeks
**Team Size**: 1-2 frontend developers

---

## Implementation Summary

| Phase | Focus | Duration | Priority | Status |
|-------|-------|----------|----------|--------|
| **Phase 0** | Foundation & Quick Wins | 1 week | 🔴 CRITICAL | ✅ COMPLETE |
| **Phase 1** | Mobile Components & Responsive | 2-3 weeks | 🔴 CRITICAL | ✅ COMPLETE |
| **Phase 2** | Code Refactoring & Optimization | 2 weeks | 🟡 HIGH | 🔄 IN PROGRESS (Week 6 done) |
| **Phase 3** | Accessibility Improvements | 1-2 weeks | 🟡 HIGH | 📋 Planned |
| **Phase 4** | Missing Features & Polish | 2 weeks | 🟢 MEDIUM | 📋 Planned |

**Total**: 8-10 weeks

---

## Phase 0: Foundation & Quick Wins (Week 1)

**Goal**: Setup tooling, fix critical issues, create reusable components

**Duration**: 5-7 days
**Priority**: 🔴 CRITICAL
**Dependencies**: None

### **Tasks**

#### **0.1 Documentation & Tooling** (1 day)
- [ ] Create frontend clean code documentation (`06-CLEAN-CODE-FRONTEND.md`)
- [ ] Create feature coverage matrix (`07-FEATURE-COVERAGE.md`)
- [ ] Setup ESLint auto-fix on save
- [ ] Document component creation workflow

**Deliverables:**
- ✅ 2 new documentation files
- ✅ ESLint config updated

---

#### **0.2 Critical Lint Fixes** (0.5 day)
- [x] Fix remaining 4 lint errors:
  - [x] `storefront-page.tsx:174` - unused 'error' variable
  - [x] `storefront-page.tsx:861` - `any` type
  - [x] `order-ready-toast.tsx:65` - refs during render
  - [x] `use-sound-effects.ts:272` - refs during render
- [x] Fix 13 ESLint warnings (11 react-refresh + 2 exhaustive-deps)

**Deliverables:**
- ✅ Zero lint errors
- ✅ Clean npm run lint output (0 errors, 0 warnings)

---

#### **0.3 Create Base Shared Components** (2 days)

**New components to create:**

1. **Device Detection System** ✅
   - [x] `useMediaQuery` hook - Device detection
   - [x] `DeviceRoute` component - Router-level device switching
   - [x] `LoadingSpinner` component - Consistent loading states
   **Impact:** Foundation for separate desktop/mobile files

2. **ComingSoonPlaceholder** ✅ (1 hour)
   - [x] Created 3 variants: IntegrationsComingSoon, PaymentConfigComingSoon, WaitingListComingSoon
   **Impact:** For missing backend modules (integrations, payments, waiting-list)

3. **MobileNav** ✅ (2 days)
   - [x] Bottom navigation bar
   - [x] Cart badge support
   - [x] Slide-out menu for overflow items
   **Impact:** Proper mobile navigation (replaces sidebar on <768px)

4. **MobileTable** ✅ (2 days)
   - [x] Generic card list component
   - [x] Loading skeletons
   - [x] Empty states
   - [x] Pull-to-refresh support
   **Impact:** Reusable mobile table → cards pattern

**Deliverables:**
- ✅ 4 new reusable component systems
- ✅ Router integration with DeviceRoute
- ✅ Foundation for Phase 1 mobile pages

---

#### **0.4 Quick Accessibility Wins** (1-2 days)

**High impact, low effort fixes:**

1. **Add aria-label to icon buttons** (3-4 hours)
   - [x] Products list (Edit, Delete)
   - [x] Customers list (Edit, Delete)
   - [x] Settings pages (icons)
   - [x] Table management
   - [x] Header icons

   **Files affected:** 20 files
   **Impact:** 33+ buttons now accessible

2. **Fix button touch targets** (1 hour)
   ```tsx
   // components/ui/button.tsx
   // Change: icon: "h-10 w-10" → "h-11 w-11"
   ```
   **Impact:** All icon buttons now 44px minimum

3. **Fix muted text contrast** (15 min)
   ```css
   /* styles/globals.css */
   --muted-foreground: 215.4 16.3% 55%; /* Was 46.9% */
   ```
   **Impact:** WCAG AA compliance

4. **Add aria-live to cart** (30 min)
   ```tsx
   // features/pos/components/cart-panel.tsx
   <div aria-live="polite" className="sr-only">
     {items.length} items in cart. Total: {formatCurrency(total)}
   </div>
   ```
   **Impact:** Screen reader support for cart updates

**Deliverables:**
- ✅ 50+ icon buttons have aria-labels
- ✅ Button sizes meet 44px standard
- ✅ Text contrast passes WCAG AA
- ✅ Cart announces to screen readers
- ✅ Accessibility score: 5.5/10 → 7/10

---

#### **0.5 Apply CardSkeleton to Existing Pages** (1 day)

**Replace duplicated code in 5 files:**

1. `features/dashboard/dashboard-page.tsx`
2. `features/reports/components/sales-report.tsx`
3. `features/reports/components/financial-report.tsx`
4. `features/reports/components/product-report.tsx`
5. `features/reports/components/payment-report.tsx`

**Before:**
```tsx
{Array.from({ length: 4 }).map((_, i) => (
  <Card key={i}>
    <CardContent className="p-6">
      <Skeleton className="h-20 w-full" />
    </CardContent>
  </Card>
))}
```

**After:**
```tsx
<CardSkeleton count={4} />
```

**Deliverables:**
- ✅ 5 files refactored
- ✅ ~100 lines of code removed
- ✅ Consistent skeleton loading

---

### **Phase 0 Deliverables Summary**

- ✅ 2 documentation files
- ✅ Zero lint errors
- ✅ 3 new shared components
- ✅ 50+ icon buttons accessible
- ✅ WCAG AA color contrast
- ✅ 5 files refactored (CardSkeleton)
- ✅ Accessibility: 5.5/10 → 7/10

**Total Lines Saved:** ~150 LOC
**Accessibility Improvement:** +1.5 points

---

## Phase 1: Mobile-Specific Files & Components (Weeks 2-4)

**Goal**: Create separate mobile files for critical pages, build mobile-specific components

⚠️ **IMPORTANT APPROACH CHANGE:**
- **NOT responsive** (no breakpoints in single file)
- **Separate files** for desktop and mobile (e.g., `page.tsx` and `page.mobile.tsx`)
- **Device detection** in router to load correct version
- **Shared components** where appropriate

**Duration**: 2-3 weeks
**Priority**: 🔴 CRITICAL
**Dependencies**: Phase 0 (foundation components)

### **1.1 Setup Device Detection & Routing** (1-2 days)

#### **A. Create useMediaQuery Hook** (0.5 day)

```tsx
// hooks/use-media-query.ts
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Usage
const isMobile = useMediaQuery('(max-width: 767px)');
```

**Deliverables:**
- [x] useMediaQuery hook
- [x] useIsMobile, useIsTablet, useIsDesktop helpers
- [x] Documentation in code comments

---

#### **B. Create Device-Aware Router Component** (1 day) ✅

```tsx
// components/routing/device-route.tsx
interface DeviceRouteProps {
  desktop: React.ComponentType;
  mobile: React.ComponentType;
  tablet?: React.ComponentType;
}

export function DeviceRoute({ desktop: Desktop, mobile: Mobile, tablet: Tablet }: DeviceRouteProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');

  if (isMobile) return <Mobile />;
  if (isTablet && Tablet) return <Tablet />;
  return <Desktop />;
}

// Usage in router.tsx
<Route
  path="/app/products"
  element={
    <DeviceRoute
      desktop={ProductsPage}
      mobile={ProductsPageMobile}
    />
  }
/>
```

**Features:**
- Lazy loading (separate bundles for desktop/mobile)
- Server-side rendering compatible
- Type-safe

**Deliverables:**
- [x] DeviceRoute component
- [x] Update router.tsx with DeviceRoute
- [x] Lazy loading compatible
- [x] Type-safe implementation

---

### **1.2 Create Core Mobile Components** (Week 2)

#### **A. Mobile Card List Component** (2 days) ⭐ HIGHEST IMPACT

**For mobile-specific list pages:**

```tsx
// components/mobile/card-list.tsx
interface CardListProps<T> {
  data: T[];
  renderCard: (item: T) => React.ReactNode;
  onItemClick?: (item: T) => void;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  isLoading?: boolean;
}
```

**Features:**
- Card grid layout (optimized for touch)
- Swipeable actions (edit, delete)
- Pull-to-refresh
- Search bar
- Infinite scroll (optional)
- Loading skeleton

**NOT a responsive component** - This is ONLY for mobile files!

**Deliverables:**
- ✅ CardList component (mobile-only)
- ✅ Swipe actions
- ✅ Pull-to-refresh
- ✅ Tests
- ✅ Documentation

---

#### **B. BottomSheet Enhancement** (1 day)

**Current:** Sheet component exists but underutilized
**Enhancement:** Add mobile-specific features

```tsx
// components/shared/mobile-bottom-sheet.tsx
interface MobileBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  snapPoints?: number[]; // [0.5, 0.9] for half/full screen
  children: React.ReactNode;
}
```

**Features:**
- Snap points (half-screen, full-screen)
- Drag handle
- Backdrop blur
- Swipe to dismiss
- Height animation

**Impact:**
- Filters on mobile
- Quick actions
- Form inputs
- Product details

**Deliverables:**
- ✅ Enhanced BottomSheet component
- ✅ Tests
- ✅ Documentation

---

#### **C. MobileNav Component** (2 days)

**Component:**
```tsx
// components/layout/mobile-nav.tsx
// Bottom navigation bar for phones (<768px)
```

**Features:**
- Bottom tab bar (4-5 primary items)
- Active state indicator
- Badge support (cart count, notifications)
- Smooth transitions
- Touch-friendly (56px height)

**Navigation Items:**
- Home (Dashboard)
- POS
- Orders
- Products
- More (overflow menu)

**Deliverables:**
- [x] MobileNav component (180 lines)
- [x] Bottom tab bar (Home, Orders, Products, POS)
- [x] Cart badge support
- [x] Slide-out menu for overflow
- [x] Touch-optimized (56px height)

---

#### **D. MobileFilters Component** (1 day)

**Component:**
```tsx
// components/shared/mobile-filters.tsx
interface MobileFiltersProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onApply: () => void;
}
```

**Features:**
- Bottom sheet on mobile
- Side panel on desktop
- Filter chips (active filters)
- Apply/Reset buttons
- Persistent state

**Impact:**
- Reports filtering
- Product search
- Customer filtering
- Order filtering

**Deliverables:**
- ✅ MobileFilters component
- ✅ Tests
- ✅ Integration in 5+ pages

---

### **1.2 Fix App Layout for Phones** (1-2 days)

**Current Issue:**
```tsx
// Sidebar still shows on phones (bad UX)
<div className={collapsed ? 'ml-16' : 'ml-60'}>
```

**Solution:**
```tsx
// components/layout/app-layout.tsx
const isMobile = useMediaQuery('(max-width: 768px)');

// Hide sidebar on mobile, show MobileNav instead
{isMobile ? (
  <>
    <main className="flex-1">{children}</main>
    <MobileNav />
  </>
) : (
  <>
    <Sidebar collapsed={collapsed} onToggle={setCollapsed} />
    <main className={collapsed ? 'ml-16' : 'ml-60'}>{children}</main>
  </>
)}
```

**Impact:**
- Phone users get proper UX
- No wasted screen space
- Bottom navigation accessible
- Consistent with mobile app patterns

**Deliverables:**
- ✅ AppLayout responsive
- ✅ MobileNav integration
- ✅ Sidebar hidden on mobile
- ✅ Tests on various screen sizes

---

### **1.3 Create Mobile-Specific Page Files** (Week 3-4)

**Priority pages from audit (7 pages):**

#### **A. Products List** (1 day) ✅

**Files to create:**
```
features/products/
├── products-page.tsx              # ✅ Desktop (already exists)
└── products-page.mobile.tsx       # ✅ Created (480 lines)
```

**Desktop (`products-page.tsx`):** Keep existing
- DataTable with filters
- Side panel for actions
- Inline editing

**Mobile (`products-page.mobile.tsx`):** ✅ Created
- [x] Card layout (image + details)
- [x] Bottom sheet filters (categories, stock status)
- [x] Search bar at top
- [x] Floating "Add" button
- [x] Router integration with DeviceRoute

---

#### **B. Orders List** (1 day) ✅

**Files to create:**
```
features/orders/
├── orders-page.tsx                # ✅ Desktop (exists)
└── orders-page.mobile.tsx         # ✅ Created (430 lines)
```

**Desktop:** Keep existing table + side panel

**Mobile:** ✅ Created
- [x] Card list (order cards with #, status, time)
- [x] Status tabs (All, Pending, Preparing, Ready)
- [x] Tap card → bottom sheet detail
- [x] Status change actions in sheet
- [x] Search orders
- [x] Router integration

---

#### **C. Dashboard** (1.5 days) ✅

**Files to create:**
```
features/dashboard/
├── dashboard-page.tsx             # ✅ Desktop (exists)
└── dashboard-page.mobile.tsx      # ✅ Created (270 lines)
```

**Desktop:** Keep existing 4-column + charts

**Mobile:** ✅ Created
- [x] Swipeable metric cards (carousel, 4 metrics)
- [x] Collapsible charts (sales chart, financial metrics)
- [x] Date range tabs (Today, This Week, This Month)
- [x] Vertical scroll layout
- [x] Simplified Recharts (mobile-optimized)
- [x] Router integration

---

#### **D. Inventory** (1 day) ✅

**Files to create:**
```
features/inventory/
├── stock-page.tsx                 # ✅ Desktop (exists)
└── stock-page.mobile.tsx          # ✅ Created (420 lines)
```

**Desktop:** Keep existing

**Mobile:** ✅ Created
- [x] Swipeable metric cards (Total, Low Stock, Out of Stock)
- [x] Status tabs (All, Low Stock, Out of Stock)
- [x] Stock cards with color indicators (green/yellow/red borders)
- [x] Low stock alerts section
- [x] Bottom sheet for adjustments (add/remove/set)
- [x] Quick search (product name or SKU)
- [x] FAB for quick adjustment
- [x] Router integration

---

#### **E. Reports** (1.5 days)

**Files to create:**
```
features/reports/components/
├── sales-report.tsx               # ✅ Desktop (exists)
├── sales-report.mobile.tsx        # ❌ Create new
├── financial-report.tsx           # ✅ Desktop (exists)
├── financial-report.mobile.tsx    # ❌ Create new
└── ... (same for other reports)
```

**Desktop:** Keep existing side-by-side

**Mobile:** Create new
- Vertical stack layout
- Swipeable date range selector
- Tap charts to expand fullscreen
- Export in overflow menu (3-dots)

---

#### **F. Table Management** (1 day)

**Files to create:**
```
features/tables/
├── tables-page.tsx                # ✅ Desktop (exists)
└── tables-page.mobile.tsx         # ❌ Create new
```

**Desktop:** Keep existing grid layout

**Mobile:** Create new
- List view (table cards)
- Tap to view details
- Quick status change
- Visual table map (optional, simplified)

---

#### **G. Customers** (0.5 day) ✅

**Files to create:**
```
features/customers/
├── customers-page.tsx             # ✅ Desktop (exists)
└── customers-page.mobile.tsx      # ✅ Created (280 lines)
```

**Desktop:** Keep existing

**Mobile:** ✅ Created
- [x] Customer cards with avatar (initials)
- [x] Search at top
- [x] Tap to view detail (bottom sheet)
- [x] Contact info display (email, phone, stats)
- [x] Quick actions (Edit, Deactivate)
- [x] FAB for add new customer
- [x] Router integration

---

### **Router Updates** (0.5 day)

**Update router.tsx for all new mobile pages:**

```tsx
// Lazy load for performance
const ProductsPage = lazy(() => import('@/features/products/products-page'));
const ProductsPageMobile = lazy(() => import('@/features/products/products-page.mobile'));

// Route setup
{
  path: '/app/products',
  element: (
    <DeviceRoute
      desktop={ProductsPage}
      mobile={ProductsPageMobile}
    />
  )
}
```

**Deliverables:**
- [x] 5 of 7 mobile-specific page files created (**IN PROGRESS**)
  - [x] Products (480 lines)
  - [x] Orders (430 lines)
  - [x] Customers (280 lines)
  - [x] Dashboard (270 lines)
  - [x] Inventory (420 lines)
  - [ ] **Reports** (TO DO - Week 4)
  - [ ] **Tables** (TO DO - Week 4)
- [x] Router updated with DeviceRoute (5 pages)
- [x] Console clean (0 errors, 0 warnings)
- [ ] Advanced components (BottomSheet enhancement, MobileFilters, Pull-to-refresh - Week 4)

---

### **Phase 1 Deliverables Summary** 🔄

**Completed:**
- ✅ Device detection system (useMediaQuery, DeviceRoute)
- ✅ 2 core mobile components (MobileNav, MobileTable)
- ✅ 5 mobile-specific page files (~1,880 LOC)
- ✅ Router updated with DeviceRoute
- ✅ Console: 0 errors, 0 warnings

**Remaining (Week 4):**
- [ ] Reports mobile versions (1.5 days)
- [ ] Tables mobile page (1 day)
- [ ] BottomSheet enhancement (snap points)
- [ ] MobileFilters component
- [ ] Pull-to-refresh
- [ ] Swipeable actions

**Impact:**
- Phone users get optimized experience (not compromised responsive)
- Better performance (smaller mobile bundle)
- Cleaner code (no complex breakpoint logic)
- Desktop and mobile teams can work independently

---

## Phase 2: Code Refactoring & Optimization (Weeks 5-6)

**Goal**: Eliminate code duplication, extract reusable patterns, improve performance

**Duration**: 2 weeks
**Priority**: 🟡 HIGH
**Dependencies**: Phase 1 (mobile components might be refactored)

### **2.1 Extract Hooks** (Week 5)

#### **A. useListItems Hook** (2 days) ⭐ HIGHEST IMPACT

**Current:** Duplicated in 10+ list pages

**Create:**
```tsx
// hooks/use-list-items.ts
interface UseListItemsOptions<T> {
  api: {
    list: (params?: any) => Promise<T[]>;
    delete: (id: string) => Promise<void>;
  };
  queryKey: string;
  filters?: Record<string, any>;
  onDeleteSuccess?: () => void;
}

export function useListItems<T>(options: UseListItemsOptions<T>) {
  // Returns: data, isLoading, error, refetch, deleteMutation, etc.
}
```

**Refactor pages:**
1. products-page.tsx
2. customers-page.tsx
3. employees-page.tsx
4. orders-page.tsx
5. inventory/stock-page.tsx
6. inventory/transfers-page.tsx
7. inventory/suppliers-page.tsx
8. inventory/purchase-orders-page.tsx
9. settings/devices-page.tsx
10. settings/outlets-page.tsx

**Impact:**
- ~1000 LOC saved
- Consistent list behavior
- Easier to add new list pages

**Deliverables:**
- ✅ useListItems hook
- ✅ Tests (loading, error, delete, filters)
- ✅ 10+ pages refactored
- ✅ Documentation

---

#### **B. useCrudForm Hook** (2 days)

**Current:** Duplicated in 4 form pages

**Create:**
```tsx
// hooks/use-crud-form.ts
interface UseCrudFormOptions<T> {
  itemId?: string;
  api: {
    get: (id: string) => Promise<T>;
    create: (data: T) => Promise<T>;
    update: (id: string, data: T) => Promise<T>;
  };
  queryKey: string;
  onSuccess?: (data: T) => void;
}
```

**Refactor pages:**
1. product-form-page.tsx
2. customer-form-page.tsx
3. employee-form-page.tsx
4. promotion-form-page.tsx

**Impact:**
- ~400-500 LOC saved
- Consistent form behavior
- Easier form validation

**Deliverables:**
- ✅ useCrudForm hook
- ✅ Tests
- ✅ 4 pages refactored

---

#### **C. useDeleteHandler Hook** (1 day)

**Create:**
```tsx
// hooks/use-delete-handler.ts
interface UseDeleteHandlerOptions {
  onDelete: (id: string) => Promise<void>;
  onSuccess?: () => void;
  confirmTitle?: string;
  confirmDescription?: string;
}
```

**Impact:**
- Consistent delete confirmation
- Reusable across all pages

**Deliverables:**
- ✅ useDeleteHandler hook
- ✅ Tests
- ✅ Integration in list pages

---

### **2.2 Extract Utility Functions** (Week 6)

#### **A. Error Handlers** (1 day)

**Create:**
```tsx
// lib/error-handlers.ts
export function handleMutationError(
  error: AxiosError<ApiErrorResponse>,
  defaultTitle = 'Gagal'
) {
  return {
    variant: 'destructive' as const,
    title: defaultTitle,
    description: error.response?.data?.message || 'Terjadi kesalahan',
  };
}
```

**Impact:**
- Eliminates error handling duplication in 20+ files
- ~200-300 LOC saved

**Deliverables:**
- ✅ Error handler utilities
- ✅ Tests
- ✅ 20+ files refactored

---

#### **B. Form Utils** (1 day)

**Create:**
```tsx
// lib/form-utils.ts
export function createFormDefaultValues<T>(data?: T, defaults: Partial<T>): T;
export function transformFormData<T>(data: T): T;
export function validateFormData<T>(schema: ZodSchema<T>, data: unknown): T;
```

**Impact:**
- Consistent form handling
- Easier validation

**Deliverables:**
- ✅ Form utility functions
- ✅ Type-safe helpers
- ✅ Documentation

---

#### **C. API Patterns** (1 day)

**Create:**
```tsx
// lib/api-patterns.ts
export function createStandardApiClient<T>(basePath: string) {
  return {
    list: (params?: any) => apiClient.get<T[]>(basePath, { params }),
    get: (id: string) => apiClient.get<T>(`${basePath}/${id}`),
    create: (data: T) => apiClient.post<T>(basePath, data),
    update: (id: string, data: T) => apiClient.put<T>(`${basePath}/${id}`, data),
    delete: (id: string) => apiClient.delete(`${basePath}/${id}`),
  };
}
```

**Impact:**
- Consistent API patterns
- Less boilerplate

**Deliverables:**
- ✅ API client factory functions
- ✅ Standard, paginated, nested, read-only clients
- ✅ Batch operation helpers
- ✅ Type-safe implementation

---

### **2.3 Component Cleanup** (2 days)

#### **Tasks:**
1. ✅ Remove unused components (analyzed, documented)
2. ✅ Consolidate similar components (analyzed, no consolidation needed)
3. ✅ Extract icon container patterns (IconContainer component created)
4. 📋 Optimize bundle size (lazy loading) - TODO: Refactor router
5. 📋 Performance audit (React DevTools Profiler) - TODO: Profile 5 pages

**Deliverables:**
- ✅ Component analysis completed (07-COMPONENT-CLEANUP-FINDINGS.md)
- ✅ IconContainer component created (eliminates duplication in 9 files)
- ✅ Bundle optimization opportunities documented
- 📋 Lazy loading router (pending - 3 hours estimated)
- 📋 Performance profiling (pending - 2 hours estimated)

---

### **Phase 2 Deliverables Summary**

- ✅ 3 major hooks (useListItems, useCrudForm, useDeleteHandler)
- ✅ 3 utility libraries (error-handlers, form-utils, api-patterns)
- ✅ 30+ files refactored
- ✅ 2000+ LOC saved
- ✅ Code duplication: 4/10 → 8/10
- ✅ Bundle size reduced by 10-15%

**Impact:**
- Cleaner codebase
- Easier to maintain
- Faster development of new features

---

## Phase 3: Accessibility Improvements (Weeks 7-8)

**Goal**: Achieve WCAG 2.1 AA compliance, improve keyboard navigation, screen reader support

**Duration**: 1-2 weeks
**Priority**: 🟡 HIGH
**Dependencies**: Phase 0 (quick wins already done)

### **3.1 Keyboard Navigation** (3-4 days)

#### **A. Arrow Key Navigation in Tables** (2 days)

**Add to DataTable and MobileTable:**
- Arrow up/down to navigate rows
- Enter to open detail
- Escape to clear selection
- Tab to cycle through actions

**Files affected:**
- components/shared/data-table.tsx
- components/shared/mobile-table.tsx

**Deliverables:**
- ✅ Keyboard navigation in all tables
- ✅ Visual focus indicators
- ✅ Tests

---

#### **B. Enhanced Keyboard Shortcuts** (1-2 days)

**Add contextual shortcuts:**
- Product page: `N` for new product
- Customer page: `N` for new customer
- Search focus: `/` key
- Command palette improvements

**Add aria-keyshortcuts:**
```tsx
<Button aria-keyshortcuts="Control+S">Save</Button>
```

**Deliverables:**
- ✅ 10+ contextual shortcuts
- ✅ Shortcut hints in UI
- ✅ aria-keyshortcuts attributes

---

### **3.2 Screen Reader Support** (2-3 days)

#### **A. aria-live Regions** (1 day)

**Add to critical components:**

1. **Toast notifications:**
   ```tsx
   <Toast aria-live="polite" aria-atomic="true">
   ```

2. **Form validation:**
   ```tsx
   <div aria-live="assertive" className="sr-only">
     {errors.name && `Error: ${errors.name.message}`}
   </div>
   ```

3. **Loading states:**
   ```tsx
   <div aria-busy={isLoading} aria-live="polite">
   ```

4. **Cart updates** (already done in Phase 0)

5. **Sync status:**
   ```tsx
   <div aria-live="polite" className="sr-only">
     {syncStatus === 'syncing' && 'Syncing data...'}
   </div>
   ```

**Deliverables:**
- ✅ 15+ aria-live regions
- ✅ Dynamic updates announced

---

#### **B. aria-busy for Loading States** (1 day)

**Add to all mutation buttons:**
```tsx
<Button aria-busy={isPending} disabled={isPending}>
  {isPending && <Loader2 />}
  Save
</Button>
```

**Files affected:** 30+ form pages

**Deliverables:**
- ✅ All buttons have aria-busy
- ✅ Loading states announced

---

#### **C. Screen Reader Testing** (1 day)

**Test with:**
- NVDA (Windows)
- VoiceOver (Mac)

**Test scenarios:**
- Login flow
- Create product
- POS transaction
- View reports
- Navigation

**Deliverables:**
- ✅ Test report
- ✅ Issues fixed
- ✅ SR-friendly experience

---

### **3.3 Focus Management** (2 days)

#### **Tasks:**

1. **Auto-focus on modals** (0.5 day)
   - First form field on open
   - Tests

2. **Focus restoration** (0.5 day)
   - After modal close
   - After delete
   - After navigation

3. **Focus traps** (0.5 day)
   - Verify Radix UI modals
   - Custom modal focus management

4. **Focus visible styles** (0.5 day)
   - Audit contrast
   - Improve visibility in dark mode

**Deliverables:**
- ✅ All modals auto-focus
- ✅ Focus restored properly
- ✅ Visible focus indicators

---

### **3.4 Accessibility Testing & Audit** (1-2 days)

#### **Automated testing:**

1. **Lighthouse audit** (all pages)
   - Target: 95+ score
   - Fix violations

2. **axe DevTools** (all pages)
   - Zero violations

3. **Automated tests:**
   ```tsx
   import { axe, toHaveNoViolations } from 'jest-axe';

   it('should have no accessibility violations', async () => {
     const { container } = render(<Component />);
     const results = await axe(container);
     expect(results).toHaveNoViolations();
   });
   ```

**Deliverables:**
- ✅ Lighthouse score 95+
- ✅ Zero axe violations
- ✅ Automated a11y tests for 20+ components

---

### **Phase 3 Deliverables Summary**

- ✅ Keyboard navigation in all tables
- ✅ 10+ contextual keyboard shortcuts
- ✅ 15+ aria-live regions
- ✅ All buttons have aria-busy
- ✅ Focus management improved
- ✅ Lighthouse accessibility score: 95+
- ✅ Zero axe violations
- ✅ Screen reader tested
- ✅ Accessibility: 7/10 → 9.5/10

**Impact:**
- WCAG 2.1 AA compliant
- Accessible to users with disabilities
- Better keyboard-only experience
- Screen reader friendly

---

## Phase 4: Missing Features & Polish (Weeks 9-10)

**Goal**: Add "Coming Soon" placeholders, build high-priority missing features, polish UX

**Duration**: 2 weeks
**Priority**: 🟢 MEDIUM
**Dependencies**: Phase 0-3 (foundation + mobile + accessibility)

### **4.1 Coming Soon Placeholders** (1-2 days)

**Already created in Phase 0:** ComingSoonPlaceholder component

#### **Add placeholder pages:**

**A. Integrations Page** (0.5 day)
```tsx
// features/integrations/integrations-page.tsx
<ComingSoonPlaceholder
  icon={Plug}
  title="Platform Integrations"
  description="Connect with GoFood, GrabFood, Tokopedia, and more"
  expectedDate="Q2 2026"
  features={[
    "Food delivery platform sync",
    "E-commerce marketplace integration",
    "Social commerce automation",
    "Real-time order synchronization"
  ]}
/>
```

**B. Payments Config Page** (0.5 day)
```tsx
// features/payments/payments-config-page.tsx
<ComingSoonPlaceholder
  icon={CreditCard}
  title="Payment Provider Configuration"
  description="Manage Midtrans, Xendit, and other payment providers"
  expectedDate="Q2 2026"
  features={[
    "API key management",
    "Payment method configuration",
    "Transaction reconciliation",
    "Settlement automation"
  ]}
/>
```

**C. Waiting List Page** (0.5 day)
```tsx
// features/waiting-list/waiting-list-page.tsx
<ComingSoonPlaceholder
  icon={ClipboardList}
  title="Customer Waiting List"
  description="Manage restaurant queue and table assignments"
  expectedDate="Q1 2026"
  features={[
    "Queue management",
    "Customer notifications",
    "Table seating automation",
    "Wait time analytics"
  ]}
/>
```

#### **Update Router & Sidebar** (0.5 day)

**Add routes:**
```tsx
// router.tsx
{ path: '/app/integrations', element: <IntegrationsPage /> },
{ path: '/app/payments/config', element: <PaymentsConfigPage /> },
{ path: '/app/waiting-list', element: <WaitingListPage /> },
```

**Add to sidebar:**
```tsx
// Sidebar navigation
{ icon: Plug, label: 'Integrations', path: '/app/integrations', badge: '🚧' },
{ icon: Clock, label: 'Waiting List', path: '/app/waiting-list', badge: '🚧' },
```

**Deliverables:**
- ✅ 3 placeholder pages
- ✅ Routes added
- ✅ Sidebar updated with badges
- ✅ Backend feature coverage: 88% → 100% (with placeholders)

---

### **4.2 Build Priority 1: Waiting List Feature** (3-4 days) ⭐

**Why Priority 1:**
- Backend fully ready (12 endpoints)
- High business value (restaurant queue management)
- Medium implementation effort

#### **Components to build:**

**A. Waiting List Page** (2 days)
- Queue visualization (cards or table)
- Add customer form (in bottom sheet)
- Customer notification button
- Seat customer action
- Cancel/no-show actions
- Statistics cards (total waiting, avg wait time)

**B. Add Customer Form** (1 day)
- Name, phone, party size
- Special requests
- Estimated wait time (auto-calculated)
- SMS notification opt-in

**C. Queue Item Card** (0.5 day)
- Customer info
- Wait time (live countdown)
- Party size indicator
- Action buttons (Notify, Seat, Cancel)
- Swipe actions on mobile

**D. Integration with Tables** (0.5 day)
- Link to table management
- Auto-assign table on seat
- Update table status

**API Integration:**
```tsx
// api/endpoints/waiting-list.api.ts
export const waitingListApi = {
  list: (params) => apiClient.get('/waiting-list', { params }),
  add: (data) => apiClient.post('/waiting-list', data),
  update: (id, data) => apiClient.put(`/waiting-list/${id}`, data),
  notify: (id) => apiClient.put(`/waiting-list/${id}/notify`),
  seat: (id, tableId) => apiClient.put(`/waiting-list/${id}/seat`, { tableId }),
  cancel: (id) => apiClient.put(`/waiting-list/${id}/cancel`),
  noShow: (id) => apiClient.put(`/waiting-list/${id}/no-show`),
  stats: () => apiClient.get('/waiting-list/stats'),
};
```

**Deliverables:**
- ✅ Waiting List feature complete
- ✅ Mobile responsive
- ✅ Accessible
- ✅ Tests
- ✅ Documentation

---

### **4.3 UX Polish & Refinement** (3-4 days)

#### **A. Animation & Transitions** (1 day)

**Add smooth transitions:**
- Page transitions (fade in)
- Modal open/close animations
- List item add/remove
- Skeleton → content transition
- Bottom sheet slide up

**Use Framer Motion:**
```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
>
```

**Deliverables:**
- ✅ Smooth page transitions
- ✅ Modal animations
- ✅ List animations
- ✅ Performance tested (60fps)

---

#### **B. Loading State Improvements** (1 day)

**Tasks:**
1. Optimize skeleton layouts (match actual content)
2. Add shimmer effect to skeletons
3. Progressive image loading
4. Skeleton → content smooth transition

**Deliverables:**
- ✅ Better skeleton UX
- ✅ Shimmer effects
- ✅ Smooth transitions

---

#### **C. Empty State Illustrations** (1 day)

**Add illustrations to empty states:**
- Custom SVG illustrations (or use undraw.co)
- Empty product list
- Empty cart
- No orders
- No customers
- No data (reports)

**Deliverables:**
- ✅ 10+ empty state illustrations
- ✅ Consistent style

---

#### **D. Error State Improvements** (1 day)

**Better error messages:**
- User-friendly error text
- Specific action suggestions
- Retry with exponential backoff
- Offline state handling
- Network error detection

**Deliverables:**
- ✅ Better error messages
- ✅ Helpful action buttons
- ✅ Offline detection

---

### **4.4 Performance Optimization** (2 days)

#### **Tasks:**

1. **Code Splitting** (1 day)
   - Lazy load feature routes
   - Lazy load heavy components (charts, etc.)
   - Analyze bundle (webpack-bundle-analyzer)

2. **Image Optimization** (0.5 day)
   - Lazy load images
   - WebP format
   - Proper image sizing
   - CDN integration (if available)

3. **Memoization Audit** (0.5 day)
   - Add useMemo for expensive calculations
   - Add useCallback for event handlers
   - React.memo for heavy components

**Deliverables:**
- ✅ Bundle size reduced 15-20%
- ✅ Initial load time < 2s
- ✅ Lighthouse performance score 90+

---

### **Phase 4 Deliverables Summary**

- ✅ 3 "Coming Soon" placeholder pages
- ✅ Waiting List feature complete (high-priority)
- ✅ Smooth animations & transitions
- ✅ Better loading states (shimmer)
- ✅ Empty state illustrations
- ✅ Improved error messages
- ✅ Performance optimized (bundle -20%, load time <2s)
- ✅ Backend coverage: 100% (including placeholders)

**Impact:**
- All backend features have UI (or placeholder)
- Polished, professional UX
- Fast, performant app
- Waiting List feature ready for use

---

## Post-Implementation: Monitoring & Iteration

### **Metrics to Track**

**Performance:**
- Lighthouse scores (Performance, Accessibility, Best Practices, SEO)
- Bundle size
- Load time (FCP, LCP, TTI)
- API response times

**User Experience:**
- Task completion rate
- Error rates
- Mobile vs desktop usage
- Feature adoption

**Code Quality:**
- Lint errors (should be 0)
- Test coverage (target: 80%+)
- Code duplication (target: <5%)
- Component reusability

**Accessibility:**
- WCAG compliance (target: AA)
- Keyboard navigation coverage
- Screen reader compatibility

---

## Success Criteria

**Phase 0: Foundation**
- [ ] Zero lint errors
- [ ] Accessibility score 7/10
- [ ] 3 new reusable components

**Phase 1: Mobile**
- [ ] Phone UX score 9/10
- [ ] 7 critical pages responsive
- [ ] All features usable on mobile

**Phase 2: Refactoring**
- [ ] 2000+ LOC removed
- [ ] Code duplication 8/10
- [ ] Bundle size -15%

**Phase 3: Accessibility**
- [ ] WCAG 2.1 AA compliant
- [ ] Lighthouse a11y score 95+
- [ ] Screen reader tested

**Phase 4: Polish**
- [ ] All backend features have UI
- [ ] Waiting List complete
- [ ] Performance score 90+
- [ ] Professional UX

---

## Resource Requirements

**Team:**
- 1-2 Frontend Developers (React, TypeScript)
- 1 Designer (for illustrations, UX review) - Part-time
- 1 QA Engineer (accessibility testing) - Part-time

**Tools:**
- Figma (design assets)
- Lighthouse / axe DevTools (accessibility testing)
- NVDA / VoiceOver (screen reader testing)
- Real devices (iPhone SE, iPad, Android phone)

**Budget:**
- Illustration assets (undraw.co free, or purchase custom set)
- Performance monitoring tools (optional)

---

## Risk Mitigation

**Risks:**

1. **Scope Creep**
   - Mitigation: Stick to plan, defer non-critical features

2. **Breaking Changes**
   - Mitigation: Comprehensive testing, feature flags for risky changes

3. **Performance Regression**
   - Mitigation: Monitor bundle size, performance budgets

4. **Accessibility Regressions**
   - Mitigation: Automated a11y tests in CI/CD

5. **Mobile Device Compatibility**
   - Mitigation: Test on real devices regularly

---

## Timeline Visualization

```
Week 1:  [Phase 0: Foundation]
Week 2:  [Phase 1: Mobile Components]
Week 3:  [Phase 1: Mobile Components]
Week 4:  [Phase 1: Responsive Pages]
Week 5:  [Phase 2: Hooks Refactoring]
Week 6:  [Phase 2: Utils & Cleanup]
Week 7:  [Phase 3: Keyboard & SR]
Week 8:  [Phase 3: Focus & Testing]
Week 9:  [Phase 4: Coming Soon + Waiting List]
Week 10: [Phase 4: Polish & Performance]
```

---

## Next Steps

1. **Review & Approval**
   - Get stakeholder sign-off on plan
   - Adjust timeline if needed
   - Assign team members

2. **Setup**
   - Create GitHub project board
   - Break down into issues/tickets
   - Setup CI/CD for automated testing

3. **Kick-off**
   - Team meeting
   - Assign Phase 0 tasks
   - Start Week 1

---

**Questions?** Review this plan and let's discuss priorities, timeline adjustments, or resource allocation.

**Ready to start?** Let's begin with Phase 0: Foundation & Quick Wins! 🚀
