# Design System - TiloPOS

## Overview

Design system TiloPOS menggunakan **Tailwind CSS** dengan design tokens yang didefinisikan di `tailwind.config.js` dan CSS variables di `app.css`. Sistem ini memastikan konsistensi visual di seluruh aplikasi.

---

## Color Palette

### Base Colors (CSS Variables)

Located in `packages/web/src/index.css`:

```css
:root {
  /* Base */
  --background: 0 0% 100%;           /* White */
  --foreground: 222.2 84% 4.9%;      /* Near Black */

  /* Card */
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;

  /* Popover */
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;

  /* Primary (Brand Color) */
  --primary: 221.2 83.2% 53.3%;      /* Blue #3b82f6 */
  --primary-foreground: 210 40% 98%;

  /* Secondary */
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;

  /* Muted */
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;

  /* Accent */
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;

  /* Destructive (Error/Delete) */
  --destructive: 0 84.2% 60.2%;      /* Red #ef4444 */
  --destructive-foreground: 210 40% 98%;

  /* Border */
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;         /* Focus ring */

  /* Chart Colors */
  --chart-1: 221.2 83.2% 53.3%;      /* Blue */
  --chart-2: 142.1 76.2% 36.3%;      /* Green */
  --chart-3: 38.3 92.1% 50.2%;       /* Orange */
  --chart-4: 280.3 89.1% 39.4%;      /* Purple */
  --chart-5: 345.3 82.7% 40.8%;      /* Pink */

  /* Radius */
  --radius: 0.5rem;                  /* 8px */
}

/* Dark Mode */
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;

  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;

  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;

  /* ... other dark mode colors ... */
}
```

### Semantic Color Usage

| Use Case | Tailwind Class | When to Use |
|----------|----------------|-------------|
| **Primary Action** | `bg-primary text-primary-foreground` | CTAs, Submit buttons, Active states |
| **Secondary Action** | `bg-secondary text-secondary-foreground` | Cancel, Back, Outline buttons |
| **Success** | `bg-green-500 text-white` | Success messages, Completed status |
| **Warning** | `bg-yellow-500 text-white` | Warnings, Pending status |
| **Destructive** | `bg-destructive text-destructive-foreground` | Delete, Remove, Error actions |
| **Info** | `bg-blue-500 text-white` | Information, Neutral status |
| **Muted** | `bg-muted text-muted-foreground` | Disabled states, Placeholder |

### Status Colors

```tsx
// Order Status
export const orderStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  preparing: 'bg-blue-100 text-blue-800 border-blue-300',
  ready: 'bg-green-100 text-green-800 border-green-300',
  delivered: 'bg-gray-100 text-gray-800 border-gray-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

// Payment Status
export const paymentStatusColors = {
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  unpaid: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

// Stock Level
export const stockLevelColors = {
  inStock: 'bg-green-100 text-green-800',
  lowStock: 'bg-yellow-100 text-yellow-800',
  outOfStock: 'bg-red-100 text-red-800',
};
```

---

## Typography

### Font Family

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
}
```

**Import fonts** in `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Type Scale

| Element | Class | Size | Weight | Use Case |
|---------|-------|------|--------|----------|
| **H1** | `text-3xl md:text-4xl font-bold` | 30px/36px → 36px/40px | 700 | Page titles |
| **H2** | `text-2xl md:text-3xl font-semibold` | 24px → 30px | 600 | Section headers |
| **H3** | `text-xl md:text-2xl font-semibold` | 20px → 24px | 600 | Subsection headers |
| **H4** | `text-lg font-semibold` | 18px | 600 | Card titles |
| **Body Large** | `text-base` | 16px | 400 | Main content, forms |
| **Body** | `text-sm` | 14px | 400 | Secondary content |
| **Caption** | `text-xs` | 12px | 400 | Labels, timestamps |
| **Overline** | `text-xs uppercase tracking-wide` | 12px | 600 | Section labels |

### Font Weight

```tsx
font-normal     // 400 - Body text
font-medium     // 500 - Emphasized text
font-semibold   // 600 - Headings, buttons
font-bold       // 700 - Major headings
```

### Line Height

```tsx
leading-none      // 1       - Tight headings
leading-tight     // 1.25    - Headings
leading-snug      // 1.375   - Headings
leading-normal    // 1.5     - Body text (default)
leading-relaxed   // 1.625   - Long-form content
leading-loose     // 2       - Spacious content
```

### Text Color

```tsx
text-foreground           // Primary text
text-muted-foreground     // Secondary text, captions
text-primary              // Brand color text
text-destructive          // Error text
text-white                // White text (on dark bg)
```

---

## Spacing System

### Base Unit: 4px (0.25rem)

Tailwind uses `4px` as base unit (`1` = `0.25rem` = `4px`).

### Common Spacing

| Class | Size | Use Case |
|-------|------|----------|
| `p-1` / `m-1` | 4px | Minimal spacing |
| `p-2` / `m-2` | 8px | Tight spacing, icon padding |
| `p-3` / `m-3` | 12px | Small spacing |
| `p-4` / `m-4` | 16px | **Default spacing** (buttons, cards) |
| `p-6` / `m-6` | 24px | Medium spacing (sections) |
| `p-8` / `m-8` | 32px | Large spacing (page margins) |
| `p-12` / `m-12` | 48px | Extra large spacing |

### Responsive Spacing Pattern

```tsx
// Mobile: 16px, Desktop: 24px
<div className="p-4 lg:p-6">

// Mobile: 8px, Tablet: 12px, Desktop: 16px
<div className="space-y-2 md:space-y-3 lg:space-y-4">
```

### Container Spacing

```tsx
// Page Container
<div className="container mx-auto px-4 py-6 lg:px-8 lg:py-8">
  {/* Content */}
</div>

// Card Padding
<Card className="p-4 md:p-6">

// Section Spacing
<section className="space-y-6">
```

---

## Shadows & Elevation

### Shadow Scale

```css
/* tailwind.config.js */
boxShadow: {
  'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
}
```

### Usage

| Element | Shadow | Use Case |
|---------|--------|----------|
| **Card** | `shadow-sm` | Default cards |
| **Popover** | `shadow-md` | Dropdowns, popovers |
| **Modal** | `shadow-lg` | Modal dialogs |
| **Floating Button** | `shadow-xl` | FABs, sticky elements |
| **No Shadow** | `shadow-none` | Nested cards, flat design |

---

## Border Radius

### Radius Scale

```css
borderRadius: {
  'none': '0px',
  'sm': '0.125rem',    // 2px
  'DEFAULT': '0.25rem', // 4px
  'md': '0.375rem',    // 6px
  'lg': 'var(--radius)', // 8px (default)
  'xl': '0.75rem',     // 12px
  '2xl': '1rem',       // 16px
  'full': '9999px',    // Circular
}
```

### Usage

| Element | Class | Radius |
|---------|-------|--------|
| **Buttons** | `rounded-md` | 6px |
| **Cards** | `rounded-lg` | 8px |
| **Inputs** | `rounded-md` | 6px |
| **Modals** | `rounded-xl` | 12px |
| **Avatar** | `rounded-full` | 100% |
| **Chips/Badges** | `rounded-full` | 9999px |
| **Images** | `rounded-lg` | 8px |

---

## Borders

### Border Width

```tsx
border         // 1px
border-2       // 2px
border-4       // 4px
border-0       // 0px
```

### Border Color

```tsx
border-border              // Default border (gray)
border-input              // Input borders
border-primary            // Primary brand border
border-destructive        // Error border
border-transparent        // No border (but reserve space)
```

### Common Patterns

```tsx
// Card Border
<Card className="border border-border">

// Input Border
<Input className="border-input focus:border-primary">

// Divider
<hr className="border-border" />
<div className="border-b border-border" />
```

---

## Icons

### Icon Library: **Lucide React**

```tsx
import { User, Settings, ShoppingCart } from 'lucide-react';

<User className="h-5 w-5" />
```

### Icon Sizes

| Size | Class | Dimension | Use Case |
|------|-------|-----------|----------|
| **XS** | `h-3 w-3` | 12px | Inline icons, badges |
| **SM** | `h-4 w-4` | 16px | Button icons, small UI |
| **MD** | `h-5 w-5` | 20px | **Default** buttons, nav |
| **LG** | `h-6 w-6` | 24px | Headers, large buttons |
| **XL** | `h-8 w-8` | 32px | Feature icons |
| **2XL** | `h-12 w-12` | 48px | Empty states, onboarding |

### Icon Colors

```tsx
// Inherit text color (recommended)
<Icon className="h-5 w-5" />

// Explicit color
<Icon className="h-5 w-5 text-muted-foreground" />
<Icon className="h-5 w-5 text-primary" />
<Icon className="h-5 w-5 text-destructive" />
```

### Icon with Text

```tsx
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Add Product
</Button>
```

---

## Animations & Transitions

### Standard Transitions

```tsx
transition-colors     // Color changes (hover, focus)
transition-opacity    // Fade in/out
transition-transform  // Scale, translate
transition-all        // All properties (use sparingly)
```

### Duration

```tsx
duration-75      // 75ms  - Instant
duration-100     // 100ms - Very fast
duration-150     // 150ms - Fast (default)
duration-200     // 200ms - Standard
duration-300     // 300ms - Moderate
duration-500     // 500ms - Slow
```

### Common Patterns

```tsx
// Button Hover
<Button className="transition-colors hover:bg-primary/90">

// Modal Backdrop
<div className="transition-opacity duration-300 opacity-0 data-[state=open]:opacity-100">

// Slide In (from right)
<div className="transition-transform duration-300 translate-x-full data-[state=open]:translate-x-0">

// Fade In
<div className="transition-opacity duration-200 opacity-0 animate-in fade-in">
```

### Animation Utilities (Tailwind Animate)

```tsx
animate-spin          // Loading spinners
animate-pulse         // Skeleton loading
animate-bounce        // Attention grabber
animate-ping          // Notification badge
```

---

## Dark Mode

### Setup

```tsx
// Controlled by next-themes or custom context
<html className="dark">
  {/* Dark mode active */}
</html>
```

### Dark Mode Classes

```tsx
// Light mode: white bg, dark mode: dark bg
<div className="bg-white dark:bg-gray-900">

// Light mode: dark text, dark mode: light text
<p className="text-gray-900 dark:text-gray-100">

// Border color
<div className="border-gray-200 dark:border-gray-700">
```

### Dark Mode Strategy

**Option 1: CSS Variables (Recommended)**
- Define colors as CSS variables
- Switch variables in `.dark` class
- No need for `dark:` prefix on every element

**Option 2: Tailwind Dark Classes**
- Use `dark:bg-*`, `dark:text-*` on elements
- More verbose but more explicit control

---

## Z-Index Scale

```javascript
// tailwind.config.js
zIndex: {
  '0': '0',
  '10': '10',      // Dropdowns
  '20': '20',      // Sticky headers
  '30': '30',      // Fixed elements
  '40': '40',      // Modals backdrop
  '50': '50',      // Modals
  '60': '60',      // Toasts
  '70': '70',      // Tooltips
  '999': '999',    // Command palette
  'auto': 'auto',
}
```

### Usage

| Element | z-index | Class |
|---------|---------|-------|
| **Normal content** | 0 | `z-0` or no class |
| **Dropdown** | 10 | `z-10` |
| **Sticky header** | 20 | `z-20` |
| **Modal backdrop** | 40 | `z-40` |
| **Modal** | 50 | `z-50` |
| **Toast notification** | 60 | `z-60` |
| **Tooltip** | 70 | `z-70` |
| **Command Palette** | 999 | `z-[999]` |

---

## Utilities & Helpers

### Truncate Text

```tsx
truncate              // Single line ellipsis
line-clamp-2          // 2 lines then ellipsis
line-clamp-3          // 3 lines then ellipsis
```

### Aspect Ratio

```tsx
aspect-square         // 1:1
aspect-video          // 16:9
aspect-[4/3]          // Custom 4:3
```

### Object Fit (Images)

```tsx
object-cover          // Cover (crop if needed)
object-contain        // Contain (letterbox)
object-fill           // Fill (stretch)
```

### Scroll Behavior

```tsx
overflow-auto         // Auto scroll
overflow-hidden       // No scroll
overflow-x-auto       // Horizontal scroll only
scrollbar-hide        // Hide scrollbar (custom)
```

---

## Design Tokens Checklist

When implementing a new component, ensure you use:

✅ **Colors**: Use CSS variables (`bg-primary`, `text-foreground`)
✅ **Spacing**: Use spacing scale (`p-4`, `space-y-6`)
✅ **Typography**: Use type scale (`text-lg`, `font-semibold`)
✅ **Borders**: Use radius & border tokens (`rounded-lg`, `border-border`)
✅ **Shadows**: Use shadow scale (`shadow-md`)
✅ **Icons**: Use Lucide React with size classes (`h-5 w-5`)
✅ **Transitions**: Use standard transitions (`transition-colors`)

❌ **Avoid**:
- Hardcoded colors (`bg-blue-500` unless for status)
- Arbitrary values (`p-[17px]` instead of `p-4`)
- Inline styles (`style={{ color: '#333' }}`)
- Random font sizes (`text-[15px]`)

---

**Last Updated**: 2026-02-05
**Status**: Active
**Related**: [01-RESPONSIVE-DESIGN.md](./01-RESPONSIVE-DESIGN.md), [03-SHARED-COMPONENTS.md](./03-SHARED-COMPONENTS.md)
