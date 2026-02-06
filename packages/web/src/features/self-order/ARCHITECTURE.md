# Self-Order Feature Architecture

## Component Hierarchy

```
CustomerSelfOrderPage (Orchestration Layer)
│
├── Custom Hooks (Business Logic Layer)
│   ├── useSession(sessionCode)          → Fetch session data
│   ├── useMenu(outletId)                → Fetch & filter menu
│   ├── useCart()                        → Cart state & operations
│   ├── useOrder(sessionCode, onSuccess) → Order submission
│   ├── useOnlineStatus()                → Network monitoring
│   └── useProductDetail()               → Modal & lightbox state
│
└── UI Components (Presentation Layer)
    ├── OfflineIndicator                 → Persistent offline banner
    ├── OfflineErrorAlert                → Temporary error notification
    ├── MenuHeader                       → Search, categories, cart button
    ├── main
    │   ├── ProductRecommendations       → Popular items carousel
    │   └── MenuGrid                     → Product cards grid
    ├── StickyCartFooter                 → Bottom cart summary
    ├── ProductLightbox                  → Image viewer modal
    ├── ProductDetailModal               → Product detail view
    └── CartDrawer                       → Shopping cart modal
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CustomerSelfOrderPage                    │
│                   (Main Orchestration)                      │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│   Hooks      │      │  Components  │     │   External   │
│  (Logic)     │      │    (UI)      │     │    (API)     │
└──────────────┘      └──────────────┘     └──────────────┘
        │                     ▲                     │
        │                     │                     │
        └─────────────────────┴─────────────────────┘
              Data flows from hooks to components
```

## State Management

### 1. Server State (TanStack Query)
```typescript
// Managed by useSession & useMenu hooks
- Session data (useQuery)
- Menu items (useQuery)
- Order submission (useMutation)
```

### 2. Client State (useState)
```typescript
// Managed by custom hooks
- Cart items & totals (useCart)
- Selected category & search (useMenu)
- Modal states (useProductDetail)
- Order status (useOrder)
- Network status (useOnlineStatus)
```

### 3. UI State (Local Component State)
```typescript
// Managed by main page
- showOfflineError (temporary alert)
```

## Hook Dependencies

```
useSession(sessionCode)
    │
    └──> provides session.outletId
            │
            ├──> useMenu(outletId)
            │       │
            │       └──> provides filteredItems
            │               │
            │               └──> MenuGrid displays items
            │
            └──> ProductRecommendations uses outletId

useCart()
    │
    ├──> cart items
    │       │
    │       ├──> CartDrawer displays cart
    │       └──> StickyCartFooter shows count & total
    │
    └──> cartTotal & cartItemCount
            │
            └──> useOrder(sessionCode, onSuccess)
                    │
                    ├──> submits cart to backend
                    └──> triggers clearCart() on success
```

## Component Props Flow

```
MenuHeader
├── sessionCode      ← useSession
├── searchQuery      ← useMenu
├── onSearchChange   → useMenu.setSearchQuery
├── categories       ← useMenu
├── selectedCategory ← useMenu
├── onCategoryChange → useMenu.setSelectedCategory
├── cartItemCount    ← useCart
└── onOpenCart       → setIsCartOpen(true)

MenuGrid
├── items           ← useMenu.filteredItems
├── onProductClick  → useProductDetail.openProductDetail
└── onAddToCart     → useCart.addToCart

CartDrawer
├── open            ← useCart.isCartOpen
├── onClose         → useCart.setIsCartOpen(false)
├── cart            ← useCart.cart
├── cartTotal       ← useCart.cartTotal
├── onUpdateQuantity → useCart.updateQuantity
├── onRemoveItem    → useCart.removeFromCart
├── onSubmitOrder   → handleSubmitOrder
├── isSubmitting    ← useOrder.isSubmitting
├── isError         ← useOrder.isError
└── isOnline        ← useOnlineStatus

ProductDetailModal
├── product         ← useProductDetail.selectedProduct
├── open            ← !!selectedProduct
├── onClose         → useProductDetail.closeProductDetail
├── onAddToCart     → handleAddToCartFromDetail
└── onImageClick    → useProductDetail.openLightbox
```

## API Integration

```
┌─────────────────┐
│  selfOrderApi   │  (API Client)
└─────────────────┘
        │
        ├──> getSession(sessionCode)
        │    └──> useSession hook
        │
        ├──> getMenu(outletId)
        │    └──> useMenu hook
        │
        ├──> addItem(sessionCode, item)
        │    └──> useOrder mutation
        │
        └──> submitSession(sessionCode)
             └──> useOrder mutation
```

## Event Handling Flow

### 1. Add to Cart Flow
```
User clicks "Add" button on MenuGrid
    │
    ├──> Quick add: MenuGrid.onAddToCart(product)
    │       └──> useCart.addToCart(product)
    │               └──> Updates cart state
    │
    └──> Detailed add: MenuGrid.onProductClick(product)
            └──> useProductDetail.openProductDetail(product)
                    └──> Shows ProductDetailModal
                            └──> User clicks "Tambah ke Keranjang"
                                    └──> handleAddToCartFromDetail(product)
                                            └──> useCart.addToCart(product)
                                                    └──> useProductDetail.closeProductDetail()
```

### 2. Submit Order Flow
```
User clicks "Kirim Pesanan" in CartDrawer
    │
    └──> handleSubmitOrder()
            │
            ├──> Check isOnline
            │    └──> if offline: show error alert
            │
            └──> if online: useOrder.submitOrder(cart, isOnline)
                    │
                    ├──> setOrderStatus('submitting')
                    ├──> for each cart item: selfOrderApi.addItem()
                    ├──> selfOrderApi.submitSession()
                    │
                    ├──> onSuccess:
                    │    ├──> setOrderStatus('success')
                    │    ├──> setOrderNumber(data.orderNumber)
                    │    ├──> clearCart()
                    │    └──> Show OrderConfirmation component
                    │
                    └──> onError:
                         └──> setOrderStatus('error')
                              └──> Show error alert in CartDrawer
```

### 3. Category Filter Flow
```
User clicks category pill in MenuHeader
    │
    └──> MenuHeader.onCategoryChange(category)
            └──> useMenu.setSelectedCategory(category)
                    └──> Triggers filteredItems recalculation
                            └──> MenuGrid re-renders with new items
```

### 4. Search Flow
```
User types in search input
    │
    └──> MenuHeader.onSearchChange(value)
            └──> useMenu.setSearchQuery(value)
                    └──> Triggers filteredItems recalculation
                            └──> MenuGrid re-renders with filtered items
```

## Error Handling

### 1. Network Errors
```
useOnlineStatus() monitors navigator.onLine
    │
    ├──> If offline:
    │    ├──> OfflineIndicator shows banner
    │    └──> Submit button disabled in CartDrawer
    │
    └──> If user tries to submit while offline:
         └──> Show OfflineErrorAlert (5 seconds)
```

### 2. API Errors
```
useSession() or useMenu() fails
    │
    └──> TanStack Query error state
            └──> Can add error boundaries or error components

useOrder() submission fails
    │
    └──> setOrderStatus('error')
            └──> CartDrawer shows error alert
```

### 3. Session Not Found
```
useSession() returns null after loading
    │
    └──> Main page renders SessionNotFound component
            └──> Shows "QR code invalid or expired" message
```

## Loading States

```
sessionLoading || menuLoading
    │
    └──> Main page renders LoadingState component
            └──> Shows skeleton placeholders:
                 ├── Header skeleton
                 ├── Search skeleton
                 ├── Category pills skeleton
                 └── Product grid skeleton (6 items)
```

## Success Flow

```
orderStatus === 'success' && orderNumber
    │
    └──> Main page renders OrderConfirmation component
            │
            ├──> Shows order number, total, estimated time
            ├──> "Lihat Status" button → resetOrder()
            └──> "Pesan Lagi" button → resetOrder()
                    └──> Returns to menu view
```

## Performance Optimizations

### 1. Memoization
```typescript
// useMenu hook
const categories = useMemo(() => [...], [menuItems]);
const filteredItems = useMemo(() => [...], [menuItems, selectedCategory, searchQuery]);

// useCart hook
const cartTotal = useMemo(() => [...], [cart]);
const cartItemCount = useMemo(() => [...], [cart]);
```

### 2. Lazy Loading
```typescript
// MenuGrid component
<img loading="lazy" src={item.imageUrl} />
```

### 3. Optimized Re-renders
- Pure components (no internal state)
- useCallback for event handlers
- Proper dependency arrays

## Testing Structure

```
hooks/
├── __tests__/
│   ├── use-session.test.ts
│   ├── use-menu.test.ts
│   ├── use-cart.test.ts
│   ├── use-order.test.ts
│   ├── use-online-status.test.ts
│   └── use-product-detail.test.ts

components/
├── __tests__/
│   ├── menu-header.test.tsx
│   ├── menu-grid.test.tsx
│   ├── cart-drawer.test.tsx
│   ├── product-detail-modal.test.tsx
│   └── loading-state.test.tsx

customer-self-order-page.test.tsx (integration tests)
```

## Folder Structure (Detailed)

```
self-order/
├── hooks/                              # Business logic layer
│   ├── index.ts                        # Barrel export
│   ├── use-session.ts                  # Session data fetching
│   ├── use-menu.ts                     # Menu filtering
│   ├── use-cart.ts                     # Cart operations
│   ├── use-order.ts                    # Order submission
│   ├── use-online-status.ts            # Network monitoring
│   └── use-product-detail.ts           # Modal state
│
├── components/                         # Presentation layer
│   ├── index.ts                        # Barrel export
│   ├── menu-header.tsx                 # Header UI
│   ├── menu-grid.tsx                   # Product grid UI
│   ├── cart-drawer.tsx                 # Cart modal UI
│   ├── product-detail-modal.tsx        # Product detail UI
│   ├── loading-state.tsx               # Loading skeleton UI
│   ├── session-not-found.tsx           # Error state UI
│   ├── offline-error-alert.tsx         # Error notification UI
│   ├── offline-indicator.tsx           # Offline banner UI (existing)
│   ├── order-confirmation.tsx          # Success screen UI (existing)
│   ├── product-lightbox.tsx            # Image viewer UI (existing)
│   ├── product-recommendations.tsx     # Recommendations UI (existing)
│   └── sticky-cart-footer.tsx          # Cart footer UI (existing)
│
├── customer-self-order-page.tsx        # Main orchestration
├── self-order-page.tsx                 # Admin self-order management (separate)
├── customer-self-order-page.tsx.backup # Backup of original file
├── REFACTORING.md                      # Refactoring documentation
└── ARCHITECTURE.md                     # This file
```

## Code Metrics

### Before Refactoring
- **Files**: 1
- **Lines**: 598
- **Functions**: ~10 (mixed in one file)
- **Complexity**: High (monolithic)
- **Testability**: Low (tightly coupled)

### After Refactoring
- **Files**: 15 (6 hooks + 8 new components + 1 main)
- **Lines**: 1,012 (better organized)
- **Functions**: ~30 (well separated)
- **Complexity**: Low (single responsibility)
- **Testability**: High (decoupled)
- **Average File Size**: 67 lines
- **Largest File**: 199 lines (main page)
- **All Files**: Under 200 lines ✅

## Design Principles Applied

1. **Separation of Concerns**: Hooks handle logic, components handle UI
2. **Single Responsibility**: Each file has one clear purpose
3. **DRY (Don't Repeat Yourself)**: Shared logic in reusable hooks
4. **Composition over Inheritance**: Main page composes hooks and components
5. **Open/Closed**: Easy to extend without modifying existing code
6. **Dependency Inversion**: Components depend on props, not implementations

## Summary

The refactored architecture follows a clean, layered approach:

- **Hooks Layer**: Encapsulates data fetching, state management, and business logic
- **Component Layer**: Pure presentational components with minimal logic
- **Page Layer**: Orchestrates hooks and components, handles glue logic

This architecture provides:
- ✅ Better maintainability
- ✅ Easier testing
- ✅ Code reusability
- ✅ Clear separation of concerns
- ✅ Scalability for future features

---

**Architecture designed by**: Claude Code
**Date**: 2026-02-06
