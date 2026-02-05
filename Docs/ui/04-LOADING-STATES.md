# Loading States & Skeleton Patterns - TiloPOS

## Overview

Dokumentasi lengkap tentang loading states, skeleton loading, empty states, dan error handling di TiloPOS. Gunakan pattern ini untuk **konsistensi UX** di seluruh aplikasi.

**Last Updated**: 2026-02-05
**Consistency Score**: 7.5/10 (Mostly consistent, some improvements needed)

---

## Table of Contents

1. [Loading Indicators](#loading-indicators)
2. [Skeleton Components](#skeleton-components)
3. [Empty States](#empty-states)
4. [Error States](#error-states)
5. [Button Loading States](#button-loading-states)
6. [Optimistic Updates](#optimistic-updates)
7. [Best Practices](#best-practices)
8. [Common Patterns by Page Type](#common-patterns-by-page-type)

---

## Loading Indicators

### Pattern A: DataTable Loading (Recommended for List Pages)

**Use for:** Products, Customers, Employees, Orders, Inventory, etc.

```tsx
<DataTable
  columns={columns}
  data={data ?? []}
  isLoading={isLoading}
  searchPlaceholder="Search..."
  emptyTitle="No items yet"
  emptyDescription="Add your first item."
/>
```

**How it works internally:**
```tsx
// Inside DataTable component
{isLoading ? (
  <TableBody>
    {Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        {columns.map((col) => (
          <TableCell key={col.key}>
            <Skeleton className="h-5 w-full" />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </TableBody>
) : (
  <TableBody>
    {data.map((row) => <TableRow key={row.id}>...</TableRow>)}
  </TableBody>
)}
```

**Why use this?**
- ✅ Consistent 5-row skeleton across all list pages
- ✅ Maintains table structure during loading
- ✅ Automatic empty state handling
- ✅ Built-in search functionality

**Pages using this pattern:** Products, Customers, Employees, Orders, Inventory Stock, Transfers, Purchase Orders, Devices, Outlets, Transactions

---

### Pattern B: Dashboard Metric Cards Loading

**Use for:** Dashboard metrics, report summary cards

#### ❌ **CURRENT IMPLEMENTATION (Duplicated)**

```tsx
// BAD - Duplicated in 5 files (dashboard, reports)
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {isLoading ? (
    Array.from({ length: 4 }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    ))
  ) : (
    metrics.map((metric) => <MetricCard key={metric.id} {...metric} />)
  )}
</div>
```

**Files with duplication:**
- `features/dashboard/dashboard-page.tsx` (lines 63-70)
- `features/reports/components/sales-report.tsx` (lines 101-108)
- `features/reports/components/financial-report.tsx` (lines 81-88)
- `features/reports/components/product-report.tsx` (lines 127-132)
- `features/reports/components/payment-report.tsx` (lines 135-140)

#### ✅ **RECOMMENDED SOLUTION**

Create reusable component:

```tsx
// components/shared/card-skeleton.tsx
interface CardSkeletonProps {
  count?: number;
  gridCols?: string;
}

export function CardSkeleton({
  count = 4,
  gridCols = "md:grid-cols-2 lg:grid-cols-4"
}: CardSkeletonProps) {
  return (
    <div className={`grid gap-4 ${gridCols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Usage:**
```tsx
{isLoading ? (
  <CardSkeleton count={4} />
) : (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {metrics.map((metric) => <MetricCard key={metric.id} {...metric} />)}
  </div>
)}
```

---

### Pattern C: Chart Loading

**Use for:** Dashboard charts, report charts

```tsx
{isLoading ? (
  <Skeleton className="h-[400px] w-full" />
) : (
  <ResponsiveContainer width="100%" height={400}>
    <BarChart data={data}>
      {/* Chart content */}
    </BarChart>
  </ResponsiveContainer>
)}
```

**Consistency:** ✅ Used consistently across all report pages

**Standard heights:**
- Dashboard charts: `h-[300px]`
- Report charts: `h-[400px]`

---

### Pattern D: Full Page Loading (POS Product Grid)

**Use for:** Complex layouts with multiple sections

```tsx
if (isLoading) {
  return (
    <div className="flex h-full flex-col">
      {/* Search skeleton */}
      <div className="p-4 border-b">
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Category tabs skeleton */}
      <div className="flex gap-2 p-4 border-b overflow-x-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0" />
        ))}
      </div>

      {/* Product grid skeleton */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

return <ActualContent />;
```

**When to use:**
- Custom layouts (not table-based)
- Multiple distinct sections (search, tabs, grid)
- Needs to mirror actual layout structure

**Example:** POS product grid (`features/pos/components/product-grid.tsx`)

---

## Skeleton Components

### Base Skeleton Component

**Location:** `components/ui/skeleton.tsx`

```tsx
import { Skeleton } from '@/components/ui/skeleton';

// Basic usage
<Skeleton className="h-4 w-full" />
<Skeleton className="h-10 w-32 rounded-full" />
```

**Props:**
- `className` - Tailwind classes for size, shape, etc.
- Default: `animate-pulse rounded-md bg-muted`

---

### Loading Skeleton Component

**Location:** `components/shared/loading-skeleton.tsx`

```tsx
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';

// Multi-row skeleton
<LoadingSkeleton rows={5} />
<LoadingSkeleton rows={3} className="max-w-md" />
```

**When to use:**
- Quick multi-row skeleton needs
- Simple vertical lists

**Current status:** ⚠️ Underutilized - could be used more widely

---

### Standard Skeleton Sizes

| Element | Size Class | Use Case |
|---------|-----------|----------|
| **Table Row** | `h-5 w-full` | Individual table cells |
| **Card Content** | `h-20 w-full` | Metric card placeholder |
| **Chart** | `h-[300px\|400px] w-full` | Chart placeholders |
| **Input** | `h-10 w-full` | Form input skeleton |
| **Button** | `h-10 w-24` | Button placeholder |
| **Avatar** | `h-10 w-10 rounded-full` | User avatar |
| **Category Tab** | `h-8 w-24 shrink-0` | Horizontal tabs |
| **Product Card** | `h-40 rounded-lg` | Product grid card |
| **Image** | `aspect-square` or `aspect-video` | Image placeholders |

---

## Empty States

### Generic Empty State

**Component:** `components/shared/empty-state.tsx`

```tsx
import { EmptyState } from '@/components/shared/empty-state';

<EmptyState
  icon={Package}  // Lucide icon
  title="Belum ada produk"
  description="Tambahkan produk pertama Anda untuk memulai."
  action={
    <Button onClick={() => navigate('/app/products/new')}>
      <Plus className="mr-2 h-4 w-4" />
      Tambah Produk
    </Button>
  }
/>
```

**Props:**
- `icon` - Lucide icon component (default: `Inbox`)
- `title` - Main heading (required)
- `description` - Supporting text (optional)
- `action` - Call-to-action button (optional)

**Use cases:**
- Empty list/table states
- No search results
- No data available

---

### Report Empty State

**Component:** `components/shared/report-empty-state.tsx`

```tsx
import { ReportEmptyState } from '@/components/shared/report-empty-state';

<ReportEmptyState
  title="Belum ada penjualan"
  description="Belum ada transaksi penjualan untuk periode ini."
  onChangeDateRange={() => setShowDatePicker(true)}
/>
```

**Props:**
- `title` - Main heading
- `description` - Supporting text
- `onChangeDateRange` - Callback to open date picker

**Use cases:**
- Report pages with no data for selected date range
- Encourages user to change filters

**Pages using this:** Sales Report, Financial Report, Product Report, Payment Report

---

### DataTable Built-in Empty State

**Automatic in DataTable component:**

```tsx
<DataTable
  columns={columns}
  data={[]}  // Empty array
  emptyTitle="No products found"
  emptyDescription="Try adjusting your search or filters."
/>
```

**Renders:**
```tsx
<EmptyState
  icon={Search}
  title={emptyTitle}
  description={emptyDescription}
/>
```

---

## Error States

### Report Error State

**Component:** `components/shared/report-error-state.tsx`

```tsx
import { ReportErrorState } from '@/components/shared/report-error-state';

{hasError && (
  <ReportErrorState
    title="Gagal memuat laporan penjualan"
    description="Terjadi kesalahan saat mengambil data."
    error={salesError as Error}
    onRetry={() => {
      refetchSales();
      refetchCustomers();
    }}
  />
)}
```

**Props:**
- `title` - Error heading
- `description` - Error explanation
- `error` - Error object (for logging)
- `onRetry` - Retry callback

**Features:**
- Shows error icon (AlertCircle)
- Displays retry button
- Logs error to console

**Pages using this:** All report pages (sales, financial, product, payment)

---

### ❌ **MISSING: List Page Error States**

**Current implementation:**
```tsx
// List pages only show toast errors
const { data, isLoading, error } = useQuery(...);

const deleteMutation = useMutation({
  onError: (error) => {
    toast({
      variant: 'destructive',
      title: 'Gagal menghapus',
      description: error.response?.data?.message || 'Terjadi kesalahan',
    });
  },
});
```

**Problem:** No visual error state when initial data fetch fails

**Recommended solution:**

```tsx
// Add error state UI
{error && !isLoading && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Gagal memuat data</AlertTitle>
    <AlertDescription>
      {error.message || 'Terjadi kesalahan saat mengambil data.'}
      <Button variant="link" onClick={() => refetch()} className="ml-2">
        Coba lagi
      </Button>
    </AlertDescription>
  </Alert>
)}
```

**Or create reusable component:**
```tsx
// components/shared/list-error-state.tsx
<ListErrorState
  title="Gagal memuat produk"
  error={error}
  onRetry={refetch}
/>
```

---

## Button Loading States

### Mutation Loading Pattern

**Standard pattern for all submit buttons:**

```tsx
const mutation = useMutation({
  mutationFn: (data) => api.create(data),
  onSuccess: () => {
    toast({ title: 'Berhasil disimpan' });
  },
});

<Button
  onClick={() => mutation.mutate(formData)}
  disabled={mutation.isPending}
>
  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Simpan
</Button>
```

**Why:**
- ✅ Prevents double-submission
- ✅ Visual feedback during API call
- ✅ Accessible (disabled state)

**Consistency:** 9/10 - Used across all mutation operations

---

### Form Submit Button

```tsx
import { Loader2 } from 'lucide-react';

<Button type="submit" disabled={isPending || !isValid}>
  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isPending ? 'Menyimpan...' : 'Simpan'}
</Button>
```

---

### Delete Button with Confirmation

```tsx
const deleteMutation = useMutation(...);

<Button
  variant="destructive"
  onClick={() => setDeleteTarget(item)}
  disabled={deleteMutation.isPending}
>
  {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  <Trash2 className="mr-2 h-4 w-4" />
  Hapus
</Button>

<ConfirmDialog
  open={deleteTarget !== null}
  onOpenChange={() => setDeleteTarget(null)}
  title="Hapus item?"
  onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
  isPending={deleteMutation.isPending}
/>
```

---

## Optimistic Updates

### Pattern: Immediate UI Update

**Use for:** Like/unlike, increment/decrement, toggle states

```tsx
const likeMutation = useMutation({
  mutationFn: (id: string) => api.like(id),

  // Optimistic update
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['items'] });

    const previous = queryClient.getQueryData(['items']);

    queryClient.setQueryData(['items'], (old) =>
      old.map((item) =>
        item.id === id ? { ...item, liked: true, likes: item.likes + 1 } : item
      )
    );

    return { previous };
  },

  // Rollback on error
  onError: (err, variables, context) => {
    queryClient.setQueryData(['items'], context.previous);
    toast({ variant: 'destructive', title: 'Gagal menyukai item' });
  },

  // Refetch on success (optional)
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['items'] });
  },
});
```

**When to use:**
- Actions that should feel instant (like, favorite, toggle)
- High confidence of success
- Easy to rollback

**When NOT to use:**
- Create/delete operations
- Critical data changes
- Complex validation

---

## Best Practices

### ✅ **DO:**

1. **Use DataTable for list pages**
   - Consistent loading/empty/error states
   - Less boilerplate

2. **Show skeleton structure that mirrors actual content**
   - Good: Skeleton with same grid/layout as loaded state
   - Bad: Generic spinner that doesn't match layout

3. **Provide retry options for errors**
   - Always include "Retry" or "Coba lagi" button
   - Allow users to recover from errors

4. **Disable buttons during mutations**
   - Prevents double-submission
   - Shows loading spinner

5. **Show loading states immediately**
   - Don't delay showing skeletons
   - Users perceive faster load times

6. **Use consistent skeleton sizes**
   - Follow standard sizes table above
   - Maintains visual consistency

---

### ❌ **DON'T:**

1. **Don't use generic spinners for table loading**
   - Bad: `{isLoading && <Spinner />}`
   - Good: Table skeleton with 5 rows

2. **Don't duplicate skeleton code**
   - Bad: Copy-paste skeleton grid in every file
   - Good: Extract to reusable component

3. **Don't ignore error states**
   - Bad: Only show toast, no visual error UI
   - Good: Show error message with retry option

4. **Don't show "Loading..." text alone**
   - Bad: `{isLoading && <p>Loading...</p>}`
   - Good: Skeleton with proper layout

5. **Don't use different skeleton patterns for similar pages**
   - Bad: Products uses 5 rows, Customers uses 10 rows
   - Good: Consistent 5-row skeleton

---

## Common Patterns by Page Type

### List/Table Pages (Products, Customers, Orders, etc.)

```tsx
export function ProductsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
  });

  // Error state (RECOMMENDED - currently missing in most pages)
  if (error && !isLoading) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Gagal memuat data</AlertTitle>
        <AlertDescription>
          {error.message}
          <Button variant="link" onClick={() => refetch()}>Coba lagi</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      isLoading={isLoading}
      emptyTitle="Belum ada produk"
      emptyDescription="Tambahkan produk pertama Anda."
    />
  );
}
```

---

### Dashboard/Report Pages

```tsx
export function DashboardPage() {
  const { data: metrics, isLoading: metricsLoading } = useQuery(...);
  const { data: chartData, isLoading: chartLoading } = useQuery(...);

  return (
    <>
      {/* Metrics */}
      {metricsLoading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => <MetricCard key={metric.id} {...metric} />)}
        </div>
      )}

      {/* Chart */}
      {chartLoading ? (
        <Skeleton className="h-[300px] w-full" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>...</BarChart>
        </ResponsiveContainer>
      )}
    </>
  );
}
```

---

### Form Pages

```tsx
export function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { data: product, isLoading } = useQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.get(id!),
    enabled: isEdit,
  });

  const mutation = useMutation(...);

  if (isEdit && isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingSkeleton rows={5} />
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Simpan
      </Button>
    </form>
  );
}
```

---

### Detail Pages

```tsx
export function OrderDetailPage() {
  const { id } = useParams();
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.get(id!),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <LoadingSkeleton rows={6} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Gagal memuat pesanan</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return <OrderDetailContent order={order} />;
}
```

---

## Migration Guide: Fixing Inconsistencies

### Priority 1: Extract CardSkeleton Component

**Affects:** 5 files (dashboard + 4 reports)

**Before:**
```tsx
// Duplicated in multiple files
{isLoading ? (
  Array.from({ length: 4 }).map((_, i) => (
    <Card key={i}>
      <CardContent className="p-6">
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  ))
) : ...}
```

**After:**
```tsx
// 1. Create components/shared/card-skeleton.tsx
export function CardSkeleton({ count = 4, gridCols = "md:grid-cols-2 lg:grid-cols-4" }) {
  return (
    <div className={`grid gap-4 ${gridCols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// 2. Use in pages
{isLoading ? <CardSkeleton count={4} /> : <ActualContent />}
```

---

### Priority 2: Add Error States to List Pages

**Affects:** Products, Customers, Employees, Orders, Inventory, etc.

**Add before DataTable:**
```tsx
{error && !isLoading && (
  <Alert variant="destructive" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Gagal memuat data</AlertTitle>
    <AlertDescription>
      {error.message || 'Terjadi kesalahan saat mengambil data.'}
      <Button variant="link" onClick={() => refetch()} className="ml-2">
        Coba lagi
      </Button>
    </AlertDescription>
  </Alert>
)}
```

---

## Checklist: Implementing Loading States

When building a new page, ensure:

- [ ] **Loading state shows skeleton (not just spinner)**
- [ ] **Skeleton structure mirrors actual layout**
- [ ] **Empty state has icon, title, description, and action button**
- [ ] **Error state has retry option**
- [ ] **Buttons disable during mutations with loading spinner**
- [ ] **Uses shared components (DataTable, CardSkeleton, EmptyState, etc.)**
- [ ] **Consistent skeleton sizes (follows standards table)**
- [ ] **No duplicate skeleton code (extract to component if reused)**
- [ ] **Works on mobile (responsive skeleton layout)**

---

## Related Documentation

- **[03-SHARED-COMPONENTS.md](./03-SHARED-COMPONENTS.md)** - Component library reference
- **[02-DESIGN-SYSTEM.md](./02-DESIGN-SYSTEM.md)** - Design tokens
- **[05-ACCESSIBILITY.md](./05-ACCESSIBILITY.md)** - Accessible loading states

---

**Questions?** Check DataTable implementation for reference pattern.

**Need new pattern?** Ensure consistency with existing patterns before creating custom solution.

**Found inconsistency?** Fix it and update this document.
