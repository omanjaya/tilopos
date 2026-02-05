# Responsive Design Strategy - TiloPOS

## Breakpoint System

### Standard Breakpoints (Tailwind)

```css
/* Mobile First Approach */
sm:   640px   /* Small tablets & large phones (landscape) */
md:   768px   /* Tablets (portrait) */
lg:   1024px  /* Tablets (landscape) & small laptops */
xl:   1280px  /* Laptops & desktops */
2xl:  1536px  /* Large desktops */
```

### Custom Breakpoints (if needed)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'xs': '480px',      // Extra small devices
      'sm': '640px',      // Small devices
      'md': '768px',      // Medium devices
      'lg': '1024px',     // Large devices
      'xl': '1280px',     // Extra large devices
      '2xl': '1536px',    // 2X Extra large
      'tablet': '768px',  // Alias for tablets
      'laptop': '1024px', // Alias for laptops
      'desktop': '1280px',// Alias for desktops
    }
  }
}
```

## Device Categories & Design Approach

⚠️ **IMPORTANT: SEPARATE FILES APPROACH**

TiloPOS uses **separate component files** for desktop and mobile, NOT responsive breakpoints in a single file.

**Why Separate Files?**
- Cleaner code (no complex breakpoint logic)
- Better performance (load only needed version)
- Easier maintenance (desktop/mobile devs work independently)
- Optimized UX per device (not compromised responsive)

### Mobile (< 768px)
**Primary Use**: Cashier on-the-go, inventory checking, order updates

**File Naming:**
- `products-page.mobile.tsx`
- `cart-panel.mobile.tsx`

**Characteristics**:
- Single column layouts
- Touch-first interactions (min 44px tap targets)
- Bottom navigation
- Fullscreen modals instead of popovers
- Card views (no tables)
- Floating action buttons

### Tablet (768px - 1024px)
**Primary Use**: Kitchen Display System (KDS), table management, POS terminal

**File Naming:**
- Uses **desktop version** with slight adjustments
- OR dedicated tablet file if needed: `kds-page.tablet.tsx`

**Characteristics**:
- Two column layouts
- Sidebar navigation (collapsible)
- Grid views (2-3 columns)
- Larger tap targets (48px)
- Touch-optimized

### Desktop (> 1024px)
**Primary Use**: Admin tasks, reporting, inventory management

**File Naming:**
- `products-page.tsx` (default)
- `dashboard-page.tsx`

**Characteristics**:
- Multi-column layouts
- Persistent sidebar navigation
- Modal dialogs
- Data tables (full features)
- Hover interactions
- Keyboard shortcuts
- Multi-panel views

---

## Pages Requiring Mobile-Specific Views

### 🔴 CRITICAL - Separate Mobile Files Required

| Page | Desktop File | Mobile File | Implementation |
|------|-------------|-------------|----------------|
| **POS** | `pos-page.tsx` | `pos-page.mobile.tsx` | ✅ Implemented |
| **Dashboard** | `dashboard-page.tsx` | `dashboard-page.mobile.tsx` | ❌ Not yet |
| **Products List** | `products-page.tsx` | `products-page.mobile.tsx` | ❌ Not yet |
| **Inventory** | `stock-page.tsx` | `stock-page.mobile.tsx` | ❌ Not yet |
| **Orders** | `orders-page.tsx` | `orders-page.mobile.tsx` | ❌ Not yet |
| **Reports** | `*-report.tsx` | `*-report.mobile.tsx` | ❌ Not yet |
| **Table Management** | `tables-page.tsx` | `tables-page.mobile.tsx` | ❌ Not yet |

### File Structure Example

```
features/
├── products/
│   ├── products-page.tsx              # Desktop version
│   ├── products-page.mobile.tsx       # Mobile version
│   ├── product-form-page.tsx          # Desktop form
│   ├── product-form-page.mobile.tsx   # Mobile form
│   └── components/
│       ├── product-card.tsx           # Shared component
│       └── product-filters.tsx        # Desktop filters
│           └── product-filters.mobile.tsx  # Mobile filters
```

### Router Logic (Device Detection)

```tsx
// router.tsx
import { useMediaQuery } from '@/hooks/use-media-query';

function ProductsRoute() {
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (isMobile) {
    return <ProductsPageMobile />;
  }

  return <ProductsPage />;
}

// Or use lazy loading
const ProductsPage = lazy(() => import('./products-page'));
const ProductsPageMobile = lazy(() => import('./products-page.mobile'));
```

### 🟡 IMPORTANT - Responsive Adaptation

| Page | Adaptation Strategy |
|------|---------------------|
| **Product Form** | 2-column → 1-column, tabs for sections |
| **Customer Detail** | Side panel → Fullscreen modal |
| **Employee Management** | Table → Card grid |
| **Settings** | 2-column → Accordion sections |
| **Stock Transfer** | Split view → Wizard steps |
| **Payment Methods** | Grid → List |
| **Kitchen Display** | Multi-column → Single column carousel |

### 🟢 MINIMAL - Use Default Responsive

| Page | Strategy |
|------|----------|
| **Login** | Center card (already responsive) |
| **Onboarding Wizard** | Fullscreen (all devices) |
| **Profile** | Single column (already responsive) |
| **Help Center** | Article view (already responsive) |

---

## Layout Patterns

### Pattern 1: **Three-Column to Single-Column** (POS)

**Desktop (lg+)**:
```
┌──────────────────────────────────────────────┐
│ [Categories] │ [Products Grid] │    [Cart]   │
│     20%      │       50%       │     30%     │
└──────────────────────────────────────────────┘
```

**Mobile (< lg)**:
```
Step 1: Browse              Step 2: Cart
┌───────────────────┐      ┌───────────────────┐
│   [Categories]    │      │  [Cart Header]    │
│ [Products Grid]   │ →    │  [Items List]     │
│                   │      │  [Payment Button] │
└───────────────────┘      └───────────────────┘
        ↓                          ↓
   [Floating Cart              [Back to
      Badge]                   Products]
```

### Pattern 2: **Table to Card Grid** (Products, Inventory)

**Desktop (md+)**:
```html
<table className="w-full">
  <thead>...</thead>
  <tbody>
    <tr>...</tr>
  </tbody>
</table>
```

**Mobile (< md)**:
```html
<div className="grid gap-4">
  <Card>
    <CardHeader>Product Name</CardHeader>
    <CardContent>
      <!-- Key info in vertical layout -->
    </CardContent>
    <CardFooter>
      <!-- Actions -->
    </CardFooter>
  </Card>
</div>
```

### Pattern 3: **Side Panel to Bottom Sheet** (Filters, Details)

**Desktop (lg+)**:
```
┌──────────────────────────────────┐
│ [Main Content] │ [Side Panel]    │
│                │                 │
│      70%       │      30%        │
└──────────────────────────────────┘
```

**Mobile (< lg)**:
```
┌──────────────────┐
│ [Main Content]   │
│                  │
│                  │
└──────────────────┘
       │
       ↓ (Swipe up or tap "Filters")
┌──────────────────┐
│ [Bottom Sheet]   │
│ [Content]        │
│ [Actions]        │
└──────────────────┘
```

### Pattern 4: **Dashboard Metrics**

**Desktop (lg+)**:
```
┌─────────┬─────────┬─────────┬─────────┐
│ Metric 1│ Metric 2│ Metric 3│ Metric 4│
└─────────┴─────────┴─────────┴─────────┘
┌───────────────────┬───────────────────┐
│   Chart 1         │   Chart 2         │
└───────────────────┴───────────────────┘
```

**Mobile (< lg)**:
```
┌───────────────────┐
│ Swipeable Metrics │
│ [◦ ● ◦ ◦]         │ (Carousel)
├───────────────────┤
│ Chart 1           │
│ [Collapse/Expand] │
├───────────────────┤
│ Chart 2           │
│ [Collapse/Expand] │
└───────────────────┘
```

---

## Component Responsive Utilities

### Hide/Show Based on Breakpoint

```tsx
// Hide on mobile
<div className="hidden md:block">Desktop Only</div>

// Hide on desktop
<div className="block md:hidden">Mobile Only</div>

// Tablet only
<div className="hidden md:block lg:hidden">Tablet Only</div>
```

### Responsive Spacing

```tsx
// Mobile: 4, Tablet: 6, Desktop: 8
<div className="space-y-4 md:space-y-6 lg:space-y-8">

// Mobile: 16px, Desktop: 24px padding
<div className="p-4 lg:p-6">
```

### Responsive Grid

```tsx
// Mobile: 1 col, Tablet: 2 cols, Desktop: 4 cols
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

### Responsive Typography

```tsx
// Mobile: text-lg, Desktop: text-2xl
<h1 className="text-lg md:text-xl lg:text-2xl font-bold">
```

---

## Mobile-Specific Components to Build

### 1. Mobile Navigation
```tsx
// components/shared/MobileNav.tsx
- Bottom navigation bar (Home, Orders, Products, More)
- Hamburger menu for secondary items
- Persistent cart badge
```

### 2. Mobile POS Flow
```tsx
// features/pos/mobile/
- MobilePOSBrowse.tsx (Products + Categories)
- MobilePOSCart.tsx (Cart + Payment)
- MobilePOSPayment.tsx (Payment methods)
```

### 3. Mobile Table View
```tsx
// components/shared/MobileTable.tsx
- Converts table data to card grid
- Swipeable actions (delete, edit)
- Pull-to-refresh
```

### 4. Bottom Sheet
```tsx
// components/shared/BottomSheet.tsx
- Slide up from bottom
- Backdrop overlay
- Drag handle
- Close on backdrop click
```

### 5. Mobile Filters
```tsx
// components/shared/MobileFilters.tsx
- Bottom sheet with filter options
- Apply/Reset buttons
- Active filter chips
```

### 6. Mobile Charts
```tsx
// components/shared/MobileChart.tsx
- Horizontal scroll for long data
- Simplified tooltips
- Legend below chart
```

---

## Touch Interaction Guidelines

### Minimum Tap Target Size
- **Minimum**: 44x44px (iOS), 48x48px (Android)
- **Recommended**: 48x48px for all interactive elements
- **Spacing**: 8px minimum between tap targets

### Gestures
- **Swipe**: Navigate between tabs, dismiss items
- **Pull-to-refresh**: Lists and data views
- **Long-press**: Context menu, additional actions
- **Pinch-to-zoom**: Images, charts (if needed)

### Button Placement
- **Primary actions**: Bottom right (thumb zone)
- **Destructive actions**: Top right (harder to reach)
- **Navigation**: Bottom (tab bar) or top (back button)

---

## Testing Strategy

### Devices to Test
1. **Mobile**
   - iPhone SE (375px) - Small screen
   - iPhone 14 Pro (393px) - Standard
   - Samsung Galaxy S23 (360px) - Android

2. **Tablet**
   - iPad Mini (768px) - Portrait
   - iPad Pro (1024px) - Landscape

3. **Desktop**
   - MacBook Air (1280px)
   - 1080p Monitor (1920px)

### Testing Checklist
- [ ] All interactive elements have min 44px tap target
- [ ] Forms are thumb-friendly (inputs, selects)
- [ ] Scrolling is smooth (no janky animations)
- [ ] Modals fit in viewport (no overflow)
- [ ] Tables degrade gracefully (cards or horizontal scroll)
- [ ] Navigation is accessible (no hidden important links)
- [ ] Loading states work on all sizes
- [ ] Images scale properly (object-fit: cover)

---

## Implementation Priority

### Phase 1: Foundation
1. Setup responsive utilities
2. Create mobile navigation
3. Test breakpoints on core pages

### Phase 2: Critical Pages (Mobile Views)
1. POS (mobile flow)
2. Dashboard (vertical stack)
3. Products (card grid)
4. Orders (list view)

### Phase 3: Shared Components
1. MobileTable
2. BottomSheet
3. MobileFilters
4. MobileChart

### Phase 4: Refinement
1. Touch gesture improvements
2. Animation polish
3. Performance optimization
4. Real device testing

---

**Last Updated**: 2026-02-05
**Status**: Planning Phase
**Related**: [02-DESIGN-SYSTEM.md](./02-DESIGN-SYSTEM.md), [03-SHARED-COMPONENTS.md](./03-SHARED-COMPONENTS.md)
