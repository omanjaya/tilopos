# Shared Components Library - TiloPOS

## Overview

Dokumentasi lengkap component library TiloPOS yang tersedia di `packages/web/src/components/`. Gunakan dokumentasi ini sebagai **single source of truth** untuk menghindari duplikasi komponen.

**Last Updated**: 2026-02-05
**Status**: Active Reference

---

## Component Inventory

### UI Components (26 komponen)

Base components dari shadcn/ui + Radix UI. Lokasi: `src/components/ui/`

| Component | File | Props | Use Case |
|-----------|------|-------|----------|
| **Accordion** | `accordion.tsx` | `type, collapsible` | Collapsible sections, FAQ |
| **Alert** | `alert.tsx` | `variant: default\|destructive` | Info messages, warnings |
| **Avatar** | `avatar.tsx` | `src, fallback` | User profile images |
| **Badge** | `badge.tsx` | `variant: default\|secondary\|destructive\|outline` | Status labels, tags |
| **Button** | `button.tsx` | `variant, size, disabled, asChild` | Primary actions, CTAs |
| **Calendar** | `calendar.tsx` | `mode, selected, onSelect` | Date pickers |
| **Card** | `card.tsx` | - | Content containers |
| **Dialog** | `dialog.tsx` | `open, onOpenChange` | Modals, confirmations |
| **Dropdown Menu** | `dropdown-menu.tsx` | `trigger, items` | Action menus |
| **Form** | `form.tsx` | React Hook Form integration | Form fields with validation |
| **Input** | `input.tsx` | `type, placeholder, disabled` | Text inputs |
| **Label** | `label.tsx` | `htmlFor` | Form field labels |
| **Popover** | `popover.tsx` | `trigger, content` | Tooltips, small overlays |
| **Premium Icons** | `premium-icons.tsx` | Custom icon set | Business-specific icons |
| **Scroll Area** | `scroll-area.tsx` | - | Custom scrollbars |
| **Select** | `select.tsx` | `value, onValueChange, options` | Dropdowns |
| **Separator** | `separator.tsx` | `orientation` | Dividers |
| **Sheet** | `sheet.tsx` | `side: top\|bottom\|left\|right` | Side panels, bottom sheets |
| **Skeleton** | `skeleton.tsx` | `className` | Loading placeholders |
| **Switch** | `switch.tsx` | `checked, onCheckedChange` | Toggle switches |
| **Table** | `table.tsx` | - | Data tables (HTML table) |
| **Tabs** | `tabs.tsx` | `defaultValue, value` | Tab navigation |
| **Textarea** | `textarea.tsx` | `placeholder, rows` | Multiline text input |
| **Toast** | `toast.tsx` | `title, description, variant` | Notifications |
| **Toaster** | `toaster.tsx` | - | Toast container |
| **Tooltip** | `tooltip.tsx` | `trigger, content` | Hover hints |

---

### Shared Components (23 komponen)

Business logic components. Lokasi: `src/components/shared/`

| Component | File | Props | Use Case |
|-----------|------|-------|----------|
| **Breadcrumbs** | `breadcrumbs.tsx` | Auto-generated from route | Navigation breadcrumbs |
| **Calculation Help** | `calculation-help.tsx` | - | Formula helper tooltip |
| **Command Palette** | `command-palette.tsx` | `open, onOpenChange` | ⌘K quick navigation |
| **Confirm Dialog** | `confirm-dialog.tsx` | `title, description, onConfirm` | Delete confirmations |
| **Data Table** | `data-table.tsx` | `columns, data, isLoading, empty*` | List pages with search/filter |
| **Data Timestamp** | `data-timestamp.tsx` | `date` | Formatted timestamps |
| **Date Range Picker** | `date-range-picker.tsx` | `from, to, onSelect` | Report date filters |
| **Empty State** | `empty-state.tsx` | `icon, title, description, action` | No data UI |
| **Error Boundary** | `error-boundary.tsx` | `children, fallback` | Error catching |
| **Export Buttons** | `export-buttons.tsx` | `onExportPDF, onExportExcel, onPrint` | Report exports |
| **Help Sidebar** | `help-sidebar.tsx` | `page, topic` | Contextual help panel |
| **Help Tooltip** | `help-tooltip.tsx` | `content` | Inline help icons |
| **Image Upload** | `image-upload.tsx` | `value, onChange, maxSize` | Product/profile images |
| **Loading Skeleton** | `loading-skeleton.tsx` | `rows` | Multi-row skeleton loader |
| **Metric Card** | `metric-card.tsx` | `title, value, icon, trend, change` | Dashboard KPI cards |
| **Page Header** | `page-header.tsx` | `title, description, action` | Page titles |
| **Product Tour** | `product-tour.tsx` | `steps, isOpen` | Shepherd.js onboarding |
| **Realtime Provider** | `realtime-provider.tsx` | `children` | WebSocket context |
| **Report Empty State** | `report-empty-state.tsx` | `title, description, onChangeDateRange` | Report no-data UI |
| **Report Error State** | `report-error-state.tsx` | `title, error, onRetry` | Report error UI |
| **Sync Status Indicator** | `sync-status-indicator.tsx` | `status` | Offline sync badge |
| **Trend Indicator** | `trend-indicator.tsx` | `value, direction, suffix` | ↑ +15% trend arrows |

---

### Layout Components (3 komponen)

App-level layout. Lokasi: `src/components/layout/`

| Component | File | Props | Use Case |
|-----------|------|-------|----------|
| **App Layout** | `app-layout.tsx` | `children` | Main app shell with sidebar |
| **Header** | `header.tsx` | - | Top navigation bar |
| **Sidebar** | `sidebar.tsx` | `collapsed, onToggle` | Left navigation sidebar |

**Plus:**
- `notification-bell.tsx` - Header notification icon
- `sync-indicator.tsx` - Header sync status
- `theme-toggle.tsx` - Dark mode toggle

---

## Component Usage Guidelines

### When to Use Which Component?

#### **Buttons**

```tsx
// Primary action (CTAs)
<Button variant="default">Simpan</Button>

// Secondary action (Cancel, Back)
<Button variant="outline">Batal</Button>

// Destructive action (Delete)
<Button variant="destructive">Hapus</Button>

// Ghost/minimal (icon buttons, less emphasis)
<Button variant="ghost" size="icon">
  <Settings className="h-4 w-4" />
</Button>
```

#### **Cards vs. Alerts**

```tsx
// Card: Container for grouped content
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Alert: Important messages requiring attention
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong.</AlertDescription>
</Alert>
```

#### **Dialog vs. Sheet**

```tsx
// Dialog: Centered modal for forms, confirmations
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Product</DialogTitle>
    </DialogHeader>
    {/* Form content */}
  </DialogContent>
</Dialog>

// Sheet: Side panel (desktop) or bottom sheet (mobile)
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent side="right"> {/* or "bottom" for mobile */}
    {/* Content */}
  </SheetContent>
</Sheet>
```

#### **Empty State vs. Report Empty State**

```tsx
// Generic empty state (lists, tables)
<EmptyState
  icon={Package}
  title="Belum ada produk"
  description="Tambahkan produk pertama Anda."
  action={<Button onClick={handleAdd}>Tambah Produk</Button>}
/>

// Report-specific empty state (with date range context)
<ReportEmptyState
  title="Belum ada penjualan"
  description="Belum ada transaksi untuk periode ini."
  onChangeDateRange={() => setShowDatePicker(true)}
/>
```

#### **Data Table (Recommended for List Pages)**

```tsx
// Use DataTable for all list/table pages
<DataTable
  columns={columns}
  data={data ?? []}
  isLoading={isLoading}
  searchPlaceholder="Cari produk..."
  emptyTitle="Belum ada produk"
  emptyDescription="Tambahkan produk pertama Anda."
/>
```

**Features:**
- Built-in loading state (5 skeleton rows)
- Built-in empty state
- Search functionality
- Filter support
- Sorting

**When NOT to use:** Custom layouts (POS product grid, KDS cards)

---

## Props Standardization

### Common Prop Patterns

#### **Size Props**
```tsx
// Buttons, inputs
size?: "default" | "sm" | "lg" | "icon"

// Icons
className="h-4 w-4"  // Small (16px)
className="h-5 w-5"  // Default (20px)
className="h-6 w-6"  // Large (24px)
```

#### **Variant Props**
```tsx
variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
```

#### **State Props**
```tsx
disabled?: boolean
isLoading?: boolean
isPending?: boolean  // For mutations
```

#### **Callback Props**
```tsx
onClick?: () => void
onChange?: (value: T) => void
onSubmit?: (data: T) => void
onSuccess?: () => void
onError?: (error: Error) => void
```

---

## Composition Patterns

### Pattern 1: Form with Dialog

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Add Product</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add New Product</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} />
        </div>
        {/* More fields */}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### Pattern 2: Confirm Delete Dialog

```tsx
<ConfirmDialog
  open={deleteTarget !== null}
  onOpenChange={() => setDeleteTarget(null)}
  title="Hapus Produk?"
  description={`Yakin ingin menghapus "${deleteTarget?.name}"? Aksi ini tidak dapat dibatalkan.`}
  onConfirm={() => deleteMutation.mutate(deleteTarget!.id)}
  confirmText="Hapus"
  confirmVariant="destructive"
/>
```

### Pattern 3: List Page with DataTable

```tsx
export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => productsApi.list({ search }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produk dihapus' });
      setDeleteTarget(null);
    },
  });

  const columns = [
    { key: 'name', label: 'Nama' },
    { key: 'price', label: 'Harga' },
    {
      key: 'actions',
      label: '',
      render: (product: Product) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDeleteTarget(product)}
          aria-label="Delete product"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Products"
        action={<Button onClick={() => navigate('/app/products/new')}>Add Product</Button>}
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        searchPlaceholder="Search products..."
        emptyTitle="No products yet"
        emptyDescription="Add your first product."
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Product?"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        onConfirm={() => deleteMutation.mutate(deleteTarget!.id)}
        confirmVariant="destructive"
      />
    </>
  );
}
```

---

## Missing Components (Need to Build)

Based on audit findings, these components are planned but **NOT yet implemented**:

### 🔴 **Critical Priority**

1. **MobileTable** - Card grid converter for tables on mobile
   ```tsx
   // Planned usage
   <MobileTable
     data={products}
     renderCard={(item) => <ProductCard product={item} />}
     breakpoint="md"  // Show table on md+, cards on mobile
   />
   ```

2. **CardSkeleton** - Reusable metric card skeleton
   ```tsx
   // Replace duplicated code in 5 files
   <CardSkeleton count={4} />
   ```

### 🟡 **High Priority**

3. **MobileNav** - Bottom navigation bar for phones
4. **MobileFilters** - Bottom sheet filter component
5. **ListErrorState** - Error UI for list pages (similar to ReportErrorState)

### 🟢 **Nice to Have**

6. **MobileChart** - Mobile-optimized chart wrapper
7. **FormFieldGroup** - Reusable form field wrapper
8. **StatCardIcon** - Icon container (replace `h-10 w-10 bg-primary/10` duplication)

---

## Component Dependency Tree

```
App
├── ErrorBoundary (shared)
├── QueryClientProvider (TanStack Query)
├── OnboardingProvider (features/onboarding)
└── Router
    ├── App Layout (layout)
    │   ├── Sidebar (layout)
    │   ├── Header (layout)
    │   │   ├── NotificationBell (layout)
    │   │   ├── SyncIndicator (layout)
    │   │   └── ThemeToggle (layout)
    │   ├── Breadcrumbs (shared)
    │   └── CommandPalette (shared)
    └── Page Content
        ├── PageHeader (shared)
        ├── DataTable (shared)
        │   ├── Table (ui)
        │   ├── Skeleton (ui)
        │   └── EmptyState (shared)
        ├── Dialog (ui)
        ├── Sheet (ui)
        └── Toast/Toaster (ui)
```

---

## Anti-Patterns to Avoid

### ❌ **DON'T: Create One-Off Components for Common Patterns**

```tsx
// BAD - Custom empty state component
function ProductEmptyState() {
  return (
    <div className="flex flex-col items-center py-8">
      <Package className="h-10 w-10 text-muted-foreground" />
      <p>No products</p>
    </div>
  );
}

// GOOD - Use shared EmptyState
<EmptyState
  icon={Package}
  title="No products"
  description="Add your first product."
/>
```

### ❌ **DON'T: Duplicate Component Logic**

```tsx
// BAD - Duplicate confirm dialog
function DeleteProductDialog({ product, onConfirm }) {
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>Are you sure?</DialogHeader>
        <DialogFooter>
          <Button onClick={onConfirm}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// GOOD - Use ConfirmDialog
<ConfirmDialog
  title="Delete Product?"
  onConfirm={handleDelete}
/>
```

### ❌ **DON'T: Hardcode Sizes, Use Design Tokens**

```tsx
// BAD
<div className="h-[72px] w-[72px] rounded-[12px]">

// GOOD
<div className="h-18 w-18 rounded-xl">
```

---

## Accessibility Requirements

All components **MUST** follow these accessibility rules:

### **Interactive Elements**
```tsx
// Icon-only buttons MUST have aria-label
<Button variant="ghost" size="icon" aria-label="Delete product">
  <Trash2 className="h-4 w-4" />
</Button>

// Decorative icons MUST be hidden from screen readers
<ChevronRight className="h-4 w-4" aria-hidden="true" />
```

### **Forms**
```tsx
// Labels MUST be associated with inputs
<Label htmlFor="name">Product Name</Label>
<Input id="name" aria-describedby="name-error" {...register("name")} />
{errors.name && (
  <p id="name-error" className="text-sm text-destructive">
    {errors.name.message}
  </p>
)}
```

### **Modals**
```tsx
// Dialog MUST have title and description linked
<DialogTitle id="dialog-title">Edit Product</DialogTitle>
<DialogDescription id="dialog-desc">
  Make changes to product details.
</DialogDescription>
```

### **Touch Targets**
```tsx
// Minimum 44px for touch devices
<Button className="min-h-[44px] min-w-[44px]">Click</Button>
```

See **[05-ACCESSIBILITY.md](./05-ACCESSIBILITY.md)** for full guidelines.

---

## ESLint & Code Quality

### **Linting Rules for Components**

All component files must pass ESLint without errors:

```bash
# Check linting
npm run lint

# Auto-fix issues
npm run lint --fix
```

### **Common Lint Errors to Avoid**

#### **1. Missing Dependencies in useEffect/useCallback**
```tsx
// ❌ BAD - Missing dependency
useEffect(() => {
  fetchData(productId);
}, []); // ESLint error: productId not in deps

// ✅ GOOD
useEffect(() => {
  fetchData(productId);
}, [productId]);
```

#### **2. Unused Variables**
```tsx
// ❌ BAD
const { data, isLoading, error } = useQuery(...);
// Only using 'data', 'error' is unused

// ✅ GOOD
const { data, isLoading } = useQuery(...);
```

#### **3. Missing Key Prop in Lists**
```tsx
// ❌ BAD
{items.map(item => <Card>{item.name}</Card>)}

// ✅ GOOD
{items.map(item => <Card key={item.id}>{item.name}</Card>)}
```

#### **4. Explicit Any Types**
```tsx
// ❌ BAD
function MyComponent({ data }: any) { ... }

// ✅ GOOD
interface MyComponentProps {
  data: Product[];
}
function MyComponent({ data }: MyComponentProps) { ... }
```

#### **5. Missing Display Name (for HOCs)**
```tsx
// ❌ BAD
export default memo(MyComponent);

// ✅ GOOD
const MemoizedComponent = memo(MyComponent);
MemoizedComponent.displayName = 'MyComponent';
export default MemoizedComponent;
```

### **Pre-Commit Hooks**

TiloPOS menggunakan linting checks sebelum commit:

```json
// package.json
{
  "scripts": {
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  }
}
```

**Before committing:**
1. Run `npm run lint` to check errors
2. Fix all errors and warnings
3. Commit only after lint passes

---

## TypeScript Best Practices

### **1. Type Component Props**
```tsx
// ✅ GOOD
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
}

export function Button({ variant = 'default', size = 'default', disabled, children }: ButtonProps) {
  // ...
}
```

### **2. Use Generics for Reusable Components**
```tsx
// ✅ GOOD
interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
}

export function DataTable<T>({ columns, data, isLoading }: DataTableProps<T>) {
  // ...
}
```

### **3. Extract Complex Types**
```tsx
// ✅ GOOD
// types/product.types.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
}

// components/product-card.tsx
import type { Product } from '@/types/product.types';

interface ProductCardProps {
  product: Product;
}
```

---

## Testing Requirements

### **Component Tests (Vitest + Testing Library)**

All shared components should have tests:

```tsx
// __tests__/empty-state.test.tsx
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../empty-state';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="No data"
        description="Add your first item"
      />
    );

    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('Add your first item')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    render(
      <EmptyState
        title="No data"
        action={<button>Add Item</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
  });
});
```

---

## Checklist: Adding New Components

Before adding a new component, check:

- [ ] **Does a similar component already exist?** Check this inventory first
- [ ] **Is this component reusable?** If yes, add to `shared/`, if no, keep in feature folder
- [ ] **Does it follow design system?** Use design tokens (colors, spacing, typography)
- [ ] **Is it accessible?** ARIA labels, keyboard navigation, screen reader support
- [ ] **Does it have TypeScript types?** Props interface, generics if needed
- [ ] **Does it pass linting?** Run `npm run lint` before committing
- [ ] **Does it have tests?** Basic render test at minimum
- [ ] **Is it documented?** Add to this file if it's a shared component

---

## Related Documentation

- **[02-DESIGN-SYSTEM.md](./02-DESIGN-SYSTEM.md)** - Design tokens, colors, typography
- **[04-LOADING-STATES.md](./04-LOADING-STATES.md)** - Loading patterns
- **[05-ACCESSIBILITY.md](./05-ACCESSIBILITY.md)** - A11y guidelines

---

**Questions?** Check existing components first, then ask the team.

**Found a bug?** Fix it and add a test to prevent regression.

**Need a new component?** Follow the checklist above and ensure it doesn't duplicate existing functionality.
