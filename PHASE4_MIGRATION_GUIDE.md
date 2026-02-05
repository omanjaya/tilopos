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
