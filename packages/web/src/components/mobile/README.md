# Mobile Components

Advanced mobile-optimized components for TiloPOS web application.

## Components

### 1. PullToRefresh

Pull-to-refresh gesture component for mobile devices.

**File:** `pull-to-refresh.tsx`

**Features:**
- Touch gesture detection with resistance curve
- Visual pull indicator (spinner + dynamic text)
- Release to refresh behavior
- Smooth spring animations
- Only activates on touch devices
- Configurable thresholds
- Loading state management
- Accessibility support

**Props:**
```typescript
interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  refreshThreshold?: number;        // default: 80px
  maxPullDistance?: number;         // default: 150px
  enabled?: boolean;                // default: true
  className?: string;
  pullingText?: string;             // default: "Pull to refresh"
  releaseText?: string;             // default: "Release to refresh"
  refreshingText?: string;          // default: "Refreshing..."
}
```

**Usage:**
```typescript
import { PullToRefresh, PullToRefreshContainer } from '@/components/mobile/pull-to-refresh';
import { useQuery } from '@tanstack/react-query';

function ProductList() {
  const { data, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      refreshThreshold={80}
      pullingText="Pull to refresh products"
    >
      <PullToRefreshContainer>
        <div className="p-4 space-y-4">
          {data?.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </PullToRefreshContainer>
    </PullToRefresh>
  );
}
```

---

## Shared Mobile Components

### 2. MobileBottomSheet (Enhanced)

Advanced bottom sheet with snap points and drag gestures.

**File:** `../shared/mobile-bottom-sheet.tsx`

**Features:**
- Multiple snap points (e.g., 50%, 90% of viewport height)
- Drag handle with visual feedback
- Backdrop blur effect
- Swipe to dismiss gesture
- Height animation with spring physics
- Touch-optimized gestures
- Mouse support (for desktop testing)
- Keyboard support (Escape to close)
- Visual snap point indicators
- ARIA labels for accessibility

**Props:**
```typescript
interface MobileBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  snapPoints?: number[];           // default: [0.5, 0.9]
  initialSnapPoint?: number;       // default: 0
  className?: string;
  swipeToDismiss?: boolean;        // default: true
  dismissThreshold?: number;       // default: 100px
}
```

**Usage:**
```typescript
import {
  MobileBottomSheet,
  MobileBottomSheetTrigger,
  MobileBottomSheetActions,
} from '@/components/shared/mobile-bottom-sheet';

function FilterSheet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <MobileBottomSheetTrigger onClick={() => setOpen(true)}>
        <Button>Open Filters</Button>
      </MobileBottomSheetTrigger>

      <MobileBottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Filter Products"
        description="Select your filter criteria"
        snapPoints={[0.5, 0.9]}
        initialSnapPoint={0}
        swipeToDismiss={true}
      >
        <div className="space-y-4">
          <div>Category filters...</div>
          <div>Price range...</div>

          <MobileBottomSheetActions>
            <Button onClick={() => handleApply()}>Apply Filters</Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </MobileBottomSheetActions>
        </div>
      </MobileBottomSheet>
    </>
  );
}
```

**Snap Points:**
- Snap points are defined as viewport height ratios (0-1)
- Example: `[0.5, 0.9]` = 50% and 90% of screen height
- Users can drag between snap points
- Sheet automatically snaps to nearest point on release

---

### 3. SwipeableCard (Enhanced)

Card with swipe gestures for mobile actions.

**File:** `../shared/swipeable-card.tsx`

**Features:**
- Swipe left → Reveal Edit action (blue background)
- Swipe right → Reveal Delete action (red background)
- Configurable swipe threshold (default: 50% card width)
- Spring animation back to center
- Touch-optimized for mobile browsers
- Mouse support (for desktop testing)
- Customizable actions with icons and colors
- Keyboard accessible (Enter/Escape)
- ARIA labels for screen readers
- Visual hint overlay
- Support for single or dual actions

**Props:**
```typescript
interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;              // default: "Edit"
  deleteLabel?: string;            // default: "Delete"
  editIcon?: React.ReactNode;
  deleteIcon?: React.ReactNode;
  enabled?: boolean;               // default: true
  swipeThreshold?: number;         // default: 0.5 (50%)
  actionButtonWidth?: number;      // default: 80px
  className?: string;
  disableEdit?: boolean;
  disableDelete?: boolean;
}
```

**Usage:**
```typescript
import { SwipeableCard } from '@/components/shared/swipeable-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function ProductCard({ product, onEdit, onDelete }) {
  return (
    <SwipeableCard
      onEdit={() => onEdit(product.id)}
      onDelete={() => onDelete(product.id)}
      editLabel="Edit"
      deleteLabel="Delete"
      swipeThreshold={0.5}
    >
      <Card>
        <CardHeader>
          <CardTitle>{product.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {formatCurrency(product.price)}
          </p>
          <p className="text-sm text-muted-foreground">
            Stock: {product.stock}
          </p>
        </CardContent>
      </Card>
    </SwipeableCard>
  );
}

// Using in a list
function ProductList({ products }) {
  return (
    <div className="space-y-2 p-4">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
```

**Custom Actions Example:**
```typescript
<SwipeableCard
  onEdit={() => handleShare(item)}
  onDelete={() => handleArchive(item)}
  editLabel="Share"
  deleteLabel="Archive"
  editIcon={<Share className="h-5 w-5" />}
  deleteIcon={<Archive className="h-5 w-5" />}
>
  <ItemCard item={item} />
</SwipeableCard>
```

**Single Action Example:**
```typescript
<SwipeableCard
  onDelete={() => handleDelete(item.id)}
  disableEdit={true}
>
  <ItemCard item={item} />
</SwipeableCard>
```

---

## Implementation Details

### Animation Physics

All components use **spring physics** for natural animations:
- Cubic-bezier timing function: `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Provides bounce effect on release
- Smooth transitions between states

### Touch Event Handling

Components handle both touch and mouse events:
- **Touch events**: `touchstart`, `touchmove`, `touchend`
- **Mouse events**: `mousedown`, `mousemove`, `mouseup` (for desktop testing)
- Proper event cleanup in `useEffect`

### Performance Optimizations

1. **React.useCallback**: Memoized event handlers
2. **React.useMemo**: Computed values only recalculated when dependencies change
3. **CSS transforms**: Hardware-accelerated animations
4. **Conditional rendering**: Components only render necessary elements

### Accessibility Features

1. **ARIA labels**: Descriptive labels for screen readers
2. **Keyboard support**: Escape to close, Enter to confirm
3. **Focus management**: Proper focus handling
4. **Live regions**: `aria-live` for dynamic content updates
5. **Semantic HTML**: Proper role attributes

---

## Testing

### Desktop Testing (Chrome DevTools)

1. Open Chrome DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select mobile device (e.g., iPhone 12 Pro)
4. Test touch gestures with mouse

### Mobile Testing

Test on actual devices:
- iOS Safari
- Chrome for Android
- Edge Mobile

### Test Cases

**PullToRefresh:**
- [ ] Pull down from top triggers refresh
- [ ] Pull partially and release cancels
- [ ] Indicator shows correct text (pulling/release/refreshing)
- [ ] Works only on mobile/touch devices
- [ ] Scroll works normally when not at top

**MobileBottomSheet:**
- [ ] Opens at initial snap point
- [ ] Drag handle resizes sheet
- [ ] Snaps to nearest point on release
- [ ] Swipe down beyond threshold dismisses
- [ ] Backdrop click closes sheet
- [ ] Escape key closes sheet
- [ ] Visual indicators show current snap point

**SwipeableCard:**
- [ ] Swipe left reveals edit (blue)
- [ ] Swipe right reveals delete (red)
- [ ] Threshold correctly triggers action reveal
- [ ] Spring animation returns to center
- [ ] Actions execute correctly
- [ ] Keyboard navigation works
- [ ] Single action mode works

---

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Safari (iOS)**: Full support
- **Firefox Mobile**: Full support
- **Samsung Internet**: Full support

**Minimum versions:**
- Chrome 91+
- Safari 14+
- Firefox 89+

---

## Future Enhancements

1. **PullToRefresh:**
   - Custom loading indicators
   - Success/error feedback
   - Multiple refresh zones

2. **MobileBottomSheet:**
   - Programmatic snap point changes
   - Dynamic snap points based on content
   - Nested bottom sheets

3. **SwipeableCard:**
   - More than 2 actions
   - Customizable action colors
   - Haptic feedback (iOS)
   - Auto-close other cards when one is revealed

---

## Related Components

- `mobile-filters.tsx` - Mobile filter UI
- `mobile-table.tsx` - Mobile-optimized table
- `mobile-nav.tsx` - Mobile navigation

---

## Credits

Built for **TiloPOS** by the development team.
Uses Radix UI primitives and Tailwind CSS.
