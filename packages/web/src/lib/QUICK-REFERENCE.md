# Phase 5 Utilities - Quick Reference

Quick reference guide for the most commonly used edge case handling utilities.

## 🔢 Number Operations

```tsx
import {
  safeParseNumber,
  safeDivide,
  clamp,
  roundToDecimals,
  safePercentage,
} from '@/lib';

// Parse user input safely
const price = safeParseNumber(input, 0); // Default to 0 if invalid

// Division with zero protection
const average = safeDivide(total, count, 0); // Returns 0 if count is 0

// Enforce bounds
const quantity = clamp(userValue, 1, 999); // Between 1 and 999

// Round decimals
const rounded = roundToDecimals(10.12555, 2); // 10.13

// Safe percentage
const margin = safePercentage(profit, revenue); // "12.5%"
```

## 📊 Array Operations

```tsx
import {
  isEmptyArray,
  sumArray,
  averageArray,
  firstItem,
  lastItem,
} from '@/lib';

// Check if empty (handles null/undefined)
if (isEmptyArray(items)) {
  return <EmptyState />;
}

// Sum array values
const total = sumArray(items, item => item.price); // 0 if empty

// Average with divide-by-zero protection
const avg = averageArray(items, item => item.price); // 0 if empty

// Safe access
const first = firstItem(items); // undefined if empty
const last = lastItem(items); // undefined if empty
```

## 📅 Date Operations

```tsx
import {
  formatDate,
  formatDateTime,
  isValidDate,
  isFutureDate,
  calculatePercentageChange,
} from '@/lib';

// Format dates (returns empty string if invalid)
const formatted = formatDate(dateString); // "15 Jan 2024" or ""
const withTime = formatDateTime(dateString); // "15 Jan 2024, 14:30" or ""

// Validate dates
if (!isValidDate(userInput)) {
  errors.date = 'Tanggal tidak valid';
}

if (isFutureDate(selectedDate)) {
  errors.date = 'Tanggal tidak boleh di masa depan';
}

// Safe percentage change
const change = calculatePercentageChange(current, previous); // Handles null, 0, NaN
```

## 💰 Formatting

```tsx
import { formatCurrency, formatNumber, formatPercentage } from '@/lib';

// Currency (handles null/undefined/NaN)
const price = formatCurrency(value); // "Rp 15.000" or "Rp 0"

// Number with separators
const qty = formatNumber(1234567); // "1.234.567"

// Percentage
const rate = formatPercentage(12.5); // "12,5%"
```

## 🔤 String Sanitization

```tsx
import {
  sanitizeText,
  trimWhitespace,
  isEmpty,
  isValidEmail,
  isValidPhone,
} from '@/lib';

// Remove XSS/SQL patterns
const clean = sanitizeText(userInput);

// Trim whitespace
const name = trimWhitespace(input);

// Check empty (handles "   " as empty)
if (isEmpty(name)) {
  errors.name = 'Nama tidak boleh kosong';
}

// Validate formats
if (!isValidEmail(email)) {
  errors.email = 'Email tidak valid';
}

if (!isValidPhone(phone)) {
  errors.phone = 'Nomor telepon tidak valid';
}
```

## 🎨 UI Components

```tsx
import { NumberInput } from '@/components/ui/number-input';
import { LoadingState } from '@/components/shared/loading-state';
import { OfflineBanner } from '@/components/shared/offline-banner';
import { TrendIndicator } from '@/components/shared/trend-indicator';

// Number input with built-in validation
<NumberInput
  value={price}
  onChange={setPrice}
  min={0}
  max={999999}
  allowDecimal={true}
  maxDecimals={2}
/>

// Loading state
{isLoading && <LoadingState message="Memuat data..." />}

// Offline banner (add to App.tsx)
<OfflineBanner />

// Trend indicator (null-safe)
<TrendIndicator
  current={currentValue}
  previous={previousValue}
  invertColors={false}
/>
```

## 🪝 Hooks

```tsx
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useFocusTrap } from '@/hooks/use-focus-trap';

// Online/offline detection
const isOnline = useOnlineStatus();

// Debounced search
const [search, setSearch] = useState('');
const debouncedSearch = useDebouncedValue(search, 300);

// Focus trap for modals
function Modal({ onClose }) {
  const trapRef = useFocusTrap(true, onClose);
  return <div ref={trapRef}>...</div>;
}
```

## ⚡ TanStack Query Utilities

```tsx
import { setupOptimisticUpdate, invalidateQueries } from '@/lib';

// Optimistic update with auto-rollback
const { onMutate, onError } = setupOptimisticUpdate({
  queryKey: ['products'],
  queryClient,
  updateFn: (oldProducts, newProduct) => [...(oldProducts || []), newProduct],
});

const mutation = useMutation({
  mutationFn: productsApi.create,
  onMutate,
  onError: (error, variables, context) => {
    onError(error, variables, context);
    toast.error('Failed. Changes reverted.');
  },
});

// Invalidate multiple queries
await invalidateQueries(queryClient, [
  ['products'],
  ['categories'],
  ['inventory'],
]);
```

## 🛡️ Error Handling

```tsx
import { handleApiError, handleMutationError } from '@/lib';

// Comprehensive error handler
const mutation = useMutation({
  mutationFn: productsApi.create,
  onError: (error) => {
    toast(handleApiError(error, 'membuat produk'));
  },
});

// Specific mutation error
const mutation = useMutation({
  mutationFn: productsApi.delete,
  onError: (error) => {
    toast(handleMutationError(error, 'Gagal menghapus produk'));
  },
});
```

## 📋 Common Patterns

### Safe Calculation Pattern
```tsx
// ❌ BAD
const average = total / count; // NaN if count = 0
const percentage = (part / whole) * 100; // NaN if whole = 0

// ✅ GOOD
import { safeDivide, safePercentage } from '@/lib';
const average = safeDivide(total, count, 0);
const percentage = safePercentage(part, whole);
```

### Safe Array Pattern
```tsx
// ❌ BAD
const total = items.reduce((sum, item) => sum + item.price, 0); // Crash if items null
const first = items[0]; // Crash if empty

// ✅ GOOD
import { sumArray, firstItem, isEmptyArray } from '@/lib';

if (isEmptyArray(items)) {
  return <EmptyState />;
}

const total = sumArray(items, item => item.price);
const first = firstItem(items);
```

### Safe Number Input Pattern
```tsx
// ❌ BAD
<Input type="number" onChange={e => setPrice(e.target.value)} />

// ✅ GOOD
import { NumberInput } from '@/components/ui/number-input';
<NumberInput
  value={price}
  onChange={setPrice}
  min={0}
  max={999999}
/>
```

### Safe Formatting Pattern
```tsx
// ❌ BAD
const formatted = data.totalSales.toLocaleString(); // Crash if null

// ✅ GOOD
import { formatCurrency } from '@/lib';
const formatted = formatCurrency(data?.totalSales); // Shows "Rp 0" if null
```

### Loading State Pattern
```tsx
// ❌ BAD
return <ProductList products={data} />; // Shows nothing while loading

// ✅ GOOD
import { LoadingState } from '@/components/shared/loading-state';
import { isEmptyArray } from '@/lib';

if (isLoading) return <LoadingState />;
if (isEmptyArray(data)) return <EmptyState />;
return <ProductList products={data} />;
```

### Debounced Search Pattern
```tsx
// ❌ BAD
const { data } = useQuery({
  queryKey: ['products', search],
  queryFn: () => api.search(search), // Fires on every keystroke
});

// ✅ GOOD
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const debouncedSearch = useDebouncedValue(search, 300);
const { data } = useQuery({
  queryKey: ['products', debouncedSearch],
  queryFn: () => api.search(debouncedSearch), // Fires after user stops typing
});
```

## 📚 Full Documentation

- **Complete Guide:** `src/lib/edge-cases.md`
- **Examples:** `src/lib/IMPLEMENTATION-EXAMPLES.md`
- **Summary:** `PHASE5-IMPLEMENTATION-SUMMARY.md`

## 🔗 Import Patterns

```tsx
// Individual imports (tree-shakable)
import { formatCurrency } from '@/lib/format';
import { safeParseNumber } from '@/lib/validation-utils';

// OR centralized import (same tree-shaking)
import { formatCurrency, safeParseNumber } from '@/lib';
```

Both patterns are equivalent and tree-shakable. Use whichever you prefer!
