# Phase 4: Polish & Micro-Interaction Improvements - Implementation Summary

## Overview
Implemented comprehensive UX polish and micro-interactions across TiloPOS web app, focusing on loading states, animations, toast notifications, and visual feedback for better user experience.

---

## 1. Loading Skeletons

### Implementation
**File:** `/packages/web/src/components/shared/loading-skeletons.tsx`

Created content-aware skeleton components that replace generic spinners:

- **MetricCardsSkeleton** - Dashboard metric cards with icon + text layout
- **ChartSkeleton** - Chart placeholders with proper sizing
- **ProductGridSkeleton** - Product grid with staggered animations (50ms delay)
- **TableRowsSkeleton** - Table rows for data tables
- **FormSkeleton** - Form fields skeleton
- **OrderCardSkeleton** - Order cards for KDS/orders
- **ListItemSkeleton** - Mobile list items
- **StatsCardsSkeleton** - Report statistics cards

**Features:**
- Fade-in animations (animate-in)
- Staggered delays for grid items (feels more natural)
- Content-aware shapes matching actual components

### Pages Updated
- `/features/dashboard/dashboard-page.tsx` - Metric cards + chart skeletons
- All pages using DataTable automatically get TableRowsSkeleton

---

## 2. Enhanced Empty States

### Implementation
**File:** `/packages/web/src/components/shared/empty-state.tsx`

**Improvements:**
- Added size variants (sm, md, lg)
- Glowing background effect on icon (bg-primary/5 + blur)
- Smooth fade-in animation (500ms)
- Action button with slide-in animation (150ms delay)
- Better spacing and typography
- Max-width constraint for description readability

**File:** `/packages/web/src/components/shared/data-table.tsx`

Added `emptyAction` prop to DataTable component for action buttons in empty states.

### Pages Updated with Actions
- **Products** - "Tambah Produk Pertama" button
- **Customers** - "Tambah Pelanggan Pertama" button
- **Employees** - "Tambah Karyawan Pertama" button
- Better descriptions explaining what to do next

---

## 3. Enhanced Toast Notifications

### Implementation
**File:** `/packages/web/src/lib/toast-utils.tsx`

Created enhanced toast system with visual indicators:

- **toast.success()** - Green border, checkmark icon
- **toast.error()** - Red border, X icon (existing variant enhanced)
- **toast.warning()** - Yellow border, alert icon
- **toast.info()** - Blue border, info icon
- **toast.loading()** - Blue border, spinner icon, no auto-dismiss
- **toast.promise()** - Shows loading → success/error automatically

**Features:**
- Icons integrated into description (not title, for better TS compatibility)
- Color-coded borders and backgrounds
- Smart duration defaults (3-5s)
- Better error context with detailed descriptions

### Pages Updated
All major CRUD operations now use enhanced toasts:

- **Products** - Create, update, delete with product name in toast
- **Orders** - Status updates with order number and new status
- **Customers** - Deactivate with customer name
- **Employees** - Delete with employee name
- **Inventory** - Stock adjustments with product name
- **Product Form** - Create/update with product name

**Before:**
```tsx
toast({ title: 'Produk dihapus' });
```

**After:**
```tsx
toast.success({
  title: 'Produk berhasil dihapus',
  description: `"${product.name}" telah dihapus dari daftar produk`,
});
```

---

## 4. Smooth Transitions & Animations

### Card Component
**File:** `/packages/web/src/components/ui/card.tsx`

- Added `transition-all duration-200`
- Hover shadow lift effect (`hover:shadow-md`)

### Button Component
**File:** `/packages/web/src/components/ui/button.tsx`

- Changed `transition-colors` → `transition-all` (200ms)
- Added `active:scale-95` for click feedback
- Enhanced hover shadows for default/destructive variants
- Border color change on hover for outline variant

### Input Component
**File:** `/packages/web/src/components/ui/input.tsx`

- Added `transition-all duration-200`
- Border color changes on focus (`focus-visible:border-ring`)
- Smoother focus ring appearance

### Select Component
**File:** `/packages/web/src/components/ui/select.tsx`

- Added `transition-all duration-200` to trigger
- Border color changes on focus

### Badge Component
**File:** `/packages/web/src/components/ui/badge.tsx`

- Changed `transition-colors` → `transition-all` for smoother animations

### Tabs Component
**File:** `/packages/web/src/components/ui/tabs.tsx`

- Added content fade-in + slide-up animation when switching tabs
- `data-[state=active]:animate-in fade-in-0 slide-in-from-bottom-2`

### MetricCard Component
**File:** `/packages/web/src/components/shared/metric-card.tsx`

- Added hover effects with group classes
- Icon background scales on hover (`group-hover:scale-110`)
- Icon itself also scales (`group-hover:scale-110`)
- Smooth 200ms transitions

---

## 5. Form Validation Enhancements

### Implementation
**File:** `/packages/web/src/components/shared/form-field-error.tsx`

Created reusable form error components:

- **FormFieldError** - Error message with alert icon, slide-in animation
- **FormField** - Input wrapper with error state styling
  - Red border when error + touched
  - Red focus ring when error
  - Accessible ARIA attributes

**Features:**
- Only shows when field is touched (no premature errors)
- Smooth slide-in animation (200ms)
- Icon + text layout
- Accessible with role="alert"

---

## 6. Micro-Interactions

### Success Checkmark
**File:** `/packages/web/src/components/shared/success-checkmark.tsx`

Animated checkmark for success states:
- Pulsing background effect
- Scale-in animation (zoom-in-50)
- Size variants (sm, md, lg)

### Loading Spinner Enhanced
**File:** `/packages/web/src/components/shared/loading-spinner-enhanced.tsx`

- **LoadingSpinnerEnhanced** - Spinner with pulsing background + optional text
- **LoadingOverlay** - Full-page loading overlay with backdrop blur

### Button with Ripple
**File:** `/packages/web/src/components/shared/button-with-ripple.tsx`

Material Design ripple effect on click:
- Calculates click position
- Creates expanding circle animation
- Auto-removes after 600ms
- Can be used as drop-in Button replacement

### Tailwind Config
**File:** `/packages/web/tailwind.config.ts`

Added custom animations:
```js
ripple: 'ripple 0.6s linear',
'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
```

---

## 7. Confirm Dialog Enhancement

### Implementation
**File:** `/packages/web/src/components/shared/confirm-dialog.tsx`

**Improvements:**
- Warning icon for destructive actions (animated zoom-in)
- Centered layout for better hierarchy
- Minimum button widths (100px) for consistency
- Better spacing and visual balance

---

## Performance Optimizations

### Staggered Animations
Grid items have staggered delays (50ms each) to prevent all items animating simultaneously:
```tsx
style={{ animationDelay: `${i * 50}ms` }}
```

### Animation Durations
Consistent timing across the app:
- **Fast:** 200ms (UI feedback, hover, focus)
- **Medium:** 300-500ms (enter/exit animations)
- **Slow:** 600ms+ (special effects like ripple)

### Transition Properties
Using `transition-all` sparingly, mostly for:
- Simple hover effects
- Focus states
- Small scale changes

For complex animations, using `animate-in` utilities from Tailwind.

---

## Accessibility Improvements

1. **ARIA Attributes:**
   - Form errors have `role="alert"`
   - Invalid inputs have `aria-invalid="true"`
   - Loading states have `aria-busy="true"`

2. **Keyboard Shortcuts Preserved:**
   - All existing shortcuts still work
   - Empty state actions are keyboard accessible

3. **Focus States:**
   - Enhanced focus rings on inputs
   - Visible focus indicators maintained

4. **Screen Reader Support:**
   - Loading spinners have descriptive text
   - Error messages properly announced

---

## Files Created

1. `/packages/web/src/components/shared/loading-skeletons.tsx`
2. `/packages/web/src/lib/toast-utils.tsx`
3. `/packages/web/src/components/shared/success-checkmark.tsx`
4. `/packages/web/src/components/shared/form-field-error.tsx`
5. `/packages/web/src/components/shared/button-with-ripple.tsx`
6. `/packages/web/src/components/shared/loading-spinner-enhanced.tsx`

## Files Modified

### Components (UI)
1. `/packages/web/src/components/ui/card.tsx`
2. `/packages/web/src/components/ui/button.tsx`
3. `/packages/web/src/components/ui/input.tsx`
4. `/packages/web/src/components/ui/select.tsx`
5. `/packages/web/src/components/ui/badge.tsx`
6. `/packages/web/src/components/ui/tabs.tsx`

### Components (Shared)
7. `/packages/web/src/components/shared/empty-state.tsx`
8. `/packages/web/src/components/shared/data-table.tsx`
9. `/packages/web/src/components/shared/metric-card.tsx`
10. `/packages/web/src/components/shared/confirm-dialog.tsx`

### Pages
11. `/packages/web/src/features/dashboard/dashboard-page.tsx`
12. `/packages/web/src/features/products/products-page.tsx`
13. `/packages/web/src/features/products/product-form-page.tsx`
14. `/packages/web/src/features/orders/orders-page.tsx`
15. `/packages/web/src/features/customers/customers-page.tsx`
16. `/packages/web/src/features/employees/employees-page.tsx`
17. `/packages/web/src/features/inventory/stock-page.tsx`

### Config
18. `/packages/web/tailwind.config.ts`

---

## Usage Examples

### Loading Skeletons
```tsx
import { MetricCardsSkeleton, ChartSkeleton } from '@/components/shared/loading-skeletons';

{isLoading ? (
  <MetricCardsSkeleton count={4} />
) : (
  <MetricCard {...data} />
)}
```

### Enhanced Toasts
```tsx
import { toast } from '@/lib/toast-utils';

// Success
toast.success({
  title: 'Operasi berhasil',
  description: 'Data telah disimpan',
});

// Error
toast.error({
  title: 'Terjadi kesalahan',
  description: error.message,
});

// Promise (auto-loading → success/error)
await toast.promise(apiCall(), {
  loading: 'Menyimpan...',
  success: 'Berhasil!',
  error: 'Gagal menyimpan',
});
```

### Empty States with Actions
```tsx
<DataTable
  data={items}
  emptyTitle="Belum ada data"
  emptyDescription="Mulai dengan menambahkan item pertama"
  emptyAction={
    <Button onClick={onCreate}>
      <Plus /> Tambah Item
    </Button>
  }
/>
```

### Form Validation
```tsx
import { FormFieldError } from '@/components/shared/form-field-error';

<Input
  value={name}
  onChange={(e) => setName(e.target.value)}
  onBlur={() => setTouched(true)}
  className={error && touched ? 'border-destructive' : ''}
/>
<FormFieldError error={error} touched={touched} />
```

---

## Testing Checklist

- [x] Dashboard loads with skeleton → data transition
- [x] Products page: create, edit, delete with proper toasts
- [x] Orders page: status updates with proper toasts
- [x] Customers page: empty state with action button
- [x] Employees page: empty state with action button
- [x] Empty states show glowing icon + action button
- [x] All buttons have hover + active states
- [x] Inputs have focus glow effect
- [x] Tabs have smooth content transition
- [x] Cards lift on hover
- [x] Confirm dialogs show warning icon
- [x] Toast notifications have icons
- [x] No TypeScript errors (except pre-existing number-input.tsx)
- [x] No ESLint warnings on updated pages

---

## Browser Compatibility

All animations use standard CSS transitions and Tailwind's animate-in utilities:
- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Mobile browsers: ✅

No complex CSS that requires vendor prefixes or polyfills.

---

## Performance Impact

Minimal performance impact:
- CSS transitions are GPU-accelerated
- Skeleton components are lightweight (no images)
- Staggered animations prevent jank
- No heavy JavaScript animations

Estimated bundle size increase: ~5KB (gzipped)

---

## Future Enhancements

Potential improvements for Phase 5:

1. **Optimistic Updates**
   - Implement in mutations for instant feedback
   - Revert on error with toast notification

2. **Advanced Micro-interactions**
   - Pull-to-refresh on mobile
   - Swipe gestures on cards
   - Long-press actions

3. **Enhanced Animations**
   - Page transitions
   - List reordering animations
   - Progress indicators for multi-step forms

4. **Form Enhancements**
   - Real-time validation
   - Auto-save with indicators
   - Field-level success feedback

---

## Conclusion

Phase 4 successfully implemented comprehensive polish and micro-interactions across TiloPOS. The improvements focus on:

✅ **Better Loading UX** - Content-aware skeletons instead of spinners
✅ **Enhanced Feedback** - Toasts with icons and detailed messages
✅ **Smooth Animations** - Consistent 200ms transitions throughout
✅ **Improved Empty States** - Helpful guidance with action buttons
✅ **Form Validation** - Clear error messages with visual indicators
✅ **Micro-interactions** - Hover effects, active states, focus glows

The app now feels significantly more polished and responsive, with better visual feedback for all user actions.
# Phase 4: Migration Guide for Developers

This guide helps you adopt Phase 4 improvements in new or existing pages.

---

## Quick Start Checklist

When creating a new page or updating an existing one:

- [ ] Replace generic spinners with skeleton components
- [ ] Use enhanced toast utilities
- [ ] Add empty state with action button
- [ ] Add hover/focus transitions to interactive elements
- [ ] Use proper form validation feedback
- [ ] Test on mobile and with keyboard

---

## 1. Loading States

### ❌ Old Pattern (Don't Use)
```tsx
import { Loader2 } from 'lucide-react';

export function MyPage() {
  const { data, isLoading } = useQuery({ ... });

  if (isLoading) {
    return <div className="flex justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return <div>{/* content */}</div>;
}
```

### ✅ New Pattern (Use This)
```tsx
import { MetricCardsSkeleton, TableRowsSkeleton } from '@/components/shared/loading-skeletons';

export function MyPage() {
  const { data, isLoading } = useQuery({ ... });

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-4">
        {isLoading ? (
          <MetricCardsSkeleton count={4} />
        ) : (
          metrics.map(m => <MetricCard key={m.id} {...m} />)
        )}
      </div>

      <DataTable
        data={data ?? []}
        isLoading={isLoading}  {/* DataTable handles TableRowsSkeleton automatically */}
        columns={columns}
      />
    </div>
  );
}
```

### Available Skeleton Components
```tsx
import {
  MetricCardsSkeleton,      // Dashboard metrics
  ChartSkeleton,            // Charts/graphs
  ProductGridSkeleton,      // Product grids
  TableRowsSkeleton,        // Table rows (automatic in DataTable)
  FormSkeleton,             // Form fields
  OrderCardSkeleton,        // Order/KDS cards
  ListItemSkeleton,         // List items (mobile)
  StatsCardsSkeleton,       // Report stats
} from '@/components/shared/loading-skeletons';
```

---

## 2. Toast Notifications

### ❌ Old Pattern (Don't Use)
```tsx
import { useToast } from '@/hooks/use-toast';

export function MyPage() {
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      await api.create(data);
      toast({ title: 'Success' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  return <Button onClick={handleSubmit}>Submit</Button>;
}
```

### ✅ New Pattern (Use This)
```tsx
import { toast } from '@/lib/toast-utils';

export function MyPage() {
  const handleSubmit = async () => {
    try {
      const result = await api.create(data);
      toast.success({
        title: 'Data berhasil disimpan',
        description: `"${result.name}" telah ditambahkan`,
      });
    } catch (error) {
      toast.error({
        title: 'Gagal menyimpan data',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    }
  };

  return <Button onClick={handleSubmit}>Submit</Button>;
}
```

### Toast Variants

```tsx
import { toast } from '@/lib/toast-utils';

// Success (green, checkmark)
toast.success({
  title: 'Operasi berhasil',
  description: 'Data telah disimpan',
  duration: 3000, // optional, defaults to 3000
});

// Error (red, X icon)
toast.error({
  title: 'Terjadi kesalahan',
  description: 'Silakan coba lagi',
  duration: 5000, // optional, defaults to 5000
});

// Warning (yellow, alert icon)
toast.warning({
  title: 'Perhatian',
  description: 'Stok hampir habis',
  duration: 4000, // optional, defaults to 4000
});

// Info (blue, info icon)
toast.info({
  title: 'Informasi',
  description: 'Fitur baru tersedia',
  duration: 3000, // optional, defaults to 3000
});

// Loading (blue, spinner, no auto-dismiss)
const loadingToast = toast.loading({
  title: 'Menyimpan...',
  description: 'Mohon tunggu',
});
// Later: loadingToast.dismiss();

// Promise (automatic loading → success/error)
await toast.promise(apiCall(), {
  loading: 'Menyimpan...',
  success: 'Berhasil disimpan',
  error: 'Gagal menyimpan',
});
```

---

## 3. Empty States

### ❌ Old Pattern (Don't Use)
```tsx
<DataTable
  data={items}
  isLoading={isLoading}
  emptyTitle="No data"
  emptyDescription="Add some items."
/>
```

### ✅ New Pattern (Use This)
```tsx
<DataTable
  data={items}
  isLoading={isLoading}
  emptyTitle="Belum ada data"
  emptyDescription="Mulai dengan menambahkan item pertama Anda untuk memulai."
  emptyAction={
    <Button onClick={() => navigate('/create')}>
      <Plus className="mr-2 h-4 w-4" /> Tambah Item Pertama
    </Button>
  }
/>
```

### Custom Empty State (Outside DataTable)
```tsx
import { EmptyState } from '@/components/shared/empty-state';
import { Package } from 'lucide-react';

{items.length === 0 && (
  <EmptyState
    icon={Package}
    title="Belum ada produk"
    description="Mulai dengan menambahkan produk pertama Anda"
    size="lg"  // sm | md | lg
    action={
      <Button onClick={handleCreate}>
        <Plus /> Tambah Produk
      </Button>
    }
  />
)}
```

---

## 4. Form Validation

### ❌ Old Pattern (Don't Use)
```tsx
<div>
  <Label>Nama Produk</Label>
  <Input value={name} onChange={(e) => setName(e.target.value)} />
  {error && <p className="text-red-500">{error}</p>}
</div>
```

### ✅ New Pattern (Use This)
```tsx
import { FormFieldError } from '@/components/shared/form-field-error';

const [touched, setTouched] = useState(false);

<div className="space-y-2">
  <Label htmlFor="name">Nama Produk</Label>
  <Input
    id="name"
    value={name}
    onChange={(e) => setName(e.target.value)}
    onBlur={() => setTouched(true)}
    className={cn(
      error && touched && 'border-destructive focus-visible:ring-destructive'
    )}
    aria-invalid={error && touched ? 'true' : 'false'}
  />
  <FormFieldError error={error} touched={touched} />
</div>
```

### Alternative: FormField Wrapper
```tsx
import { FormField } from '@/components/shared/form-field-error';

const [touched, setTouched] = useState(false);

<FormField
  label="Nama Produk"
  value={name}
  onChange={(e) => setName(e.target.value)}
  onBlur={() => setTouched(true)}
  error={error}
  touched={touched}
  placeholder="Masukkan nama produk"
/>
```

---

## 5. Mutations & Optimistic Updates

### Basic Pattern
```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast-utils';

const queryClient = useQueryClient();

const deleteMutation = useMutation({
  mutationFn: (id: string) => api.delete(id),
  onSuccess: (_, deletedId) => {
    queryClient.invalidateQueries({ queryKey: ['items'] });
    toast.success({
      title: 'Item berhasil dihapus',
      description: 'Item telah dihapus dari daftar',
    });
  },
  onError: (error: AxiosError<ApiErrorResponse>) => {
    toast.error({
      title: 'Gagal menghapus item',
      description: error.response?.data?.message || 'Terjadi kesalahan',
    });
  },
});
```

### With Promise Toast (Simplest)
```tsx
const handleDelete = async (id: string) => {
  await toast.promise(
    api.delete(id),
    {
      loading: 'Menghapus...',
      success: 'Item berhasil dihapus',
      error: 'Gagal menghapus item',
    }
  );
  queryClient.invalidateQueries({ queryKey: ['items'] });
};
```

---

## 6. Confirm Dialogs

### ❌ Old Pattern (Plain)
```tsx
<ConfirmDialog
  open={!!deleteTarget}
  onOpenChange={(open) => !open && setDeleteTarget(null)}
  title="Delete Item"
  description="Are you sure?"
  onConfirm={handleDelete}
/>
```

### ✅ New Pattern (Enhanced)
```tsx
<ConfirmDialog
  open={!!deleteTarget}
  onOpenChange={(open) => !open && setDeleteTarget(null)}
  title="Hapus Produk"
  description={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
  confirmLabel="Hapus"
  cancelLabel="Batal"
  variant="destructive"  // Shows warning icon
  onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
  isLoading={deleteMutation.isPending}
/>
```

**Note:** Destructive variant automatically shows warning icon with zoom-in animation.

---

## 7. Hover Effects

### Cards
```tsx
// Before
<Card>
  <CardContent>{/* ... */}</CardContent>
</Card>

// After (automatic, Card component updated)
// Just use <Card> normally - hover effects are built-in
```

### Metric Cards with Icon Animation
```tsx
// Automatic in MetricCard component
<MetricCard
  title="Total Sales"
  value={formatCurrency(sales)}
  icon={DollarSign}
/>
// Icon and background scale on hover automatically
```

### Custom Hover Effects
```tsx
// For custom components
<div className="group cursor-pointer transition-all duration-200 hover:shadow-lg">
  <div className="transition-transform duration-200 group-hover:scale-105">
    {/* Content that scales on parent hover */}
  </div>
</div>
```

---

## 8. Button States

### Standard Button (Enhanced Automatically)
```tsx
// Just use Button normally - all effects are built-in
<Button onClick={handleClick}>
  Click Me
</Button>
// Has: hover shadow, active scale-down, focus ring
```

### Button with Loading State
```tsx
<Button onClick={handleSubmit} disabled={isPending}>
  {isPending && <Loader2 className="animate-spin" />}
  {isPending ? 'Menyimpan...' : 'Simpan'}
</Button>
```

### Button with Ripple (Optional Enhancement)
```tsx
import { ButtonWithRipple } from '@/components/shared/button-with-ripple';

<ButtonWithRipple onClick={handleClick}>
  Click Me
</ButtonWithRipple>
// Has: all standard button effects + ripple on click
```

---

## 9. Loading Overlays

### Full Page Loading
```tsx
import { LoadingOverlay } from '@/components/shared/loading-spinner-enhanced';

{isGlobalLoading && <LoadingOverlay text="Memuat data..." />}
```

### Inline Loading
```tsx
import { LoadingSpinnerEnhanced } from '@/components/shared/loading-spinner-enhanced';

{isLoading && (
  <LoadingSpinnerEnhanced
    size="md"  // sm | md | lg
    text="Memuat..."
  />
)}
```

---

## 10. Page Structure Template

### Complete Example
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast-utils';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Item } from '@/types';

export function MyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);

  // Fetch data
  const { data: items, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: api.list,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success({
        title: 'Item berhasil dihapus',
        description: `"${deleteTarget?.name}" telah dihapus`,
      });
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error({
        title: 'Gagal menghapus item',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  // Table columns
  const columns: Column<Item>[] = [
    {
      key: 'name',
      header: 'Nama',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/items/${row.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteTarget(row)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <PageHeader title="Items" description="Kelola item Anda">
        <Button onClick={() => navigate('/items/new')}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Item
        </Button>
      </PageHeader>

      {/* Table with loading & empty states */}
      <DataTable
        columns={columns}
        data={items ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari item..."
        emptyTitle="Belum ada item"
        emptyDescription="Mulai dengan menambahkan item pertama Anda."
        emptyAction={
          <Button onClick={() => navigate('/items/new')}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Item Pertama
          </Button>
        }
      />

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Item"
        description={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"?`}
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
```

---

## Common Mistakes to Avoid

### 1. ❌ Using old toast pattern
```tsx
const { toast } = useToast();  // Old way
```
```tsx
import { toast } from '@/lib/toast-utils';  // New way
```

### 2. ❌ Showing errors before field is touched
```tsx
{error && <FormFieldError error={error} />}  // Always shows
```
```tsx
<FormFieldError error={error} touched={touched} />  // Only when touched
```

### 3. ❌ Generic loading spinners
```tsx
{isLoading && <Loader2 className="animate-spin" />}  // Generic
```
```tsx
{isLoading ? <MetricCardsSkeleton /> : <MetricCard />}  // Content-aware
```

### 4. ❌ Empty states without actions
```tsx
emptyTitle="No data"
emptyDescription="Add some items."
// Missing emptyAction prop!
```
```tsx
emptyTitle="Belum ada data"
emptyDescription="Mulai dengan menambahkan item pertama."
emptyAction={<Button>Tambah Item</Button>}  // Action provided
```

### 5. ❌ Not invalidating queries after mutations
```tsx
const deleteMutation = useMutation({
  mutationFn: api.delete,
  onSuccess: () => {
    toast.success({ title: 'Deleted' });
    // Missing: queryClient.invalidateQueries()
  },
});
```
```tsx
const deleteMutation = useMutation({
  mutationFn: api.delete,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['items'] });  // Refresh list
    toast.success({ title: 'Deleted' });
  },
});
```

---

## TypeScript Tips

### Toast Error Handling
```tsx
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

onError: (error: AxiosError<ApiErrorResponse>) => {
  toast.error({
    title: 'Error',
    description: error.response?.data?.message || 'Something went wrong',
  });
}
```

### Skeleton Components (Type-Safe)
```tsx
// All skeleton components accept count prop
<MetricCardsSkeleton count={4} />  // ✅
<MetricCardsSkeleton count="4" />  // ❌ TypeScript error
```

### Empty State Actions
```tsx
// emptyAction accepts ReactNode
emptyAction={
  <>
    <Button>Primary Action</Button>
    <Button variant="outline">Secondary</Button>
  </>
}
```

---

## Testing Guidelines

### 1. Test Loading States
```tsx
it('shows skeleton while loading', () => {
  render(<MyPage />);
  expect(screen.getByTestId('metric-skeleton')).toBeInTheDocument();
});
```

### 2. Test Empty States
```tsx
it('shows empty state with action button', () => {
  render(<MyPage />);
  expect(screen.getByText('Belum ada data')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /tambah/i })).toBeInTheDocument();
});
```

### 3. Test Toast Notifications
```tsx
it('shows success toast on create', async () => {
  render(<MyPage />);
  fireEvent.click(screen.getByRole('button', { name: /tambah/i }));
  await waitFor(() => {
    expect(screen.getByText('berhasil')).toBeInTheDocument();
  });
});
```

---

## Performance Checklist

- [ ] Skeleton components load instantly (no API calls)
- [ ] Staggered animations don't cause jank (50ms delay max)
- [ ] Transitions use GPU-accelerated properties (transform, opacity)
- [ ] Toast notifications auto-dismiss (don't pile up)
- [ ] Large lists use virtualization (not affected by Phase 4)
- [ ] Images lazy load (existing implementation)

---

## Accessibility Checklist

- [ ] All buttons have focus states (built-in)
- [ ] Error messages have role="alert" (FormFieldError)
- [ ] Loading states have aria-busy (when applicable)
- [ ] Invalid fields have aria-invalid (form validation)
- [ ] Confirm dialogs are keyboard navigable
- [ ] Toast notifications are announced to screen readers

---

## Browser Support

All Phase 4 features work in:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Android)

No polyfills required.

---

## Questions & Support

If you encounter issues:

1. Check this migration guide
2. Review PHASE4_IMPROVEMENTS_SUMMARY.md
3. See PHASE4_VISUAL_EXAMPLES.md for examples
4. Check existing implementations in:
   - `/features/products/products-page.tsx`
   - `/features/orders/orders-page.tsx`
   - `/features/customers/customers-page.tsx`

---

## Summary

**Remember the 3 key changes:**

1. **Loading:** Use skeleton components instead of spinners
2. **Toasts:** Use `toast.success()` / `toast.error()` with descriptions
3. **Empty States:** Add `emptyAction` prop with CTA button

Everything else (hover effects, transitions, animations) is handled automatically by the updated UI components.

Happy coding! 🚀
# Phase 4: Visual Examples & Before/After Comparisons

## 1. Loading States

### Before
```tsx
// Generic spinner everywhere
{isLoading ? (
  <div>Loading...</div>
) : (
  <MetricCard {...data} />
)}
```

### After
```tsx
// Content-aware skeleton matching actual component
{isLoading ? (
  <MetricCardsSkeleton count={4} />
) : (
  <MetricCard {...data} />
)}
```

**Result:**
- Users see placeholder content in the same shape/size as real data
- Smooth transition from skeleton → data
- Staggered animations prevent visual overload

---

## 2. Toast Notifications

### Before
```tsx
toast({ title: 'Produk dihapus' });

toast({
  variant: 'destructive',
  title: 'Gagal menghapus',
  description: error.message
});
```

### After
```tsx
toast.success({
  title: 'Produk berhasil dihapus',
  description: `"${product.name}" telah dihapus dari daftar produk`,
});

toast.error({
  title: 'Gagal menghapus produk',
  description: error.response?.data?.message || 'Terjadi kesalahan',
});
```

**Result:**
- ✅ Green checkmark icon for success
- ❌ Red X icon for errors
- ⚠️ Yellow alert icon for warnings
- ℹ️ Blue info icon for information
- Context-rich messages with entity names
- Consistent color coding (green/red/yellow/blue borders)

---

## 3. Empty States

### Before
```tsx
<DataTable
  data={[]}
  emptyTitle="Belum ada produk"
  emptyDescription="Tambahkan produk pertama Anda."
/>
```
*Simple text, no visual hierarchy, no action*

### After
```tsx
<DataTable
  data={[]}
  emptyTitle="Belum ada produk"
  emptyDescription="Mulai dengan menambahkan produk pertama Anda untuk mulai berjualan."
  emptyAction={
    <Button onClick={() => navigate('/app/products/new')}>
      <Plus className="mr-2 h-4 w-4" /> Tambah Produk Pertama
    </Button>
  }
/>
```

**Result:**
- 📦 Large icon with glowing background
- Clear hierarchy (title → description → action)
- Actionable CTA button
- Fade-in + slide-up animations
- Helpful, contextual descriptions

---

## 4. Button Interactions

### Before
```tsx
// Basic Tailwind classes
className="... transition-colors ..."
```

### After
```tsx
// Enhanced with multiple effects
className="... transition-all duration-200 active:scale-95 hover:shadow ..."
```

**Result:**
- Hover: Shadow lift + background darken
- Active: Scale down (95%) for tactile feedback
- Focus: Visible ring (accessibility)
- All transitions smooth (200ms)

**Visual Effects:**
```
Normal → Hover → Active
  🔲      🔳↑      🔲↓
 (still) (lift)  (press)
```

---

## 5. Input Focus States

### Before
```tsx
// Standard focus ring only
focus-visible:ring-2
```

### After
```tsx
// Ring + border color change
transition-all duration-200
focus-visible:ring-2
focus-visible:border-ring
```

**Result:**
- Border changes color on focus (blue)
- Focus ring appears smoothly
- Smooth transition in/out
- Better visual feedback

---

## 6. Confirm Dialogs

### Before
```tsx
<DialogContent>
  <DialogHeader>
    <DialogTitle>Hapus Produk</DialogTitle>
    <DialogDescription>Apakah Anda yakin?</DialogDescription>
  </DialogHeader>
  <DialogFooter>
    <Button variant="outline">Batal</Button>
    <Button variant="destructive">Hapus</Button>
  </DialogFooter>
</DialogContent>
```

### After
```tsx
<DialogContent className="sm:max-w-md">
  {/* Warning icon with animation */}
  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 animate-in zoom-in-50">
    <AlertTriangle className="h-6 w-6 text-destructive" />
  </div>

  <DialogHeader>
    <DialogTitle className="text-center">Hapus Produk</DialogTitle>
    <DialogDescription className="text-center">
      Apakah Anda yakin ingin menghapus "Nasi Goreng"?
      Tindakan ini tidak dapat dibatalkan.
    </DialogDescription>
  </DialogHeader>

  <DialogFooter className="sm:justify-center gap-2">
    <Button variant="outline" className="min-w-[100px]">Batal</Button>
    <Button variant="destructive" className="min-w-[100px]">Hapus</Button>
  </DialogFooter>
</DialogContent>
```

**Result:**
- ⚠️ Large warning icon (zoom-in animation)
- Centered, balanced layout
- Entity name in description
- Consistent button widths
- Better visual hierarchy

---

## 7. Card Hover Effects

### Before
```tsx
<Card>
  <CardContent className="p-6">
    {/* content */}
  </CardContent>
</Card>
```
*Static, no hover feedback*

### After
```tsx
<Card className="group cursor-default">
  <CardContent className="flex items-center gap-4 p-6">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-all duration-200 group-hover:bg-primary/20 group-hover:scale-110">
      <Icon className="h-6 w-6 text-primary transition-transform duration-200 group-hover:scale-110" />
    </div>
    {/* content */}
  </CardContent>
</Card>
```

**Result:**
- Card lifts slightly on hover (shadow increase)
- Icon background brightens
- Icon scales up (110%)
- Smooth transitions (200ms)
- Feels interactive and responsive

---

## 8. Tabs Transition

### Before
```tsx
<TabsContent value="tab1">
  {/* content appears instantly */}
</TabsContent>
```

### After
```tsx
<TabsContent value="tab1" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-2 duration-200">
  {/* content fades in + slides up */}
</TabsContent>
```

**Result:**
- Content fades in (opacity 0 → 1)
- Slides up slightly (8px)
- Smooth 200ms transition
- Feels less jarring when switching tabs

---

## 9. Skeleton to Content Transition

### Visual Flow

```
┌─────────────────────┐
│ ┌──┐  ▄▄▄▄▄▄▄▄     │  ← Skeleton (gray boxes)
│ │  │  ▄▄▄▄▄        │
│ └──┘               │
└─────────────────────┘
         ↓ (fade transition)
┌─────────────────────┐
│ ┌──┐  Total Sales   │  ← Real content
│ │💰│  Rp 1,234,000 │
│ └──┘               │
└─────────────────────┘
```

**Before:** Instant appearance (jarring)
**After:** Smooth fade transition (pleasant)

---

## 10. Form Validation Feedback

### Before
```tsx
<Input
  value={name}
  onChange={(e) => setName(e.target.value)}
/>
{error && <p className="text-red-500">{error}</p>}
```
*Errors shown immediately, even when typing*

### After
```tsx
<Input
  value={name}
  onChange={(e) => setName(e.target.value)}
  onBlur={() => setTouched(true)}
  className={error && touched ? 'border-destructive' : ''}
/>
<FormFieldError error={error} touched={touched} />
```

**Result:**
- No error until field is blurred (touched)
- Red border on invalid + touched fields
- Alert icon + message slide in
- Better UX (not annoying while typing)

---

## Animation Timing Cheat Sheet

| Element | Duration | Purpose |
|---------|----------|---------|
| Hover effects | 200ms | Fast feedback |
| Focus states | 200ms | Immediate response |
| Tab content | 200ms | Quick transition |
| Modal open/close | 300ms | Smooth enter/exit |
| Empty state | 500ms | Graceful appearance |
| Skeleton → data | 300ms | Smooth content swap |
| Ripple effect | 600ms | Visual flourish |
| Pulse (subtle) | 2s | Background effect |

---

## Color Coding System

### Toast Types
| Type | Border | Background | Icon | Use Case |
|------|--------|------------|------|----------|
| Success | Green | Green-50 | ✓ | Create, update, delete success |
| Error | Red | Red (destructive) | ✗ | API errors, validation fails |
| Warning | Yellow | Yellow-50 | ⚠ | Deprecation, quota warnings |
| Info | Blue | Blue-50 | ℹ | Tips, information |
| Loading | Blue | Blue-50 | ⟳ | Async operations |

---

## Accessibility Highlights

### Keyboard Navigation
- All buttons/links keyboard accessible
- Focus rings visible (ring-2 + ring-offset-2)
- No hover-only interactions
- Skip links preserved

### Screen Readers
```tsx
// Before
<Button onClick={handleDelete}>Delete</Button>

// After
<Button
  onClick={handleDelete}
  aria-label={isLoading ? 'Deleting...' : 'Delete product'}
  aria-busy={isLoading}
>
  {isLoading && <Loader2 className="animate-spin" />}
  Delete
</Button>
```

### ARIA Attributes
- `role="alert"` on error messages
- `aria-invalid="true"` on invalid inputs
- `aria-busy="true"` during loading
- `aria-label` for context

---

## Mobile Considerations

All animations work smoothly on mobile:

1. **Touch Events**
   - Active states trigger on touch
   - No hover-only features
   - Proper tap targets (44x44px minimum)

2. **Performance**
   - GPU-accelerated transitions
   - No heavy JavaScript animations
   - Staggered animations prevent jank

3. **Reduced Motion**
   - All animations respect `prefers-reduced-motion`
   - Can be disabled via Tailwind config if needed

---

## Testing Scenarios

### 1. Load Dashboard
- ✅ See metric card skeletons (4)
- ✅ See chart skeleton
- ✅ Smooth fade to real data
- ✅ No layout shift

### 2. Create Product
- ✅ Fill form
- ✅ Submit
- ✅ See loading state in button
- ✅ Success toast with product name
- ✅ Navigate to list

### 3. Delete Product
- ✅ Click delete
- ✅ Confirm dialog with warning icon
- ✅ Loading state in button
- ✅ Success toast
- ✅ Product removed from list

### 4. View Empty State
- ✅ Navigate to empty page
- ✅ See icon with glow
- ✅ Read helpful description
- ✅ Click action button
- ✅ Navigate to create form

### 5. Form Validation
- ✅ Type in field
- ✅ No error shown
- ✅ Tab out (blur)
- ✅ Error slides in if invalid
- ✅ Fix error
- ✅ Error disappears

---

## Code Quality Improvements

### Before (Inconsistent)
```tsx
// Different toast patterns everywhere
toast({ title: 'Success' });
toast({ title: 'Error', variant: 'destructive' });
toast({ description: 'Something happened' });
```

### After (Consistent)
```tsx
// Standard pattern across codebase
toast.success({ title: 'Success', description: 'Details here' });
toast.error({ title: 'Error', description: 'What went wrong' });
toast.warning({ title: 'Warning', description: 'Be careful' });
```

---

## Bundle Impact

Total additions:
- 6 new component files (~8KB)
- 1 utility file (~2KB)
- Modified 18 existing files (minimal size change)

**Estimated total impact:** ~10KB raw, ~3-5KB gzipped

Trade-off: Worth it for significantly improved UX.

---

## Browser DevTools Tips

### Check animations:
1. Open Chrome DevTools
2. Animations panel
3. Slow down animations (25% speed)
4. Verify smooth transitions

### Check performance:
1. Performance panel
2. Record interaction
3. Verify no jank (60 FPS)
4. Check paint times

### Check accessibility:
1. Lighthouse audit
2. Accessibility score
3. ARIA validation
4. Keyboard navigation test

---

## Conclusion

Phase 4 transforms TiloPOS from functional to delightful:

**Before:** ❌ Generic spinners, plain toasts, no hover effects
**After:** ✅ Content-aware skeletons, rich toasts, smooth animations

The improvements are subtle but impactful - users will feel the difference even if they can't articulate exactly what changed. The app now feels more professional, responsive, and polished.
