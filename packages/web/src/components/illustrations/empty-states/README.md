# Empty State Illustrations

A collection of lightweight SVG illustrations for empty states, organized into individual component files.

## Structure

Each illustration is now in its own file, making the codebase more maintainable and easier to navigate:

```
empty-states/
├── EmptyBox.tsx           # Generic empty state
├── SearchEmpty.tsx        # No search results
├── CartEmpty.tsx          # Empty shopping cart
├── UsersEmpty.tsx         # No users/customers
├── DocumentEmpty.tsx      # No documents/orders
├── FolderEmpty.tsx        # No files/data
├── InboxEmpty.tsx         # No messages
├── CalendarEmpty.tsx      # No events
├── ChartEmpty.tsx         # No data/statistics
├── Error.tsx              # Error state
├── Success.tsx            # Success state
├── Construction.tsx       # Under construction
├── NoConnection.tsx       # No network connection
├── NoPermission.tsx       # Access denied
└── index.ts               # Barrel export
```

## Usage

### Recommended (New)

Import directly from the barrel export with shorter names:

```tsx
import { EmptyBox, SearchEmpty, CartEmpty } from '@/components/illustrations/empty-states';

function MyComponent() {
  return (
    <div>
      <EmptyBox className="w-48 h-48" />
      <SearchEmpty className="w-32 h-32 text-muted-foreground" />
      <CartEmpty className="w-64 h-64" />
    </div>
  );
}
```

### Individual Imports

You can also import specific illustrations:

```tsx
import { EmptyBox } from '@/components/illustrations/empty-states/EmptyBox';
import { SearchEmpty } from '@/components/illustrations/empty-states/SearchEmpty';
```

### Backward Compatibility (Deprecated)

The old import path still works but is deprecated:

```tsx
// This still works but is deprecated
import { EmptyBoxIllustration } from '@/components/illustrations/empty-illustrations';
```

## Component Categories

### Generic Empty States
- `EmptyBox` - Generic empty state
- `SearchEmpty` - No search results
- `CartEmpty` - Empty shopping cart
- `DocumentEmpty` - No documents/orders
- `FolderEmpty` - No files/data
- `InboxEmpty` - No messages/notifications
- `CalendarEmpty` - No events/schedule
- `ChartEmpty` - No data/statistics

### User-Related
- `UsersEmpty` - No customers/employees

### Status & Feedback
- `Error` - Error state
- `Success` - Success/completed state
- `Construction` - Coming soon/under maintenance
- `NoConnection` - Network connection issues
- `NoPermission` - Access denied/locked

## Props

All illustrations accept standard SVG props:

```tsx
interface IllustrationProps extends SVGProps<SVGSVGElement> {
  className?: string;
  // ... any other SVG attributes
}
```

## Theming

All illustrations use CSS custom properties for theming and will automatically adapt to your theme:

- `hsl(var(--muted))` - Background circles
- `hsl(var(--muted-foreground))` - Main illustration color
- `hsl(var(--primary))` - Accent color (Success, Construction)
- `hsl(var(--destructive))` - Error color (Error, NoConnection)
- `hsl(var(--background))` - Fill colors

## File Size

Each illustration file is less than 100 lines, making them easy to maintain and modify.

## Migration from Old Structure

If you were using the old monolithic file:

**Before:**
```tsx
import { EmptyBoxIllustration } from '@/components/illustrations/empty-illustrations';
```

**After:**
```tsx
import { EmptyBox } from '@/components/illustrations/empty-states';
```

The old names are still exported for backward compatibility but are marked as deprecated.
