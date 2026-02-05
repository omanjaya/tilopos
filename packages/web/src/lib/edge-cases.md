# Edge Case Handling Guide

This document outlines the edge cases handled by TiloPOS utility functions and best practices for developers.

## Numeric Edge Cases

### Division by Zero
```tsx
// ❌ BAD - Can produce NaN or Infinity
const average = total / count;
const percentage = (part / whole) * 100;

// ✅ GOOD - Safe with fallback
import { safeDivide, safePercentage } from '@/lib/validation-utils';
const average = safeDivide(total, count, 0);
const percentage = safePercentage(part, whole);
```

### Null/Undefined Numbers
```tsx
// ❌ BAD - Can produce NaN
const total = price * quantity;
const sum = items.reduce((acc, item) => acc + item.price, 0);

// ✅ GOOD - Safe parsing
import { safeParseNumber } from '@/lib/validation-utils';
const total = safeParseNumber(price) * safeParseNumber(quantity);

// ✅ GOOD - Safe array sum
import { sumArray } from '@/lib/array-utils';
const sum = sumArray(items, item => item.price);
```

### Negative Numbers
```tsx
// ❌ BAD - No validation
<Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} />

// ✅ GOOD - Prevent negative input
import { NumberInput } from '@/components/ui/number-input';
<NumberInput value={quantity} onChange={setQuantity} min={0} />
```

### Decimal Precision
```tsx
// ❌ BAD - Floating point errors
const total = 0.1 + 0.2; // 0.30000000000000004

// ✅ GOOD - Round to decimals
import { roundToDecimals } from '@/lib/validation-utils';
const total = roundToDecimals(0.1 + 0.2, 2); // 0.3
```

### Very Large Numbers
```tsx
// ❌ BAD - No bounds checking
const quantity = Number(input); // Could be 999999999999

// ✅ GOOD - Clamp to range
import { clamp, isInRange } from '@/lib/validation-utils';
const quantity = clamp(Number(input), 1, 999);

if (!isInRange(quantity, 1, 999)) {
  toast.error('Quantity must be between 1 and 999');
}
```

## Date Edge Cases

### Invalid Dates
```tsx
// ❌ BAD - Can throw or produce Invalid Date
const formatted = new Date(userInput).toLocaleDateString();

// ✅ GOOD - Validate first
import { isValidDate, formatDate } from '@/lib/date-utils';
if (isValidDate(userInput)) {
  const formatted = formatDate(userInput);
}
```

### Future Dates
```tsx
// ❌ BAD - No validation
const selectedDate = new Date(input);

// ✅ GOOD - Check if future date not allowed
import { isFutureDate } from '@/lib/date-utils';
if (isFutureDate(selectedDate)) {
  errors.date = 'Tanggal tidak boleh di masa depan';
}
```

### Timezone Issues
```tsx
// ⚠️ CAUTION - Be aware of timezone conversions
// Use date-fns functions which handle timezones correctly
import { startOfDay, endOfDay } from 'date-fns';
const start = startOfDay(new Date());
const end = endOfDay(new Date());
```

## Array Edge Cases

### Empty Arrays
```tsx
// ❌ BAD - Runtime error if empty
const first = items[0];
const total = items.reduce((sum, item) => sum + item.price, 0);

// ✅ GOOD - Safe access
import { firstItem, sumArray } from '@/lib/array-utils';
const first = firstItem(items); // undefined if empty
const total = sumArray(items, item => item.price); // 0 if empty
```

### Null/Undefined Arrays
```tsx
// ❌ BAD - Runtime error
const filtered = items.filter(item => item.active);

// ✅ GOOD - Check first
import { isEmptyArray } from '@/lib/array-utils';
if (isEmptyArray(items)) {
  return <EmptyState />;
}
```

## String Edge Cases

### Whitespace
```tsx
// ❌ BAD - User might enter "  " which looks valid
const name = input.value;

// ✅ GOOD - Trim on blur
import { trimWhitespace, isEmpty } from '@/lib/sanitize-utils';
<Input
  value={name}
  onChange={e => setName(e.target.value)}
  onBlur={e => setName(trimWhitespace(e.target.value))}
/>

if (isEmpty(name)) {
  errors.name = 'Nama tidak boleh kosong';
}
```

### XSS Prevention
```tsx
// ❌ BAD - Can execute scripts
<div dangerouslySetInnerHTML={{ __html: userComment }} />

// ✅ GOOD - Sanitize first
import { sanitizeText, escapeHtml } from '@/lib/sanitize-utils';
const clean = sanitizeText(userComment);
<div>{clean}</div>

// Or escape HTML entities
const escaped = escapeHtml(userComment);
```

### SQL Injection (Basic)
```tsx
// ✅ GOOD - Remove SQL keywords
import { sanitizeText } from '@/lib/sanitize-utils';
const cleaned = sanitizeText(userInput); // Removes SELECT, DROP, etc.
```

## API Response Edge Cases

### Null Responses
```tsx
// ❌ BAD - Assumes data exists
const total = data.totalSales;

// ✅ GOOD - Optional chaining and nullish coalescing
const total = data?.totalSales ?? 0;

// ✅ GOOD - Use safe formatters
import { formatCurrency } from '@/lib/format';
const formatted = formatCurrency(data?.totalSales); // Shows "Rp 0" if null
```

### Network Errors
```tsx
// ✅ GOOD - Handle with error-handlers
import { handleApiError } from '@/lib/error-handlers';

const mutation = useMutation({
  mutationFn: productsApi.create,
  onError: (error) => {
    toast(handleApiError(error, 'membuat produk'));
  },
});
```

## UI Edge Cases

### Loading States
```tsx
// ❌ BAD - No loading state
return <ProductList products={data} />;

// ✅ GOOD - Show loading skeleton
import { LoadingState } from '@/components/shared/loading-state';
if (isLoading) return <LoadingState />;
if (!data) return <EmptyState />;
return <ProductList products={data} />;
```

### Empty States
```tsx
// ❌ BAD - Shows nothing when empty
{items.map(item => <ItemCard key={item.id} item={item} />)}

// ✅ GOOD - Show empty state
import { isEmptyArray } from '@/lib/array-utils';
{isEmptyArray(items) ? (
  <EmptyState message="Belum ada item" />
) : (
  items.map(item => <ItemCard key={item.id} item={item} />)
)}
```

### Offline State
```tsx
// ✅ GOOD - Show offline banner
import { OfflineBanner } from '@/components/shared/offline-banner';
import { useOnlineStatus } from '@/hooks/use-online-status';

export function App() {
  return (
    <>
      <OfflineBanner />
      <YourContent />
    </>
  );
}

// In mutation/query, disable when offline
const isOnline = useOnlineStatus();
const { data } = useQuery({
  queryKey: ['products'],
  queryFn: productsApi.list,
  enabled: isOnline, // Don't fetch when offline
});
```

## Form Validation

### Number Inputs
```tsx
// ✅ GOOD - Use NumberInput component
import { NumberInput } from '@/components/ui/number-input';

<NumberInput
  value={price}
  onChange={setPrice}
  min={0}
  max={999999}
  allowDecimal={true}
  maxDecimals={2}
  placeholder="0"
/>
```

### Email Validation
```tsx
import { isValidEmail } from '@/lib/sanitize-utils';

if (!isValidEmail(email)) {
  errors.email = 'Format email tidak valid';
}
```

### Phone Validation
```tsx
import { isValidPhone, formatPhone } from '@/lib/sanitize-utils';

if (!isValidPhone(phone)) {
  errors.phone = 'Format nomor telepon tidak valid';
}

// Format to standard format
const formatted = formatPhone(phone); // "+628123" → "08123"
```

## Performance

### Debounced Search
```tsx
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const [search, setSearch] = useState('');
const debouncedSearch = useDebouncedValue(search, 300);

const { data } = useQuery({
  queryKey: ['products', debouncedSearch],
  queryFn: () => productsApi.search(debouncedSearch),
});
```

### Memoization
```tsx
import { useMemo } from 'react';

const filteredItems = useMemo(
  () => items.filter(item => item.name.includes(search)),
  [items, search]
);
```

## Optimistic Updates

```tsx
import { setupOptimisticUpdate } from '@/lib/query-utils';

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
    toast.error('Failed to create. Changes reverted.');
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success('Product created');
  },
});
```

## Checklist for New Features

- [ ] Handle null/undefined values in calculations
- [ ] Validate numeric ranges (min/max)
- [ ] Prevent division by zero
- [ ] Validate date inputs
- [ ] Handle empty arrays/lists
- [ ] Show loading states during async operations
- [ ] Show empty states when no data
- [ ] Sanitize user text input
- [ ] Validate email/phone formats
- [ ] Handle API errors with user-friendly messages
- [ ] Add offline detection if needed
- [ ] Use debouncing for search/filter inputs
- [ ] Add optimistic updates for better UX
- [ ] Test with extreme values (0, negative, very large)
- [ ] Test with invalid dates
- [ ] Test network errors
