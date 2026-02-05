# Phase 5 Edge Case Handling - Implementation Examples

This document shows practical before/after examples of how edge case handling improves the TiloPOS codebase.

## Example 1: Dashboard Metrics with Safe Calculations

### Before (Vulnerable to Edge Cases)
```tsx
// dashboard-page.tsx
const { data: salesReport } = useQuery({
  queryKey: ['reports', 'sales', outletId, dateRange],
  queryFn: () => reportsApi.sales({ outletId, dateRange }),
});

// ❌ Issues:
// - NaN if data is null/undefined
// - Division by zero not handled
// - No loading state for metrics
return (
  <MetricCard
    title="Total Penjualan"
    value={formatCurrency(salesReport.totalSales)}
  />
);
```

### After (Edge Case Safe)
```tsx
// dashboard-page.tsx
import { formatCurrency, safeDivide, isEmptyArray } from '@/lib';
import { LoadingState } from '@/components/shared/loading-state';

const { data: salesReport, isLoading } = useQuery({
  queryKey: ['reports', 'sales', outletId, dateRange],
  queryFn: () => reportsApi.sales({ outletId, dateRange }),
  enabled: !!outletId, // Don't fetch if no outlet
});

// ✅ Benefits:
// - Null-safe formatting (shows Rp 0 if null)
// - Loading skeleton during fetch
// - Safe division for average calculation
if (isLoading) {
  return <LoadingState message="Memuat laporan..." />;
}

const averageOrder = safeDivide(
  salesReport?.totalSales ?? 0,
  salesReport?.totalTransactions ?? 0,
  0
);

return (
  <>
    <MetricCard
      title="Total Penjualan"
      value={formatCurrency(salesReport?.totalSales)}
    />
    <MetricCard
      title="Rata-rata Order"
      value={formatCurrency(averageOrder)}
    />
  </>
);
```

## Example 2: Product Form with Enhanced Number Inputs

### Before (Basic Validation)
```tsx
// product-form-page.tsx
const [price, setPrice] = useState('');

// ❌ Issues:
// - Allows 'e', '+', '-' in input
// - No min/max enforcement
// - No decimal precision control
// - Can submit invalid values
return (
  <Input
    type="number"
    value={price}
    onChange={e => setPrice(e.target.value)}
  />
);
```

### After (Robust Validation)
```tsx
// product-form-page.tsx
import { NumberInput } from '@/components/ui/number-input';
import { safeParseNumber, isInRange } from '@/lib';

const [price, setPrice] = useState('');

const handleSubmit = () => {
  const numPrice = safeParseNumber(price, 0);

  // ✅ Validate range
  if (!isInRange(numPrice, 1, 999999999)) {
    toast.error('Harga harus antara Rp 1 dan Rp 999.999.999');
    return;
  }

  // Safe to submit
  mutation.mutate({ price: numPrice });
};

// ✅ Benefits:
// - Prevents invalid keyboard input
// - Enforces decimal precision
// - Auto-clamps to min/max on blur
// - Clean UI/UX
return (
  <NumberInput
    value={price}
    onChange={setPrice}
    min={0}
    max={999999999}
    allowDecimal={true}
    maxDecimals={2}
    placeholder="0"
  />
);
```

## Example 3: Safe Array Operations in Reports

### Before (Runtime Errors)
```tsx
// sales-report.tsx
const topProducts = data.products.slice(0, 5);
const totalRevenue = data.products.reduce((sum, p) => sum + p.revenue, 0);
const avgRevenue = totalRevenue / data.products.length; // ❌ Divide by zero!

// ❌ Issues:
// - Crashes if products is null/undefined
// - Division by zero if array is empty
// - No null handling in reduce
return topProducts.map(p => <ProductCard key={p.id} product={p} />);
```

### After (Safe Operations)
```tsx
// sales-report.tsx
import { isEmptyArray, sumArray, averageArray, firstItem } from '@/lib';

// ✅ Safe array operations
if (isEmptyArray(data?.products)) {
  return <EmptyState message="Belum ada data produk" />;
}

const topProducts = data!.products.slice(0, 5);
const totalRevenue = sumArray(data!.products, p => p.revenue);
const avgRevenue = averageArray(data!.products, p => p.revenue);
const bestProduct = firstItem(topProducts);

// ✅ Benefits:
// - No runtime errors
// - Clean empty state
// - Safe calculations
// - Better UX
return (
  <>
    <MetricCard title="Total Pendapatan" value={formatCurrency(totalRevenue)} />
    <MetricCard title="Rata-rata" value={formatCurrency(avgRevenue)} />
    {topProducts.map(p => <ProductCard key={p.id} product={p} />)}
  </>
);
```

## Example 4: Trend Indicator with Edge Cases

### Before (Crashes on Invalid Data)
```tsx
// metric-card.tsx
const change = currentValue - previousValue;
const percentage = ((change) / previousValue) * 100; // ❌ NaN if previousValue = 0

// ❌ Issues:
// - Division by zero → NaN
// - No null handling
// - Infinite loop if Infinity
return <span>{percentage.toFixed(1)}%</span>;
```

### After (Robust Calculation)
```tsx
// metric-card.tsx
import { TrendIndicator } from '@/components/shared/trend-indicator';

// ✅ All edge cases handled inside component:
// - null/undefined → shows "N/A"
// - division by zero → shows 100% or -100%
// - NaN/Infinity → shows "N/A"
// - Very small changes → shows as flat (0.0%)
return (
  <MetricCard
    title="Total Penjualan"
    value={formatCurrency(current)}
    currentValue={current}
    previousValue={previous}
  />
);

// Component automatically shows:
// - Green ↑ +15.5% for increase
// - Red ↓ -10.2% for decrease
// - Gray - 0.0% for flat
// - Gray - N/A for invalid data
```

## Example 5: Form Input Sanitization

### Before (XSS Vulnerable)
```tsx
// customer-form.tsx
const [notes, setNotes] = useState('');

// ❌ Issues:
// - No sanitization
// - Can contain <script> tags
// - SQL injection patterns
// - Excessive whitespace
return (
  <Textarea
    value={notes}
    onChange={e => setNotes(e.target.value)}
  />
);
```

### After (Sanitized & Validated)
```tsx
// customer-form.tsx
import { trimWhitespace, sanitizeText, isEmpty } from '@/lib';

const [notes, setNotes] = useState('');

const handleSubmit = () => {
  const cleanNotes = sanitizeText(notes);

  if (isEmpty(cleanNotes)) {
    // Optional field, skip if empty
    mutation.mutate({ notes: undefined });
  } else {
    mutation.mutate({ notes: cleanNotes });
  }
};

// ✅ Benefits:
// - Removes script tags
// - Removes SQL patterns
// - Trims whitespace
// - Safe to store and display
return (
  <Textarea
    value={notes}
    onChange={e => setNotes(e.target.value)}
    onBlur={e => setNotes(trimWhitespace(e.target.value))}
    maxLength={500}
  />
);
```

## Example 6: Optimistic Updates with Rollback

### Before (No Optimistic UI)
```tsx
// products-page.tsx
const deleteMutation = useMutation({
  mutationFn: productsApi.delete,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success('Produk dihapus');
  },
  onError: (error) => {
    toast.error('Gagal menghapus produk');
  },
});

// ❌ Issues:
// - UI doesn't update until server responds
// - Feels slow
// - No automatic rollback on error
```

### After (Optimistic with Auto-Rollback)
```tsx
// products-page.tsx
import { setupOptimisticListUpdate } from '@/lib';

const optimistic = setupOptimisticListUpdate<Product>(['products'], queryClient);

const deleteMutation = useMutation({
  mutationFn: productsApi.delete,
  ...optimistic.delete((products, id) => products.filter(p => p.id !== id)),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success('Produk dihapus');
  },
  onError: (error) => {
    // ✅ Automatic rollback already happened
    toast.error('Gagal menghapus. Perubahan dibatalkan.');
  },
});

// ✅ Benefits:
// - Instant UI update
// - Feels fast and responsive
// - Automatic rollback on error
// - Better UX
```

## Example 7: Offline Detection

### Before (No Offline Handling)
```tsx
// App.tsx
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

// ❌ Issues:
// - No indication when offline
// - Failed requests confuse users
// - No prevention of offline actions
```

### After (Offline Awareness)
```tsx
// App.tsx
import { OfflineBanner } from '@/components/shared/offline-banner';
import { useOnlineStatus } from '@/hooks/use-online-status';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OfflineBanner />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

// In components
import { useOnlineStatus } from '@/hooks/use-online-status';

function ProductsPage() {
  const isOnline = useOnlineStatus();

  const { data } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.list,
    enabled: isOnline, // ✅ Don't fetch when offline
  });

  const mutation = useMutation({
    mutationFn: productsApi.create,
    onMutate: () => {
      if (!isOnline) {
        toast.error('Tidak ada koneksi internet');
        throw new Error('Offline');
      }
    },
  });
}

// ✅ Benefits:
// - Clear offline indicator
// - Prevents failed requests
// - Better user communication
// - Graceful degradation
```

## Example 8: Debounced Search

### Before (Fires on Every Keystroke)
```tsx
// products-page.tsx
const [search, setSearch] = useState('');

const { data } = useQuery({
  queryKey: ['products', search],
  queryFn: () => productsApi.search(search),
});

// ❌ Issues:
// - API call on every keystroke
// - Expensive if slow typing
// - Server overload
// - Poor performance
return (
  <Input
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
);
```

### After (Debounced)
```tsx
// products-page.tsx
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const [search, setSearch] = useState('');
const debouncedSearch = useDebouncedValue(search, 300);

const { data } = useQuery({
  queryKey: ['products', debouncedSearch],
  queryFn: () => productsApi.search(debouncedSearch),
  enabled: debouncedSearch.length >= 2, // ✅ Only search with 2+ chars
});

// ✅ Benefits:
// - API call only after user stops typing
// - Reduced server load
// - Better performance
// - Same perceived UX
return (
  <Input
    value={search}
    onChange={e => setSearch(e.target.value)}
    placeholder="Cari produk (min 2 karakter)..."
  />
);
```

## Summary of Improvements

| Area | Before | After | Benefit |
|------|--------|-------|---------|
| **Calculations** | Runtime errors (NaN, Infinity) | Safe with defaults | No crashes |
| **Number Inputs** | Allows invalid input | Prevents at keyboard level | Better UX |
| **Arrays** | Crashes on empty/null | Safe access with defaults | Stable app |
| **Dates** | Invalid Date errors | Validation + formatting | Reliable |
| **Strings** | XSS vulnerable | Sanitized input | Secure |
| **Loading** | Inconsistent states | Uniform skeletons | Professional |
| **Offline** | No detection | Banner + prevention | Clear feedback |
| **Search** | Every keystroke | Debounced | Performance |
| **Mutations** | Slow feedback | Optimistic updates | Fast UX |
| **Trends** | Division by zero | Safe calculation | Robust |

## Migration Checklist

When updating existing components:

1. **Replace number operations**
   - [ ] `value / divisor` → `safeDivide(value, divisor)`
   - [ ] `Number(input)` → `safeParseNumber(input)`
   - [ ] `array.reduce()` → `sumArray()` or `averageArray()`

2. **Replace Input components**
   - [ ] `<Input type="number" />` → `<NumberInput />`

3. **Add loading states**
   - [ ] Add `if (isLoading) return <LoadingState />`

4. **Add empty states**
   - [ ] Add `if (isEmptyArray(data)) return <EmptyState />`

5. **Sanitize text inputs**
   - [ ] Add `onBlur={e => setValue(trimWhitespace(e.target.value))}`

6. **Add debouncing to search**
   - [ ] Wrap search state with `useDebouncedValue()`

7. **Use safe formatters**
   - [ ] Import from `@/lib` instead of `@/lib/format`
   - [ ] They handle null/undefined automatically

8. **Update TrendIndicator**
   - [ ] Pass nullable values (already handled)

9. **Add optimistic updates** (optional, for better UX)
   - [ ] Use `setupOptimisticUpdate()` for mutations

10. **Test edge cases**
    - [ ] Empty/null values
    - [ ] Very large numbers
    - [ ] Division by zero
    - [ ] Invalid dates
    - [ ] Offline state
