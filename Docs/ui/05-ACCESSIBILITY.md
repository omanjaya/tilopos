# Accessibility Guidelines - TiloPOS

## Overview

Panduan lengkap accessibility (a11y) untuk TiloPOS Web Frontend dengan target **WCAG 2.1 Level AA compliance**. Accessibility adalah critical untuk SME/UMKM users dengan berbagai kemampuan.

**Last Updated**: 2026-02-05
**Current Score**: 5.5/10 (Needs Significant Improvement)
**Target Score**: 9+/10 (Excellent)

---

## Table of Contents

1. [Current Status](#current-status)
2. [Keyboard Navigation](#keyboard-navigation)
3. [ARIA Labels & Semantics](#aria-labels--semantics)
4. [Focus Management](#focus-management)
5. [Color Contrast](#color-contrast)
6. [Touch Targets](#touch-targets)
7. [Screen Reader Support](#screen-reader-support)
8. [Testing Strategy](#testing-strategy)
9. [Quick Wins](#quick-wins)
10. [Implementation Checklist](#implementation-checklist)

---

## Current Status

### ✅ **What's Working Well**

| Feature | Status | Evidence |
|---------|--------|----------|
| **Keyboard shortcuts** | ✅ Good | Global (⌘K, ⌘P, etc.) + POS (F1-F12) |
| **Focus styling** | ✅ Good | Consistent `focus-visible:ring-2` |
| **Radix UI components** | ✅ Good | Dialog, Dropdown, Sheet auto-managed |
| **Base color contrast** | ✅ Good | Primary/foreground 18:1 ratio |
| **Touch targets (POS)** | ✅ Good | 44px minimum in touch contexts |
| **Form labels** | ✅ Good | Proper `htmlFor` association |

### ❌ **Critical Gaps**

| Issue | Count | Impact | Priority |
|-------|-------|--------|----------|
| Icon buttons without `aria-label` | 50+ | 🔴 CRITICAL | HIGH |
| Missing `aria-live` regions | 0 found | 🔴 CRITICAL | HIGH |
| Touch targets < 44px | 20+ buttons | 🔴 CRITICAL | MEDIUM |
| Muted text contrast (WCAG fail) | Many instances | 🟡 HIGH | MEDIUM |
| Missing `aria-busy` for loading | 0 found | 🟡 MEDIUM | LOW |
| No keyboard nav in tables | All tables | 🟡 MEDIUM | MEDIUM |

---

## Keyboard Navigation

### ✅ **Implemented: Keyboard Shortcuts**

**Global Shortcuts** (`use-keyboard-shortcuts.ts`):
```tsx
⌘/Ctrl + K  → Open command palette
⌘/Ctrl + D  → Go to Dashboard
⌘/Ctrl + P  → Go to POS
⌘/Ctrl + E  → Go to Products
⌘/Ctrl + I  → Go to Inventory
⌘/Ctrl + R  → Go to Reports
⌘/Ctrl + ,  → Open Settings
⌘/Ctrl + /  → Show shortcuts help
```

**POS Shortcuts** (`use-pos-shortcuts.ts`):
```tsx
F1   → Focus search
F2   → Toggle grid/list view
F3   → Show categories
F4   → View cart
F5   → Hold bill
F6   → Resume bill
F7   → Apply discount
F8   → Add note
F9   → Quick cash payment
F10  → Quick QRIS payment
F12  → Process payment
Esc  → Close modal / Clear cart
```

**Implementation:**
```tsx
// hooks/use-keyboard-shortcuts.ts
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Skip if user is typing in input
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const key = event.key.toLowerCase();
      const modKey = event.metaKey || event.ctrlKey;

      if (modKey && shortcuts[key]) {
        event.preventDefault();
        shortcuts[key]();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
```

---

### ⚠️ **Needs Improvement**

#### **1. Arrow Key Navigation (Missing)**

**Problem:** Tables and lists not keyboard-navigable with arrow keys

**Solution:**
```tsx
// Add to DataTable component
const [focusedRow, setFocusedRow] = useState(0);

useEffect(() => {
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocusedRow((prev) => Math.min(prev + 1, data.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusedRow((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter') {
      // Open detail or trigger action
      onRowClick(data[focusedRow]);
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [focusedRow, data]);

return (
  <TableRow
    tabIndex={0}
    aria-selected={index === focusedRow}
    className={index === focusedRow ? 'ring-2 ring-primary' : ''}
  >
    ...
  </TableRow>
);
```

#### **2. Tab Order Optimization (Missing)**

**Current:** Relies entirely on DOM order
**Recommended:** Strategic use of `tabIndex`

```tsx
// Skip decorative elements
<ChevronRight className="h-4 w-4" tabIndex={-1} aria-hidden="true" />

// Make custom components focusable
<div role="button" tabIndex={0} onKeyDown={handleKeyDown}>
  Custom clickable div
</div>
```

#### **3. Keyboard Shortcuts Discoverability**

**Add visual hints:**
```tsx
<Button>
  Save
  <kbd className="ml-2 text-xs opacity-50">⌘S</kbd>
</Button>
```

**Add `aria-keyshortcuts`:**
```tsx
<Button aria-keyshortcuts="Control+S">Save</Button>
```

---

## ARIA Labels & Semantics

### ✅ **Good Examples (Currently in Code)**

```tsx
// Icon-only buttons with labels
<Button aria-label="Toggle theme">
  <Sun className="h-4 w-4" />
</Button>

<Button aria-label={`Notifikasi (${unreadCount} belum dibaca)`}>
  <Bell className="h-4 w-4" />
  {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
</Button>

// Form fields with descriptions
<FormField>
  <Label htmlFor="name">Product Name</Label>
  <Input id="name" aria-describedby="name-hint" />
  <p id="name-hint" className="text-sm text-muted-foreground">
    Enter a unique product name.
  </p>
</FormField>

// Decorative icons hidden from screen readers
<Separator>
  <ChevronRight className="h-4 w-4" aria-hidden="true" />
</Separator>

// Breadcrumbs with proper ARIA
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li aria-current="page">Products</li>
  </ol>
</nav>
```

---

### ❌ **Critical Fixes Needed**

#### **1. Icon-Only Buttons (50+ instances)**

**Problem:** Many icon buttons lack `aria-label`

**Examples to fix:**
```tsx
// ❌ BAD - No label
<Button variant="ghost" size="icon">
  <Edit3 className="h-4 w-4" />
</Button>

// ✅ GOOD
<Button variant="ghost" size="icon" aria-label="Edit product">
  <Edit3 className="h-4 w-4" />
</Button>

// ❌ BAD - No label
<Button onClick={handleDelete}>
  <Trash2 className="h-4 w-4" />
</Button>

// ✅ GOOD
<Button onClick={handleDelete} aria-label="Delete product">
  <Trash2 className="h-4 w-4" />
</Button>
```

**Files to fix:**
- Product list (Edit, Delete buttons)
- Customer list (Edit, Delete buttons)
- Settings pages (Delete, Edit icons)
- Table management (Zoom, edit icons)

---

#### **2. Dialog/Modal Labels**

**Problem:** Dialog titles not linked with `aria-labelledby`

**Fix:**
```tsx
// ❌ BAD
<Dialog>
  <DialogContent>
    <DialogTitle>Edit Product</DialogTitle>
    <DialogDescription>Make changes to product.</DialogDescription>
  </DialogContent>
</Dialog>

// ✅ GOOD
<Dialog>
  <DialogContent aria-labelledby="dialog-title" aria-describedby="dialog-desc">
    <DialogTitle id="dialog-title">Edit Product</DialogTitle>
    <DialogDescription id="dialog-desc">
      Make changes to product details below.
    </DialogDescription>
  </DialogContent>
</Dialog>
```

---

#### **3. Dynamic Content Updates (aria-live)**

**Problem:** 0 instances of `aria-live` found - critical for screen readers!

**Fix cart updates:**
```tsx
// components/pos/cart-panel.tsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {cartItems.length} items in cart. Total: {formatCurrency(total)}
</div>
```

**Fix toast notifications:**
```tsx
// components/ui/toast.tsx
<Toast aria-live="polite" aria-atomic="true">
  {title}
</Toast>
```

**Fix form submissions:**
```tsx
<Button aria-busy={mutation.isPending}>
  {mutation.isPending ? 'Saving...' : 'Save'}
</Button>
```

**aria-live variants:**
- `polite` - Announce when user is idle (most cases)
- `assertive` - Announce immediately (errors, critical updates)
- `off` - Don't announce (default)

---

## Focus Management

### ✅ **Good: Focus Styling**

**Consistent across components:**
```css
/* Applied via Tailwind */
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ring
focus-visible:ring-offset-2
```

**Example:**
```tsx
<Button className="focus-visible:ring-2 focus-visible:ring-primary">
  Click Me
</Button>
```

---

### ⚠️ **Needs Improvement**

#### **1. Auto-Focus on Modals**

**Current:** Only 2 instances of `autoFocus` found

**Recommended:**
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogTitle>Edit Product</DialogTitle>
    <Input
      id="name"
      defaultValue={product.name}
      autoFocus  // Focus first field when modal opens
    />
  </DialogContent>
</Dialog>
```

#### **2. Focus Restoration**

**Problem:** After closing modal, focus not returned to trigger

**Solution (automatic with Radix UI):**
```tsx
// Radix Dialog already handles this, but verify:
<Dialog>
  <DialogTrigger asChild>
    <Button ref={triggerRef}>Open</Button>
  </DialogTrigger>
  {/* Focus returns to Button on close */}
</Dialog>
```

**For custom modals:**
```tsx
const triggerRef = useRef<HTMLButtonElement>(null);

const handleClose = () => {
  setOpen(false);
  triggerRef.current?.focus();  // Restore focus
};
```

#### **3. Focus Trap in Modals**

**Good:** Radix UI handles this automatically for Dialog/Sheet

**Verify focus trap:**
1. Open modal
2. Press Tab repeatedly
3. Focus should cycle within modal (not escape to background)

---

## Color Contrast

### ✅ **Good Contrast (WCAG AAA)**

**Light Mode:**
```css
/* Foreground on Background: ~18:1 */
--foreground: 222.2 84% 4.9%  (near black)
--background: 0 0% 100%        (white)

/* Primary on Primary-foreground: ~8:1 */
--primary: 221.2 83.2% 53.3%   (blue)
--primary-foreground: 210 40% 98%  (near white)
```

**Dark Mode:**
```css
/* Foreground on Background: ~17:1 */
--foreground: 210 40% 98%      (near white)
--background: 222.2 84% 4.9%   (dark navy)
```

---

### ❌ **Fails WCAG AA**

#### **1. Muted Text**

**Problem:**
```css
/* Light mode */
--muted-foreground: 215.4 16.3% 46.9%  (gray)
--background: 0 0% 100%                (white)
/* Contrast: ~4.5:1 - FAILS AA for normal text (need 4.5:1+) */

/* Dark mode */
--muted-foreground: 215 20.2% 65.1%    (light gray)
--background: 222.2 84% 4.9%           (dark navy)
/* Contrast: ~5.5:1 - FAILS AA for normal text */
```

**Fix:**
```css
/* Increase lightness by 8-10% */
:root {
  --muted-foreground: 215.4 16.3% 55%;  /* Was 46.9% */
}

.dark {
  --muted-foreground: 215 20.2% 70%;   /* Was 65.1% */
}
```

**Verify with:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Browser DevTools (Lighthouse accessibility audit)

---

#### **2. Destructive Color (Borderline)**

**Test:**
```css
--destructive: 0 84.2% 60.2%   (red)
--destructive-foreground: 210 40% 98%  (near white)
/* Contrast: ~5.5:1 - Borderline for AA */
```

**Recommendation:** Increase contrast to 7:1 for AAA compliance

---

#### **3. Hover/Active States**

**Problem:** Only opacity changes, no color change

```tsx
// Current (not colorblind-friendly)
<Button className="hover:bg-primary/90">Click</Button>

// Better (color + pattern change)
<Button className="hover:bg-primary-600 hover:underline">Click</Button>
```

---

## Touch Targets

### ✅ **Good: POS Touch Targets**

```css
/* 44px minimum for touch devices */
.pos-touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* POS buttons are 56px (h-14) */
<Button className="h-14 w-full">Large Touch Button</Button>
```

**Media query for touch devices:**
```css
@media (pointer: coarse) {
  .pos-touch-target {
    min-height: 44px;
    min-width: 44px;
  }
}
```

---

### ❌ **Violations**

#### **1. Icon Buttons (40px default)**

**Problem:**
```tsx
// Default: h-10 w-10 = 40px ❌ (Need 44px minimum)
<Button variant="ghost" size="icon">
  <Settings className="h-4 w-4" />
</Button>
```

**Fix:**
```tsx
// Update Button component default size
// components/ui/button.tsx
const buttonVariants = cva({
  variants: {
    size: {
      default: "h-10",
      sm: "h-9",
      lg: "h-11",
      icon: "h-11 w-11",  // Changed from h-10 w-10
    }
  }
});
```

#### **2. Table Action Buttons (28px)**

**Problem:**
```tsx
// Table actions use h-7 w-7 = 28px ❌ Far too small!
<Button size="icon" className="h-7 w-7">
  <Edit3 className="h-3 w-3" />
</Button>
```

**Fix:**
```tsx
// Use standard icon size (h-11 w-11 = 44px)
<Button size="icon" aria-label="Edit">
  <Edit3 className="h-4 w-4" />
</Button>
```

---

### **Touch Target Guidelines**

| Element | Minimum Size | Recommended |
|---------|-------------|-------------|
| **Buttons** | 44 x 44 px | 48 x 48 px |
| **Icon buttons** | 44 x 44 px | 48 x 48 px |
| **Links** | 44 x 44 px | - |
| **Checkbox/Radio** | 44 x 44 px (tap area) | - |
| **Input fields** | Height 44px | Height 48px |

**Spacing:** Minimum 8px between tap targets

---

## Screen Reader Support

### ✅ **Good: SR-Only Text**

**Current usage (9 instances):**
```tsx
// Hide content visually but keep for screen readers
<span className="sr-only">Close</span>

// Sheet title hidden visually
<SheetTitle className="sr-only">Shopping Cart</SheetTitle>

// Help tooltip
<span className="sr-only">Help</span>
```

**Tailwind `sr-only` class:**
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

### ❌ **Critical Gaps**

#### **1. Dynamic Content (aria-live)**

**Add to components:**

```tsx
// Cart updates
<div aria-live="polite" className="sr-only">
  Cart updated. {itemCount} items, total {formatCurrency(total)}
</div>

// Form validation
<div aria-live="assertive" className="sr-only">
  {errors.name && `Error: ${errors.name.message}`}
</div>

// Loading states
<div aria-live="polite" aria-busy="true" className="sr-only">
  Loading products...
</div>

// Success messages
<div aria-live="polite" className="sr-only">
  Product saved successfully.
</div>
```

#### **2. Loading States**

**Add `aria-busy`:**
```tsx
<Button aria-busy={isPending} disabled={isPending}>
  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Save
</Button>

<div aria-busy={isLoading} aria-label="Loading content">
  {isLoading ? <Skeleton /> : <ActualContent />}
</div>
```

#### **3. Status Messages**

**Current:** No announcements for status changes

**Fix:**
```tsx
// Sync status
<div aria-live="polite" className="sr-only">
  {syncStatus === 'syncing' && 'Syncing data...'}
  {syncStatus === 'synced' && 'Data synced successfully'}
  {syncStatus === 'error' && 'Sync failed. Retrying...'}
</div>

// Network status
<div aria-live="assertive" className="sr-only">
  {isOnline ? 'Back online' : 'You are offline'}
</div>
```

---

## Testing Strategy

### **Automated Testing**

#### **1. Axe DevTools (Browser Extension)**
```bash
# Install browser extension
# Chrome: https://chrome.google.com/webstore (search "axe DevTools")
# Firefox: https://addons.mozilla.org/firefox (search "axe DevTools")

# Run on page
1. Open DevTools
2. Click "axe DevTools" tab
3. Click "Scan ALL of my page"
4. Review violations
```

#### **2. Lighthouse Accessibility Audit**
```bash
# In Chrome DevTools
1. Open DevTools (F12)
2. Click "Lighthouse" tab
3. Select "Accessibility" only
4. Click "Generate report"
5. Target: Score > 95
```

#### **3. Automated Tests (Vitest + Testing Library)**
```tsx
// Example: __tests__/button.test.tsx
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Button', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <Button aria-label="Delete">
        <Trash2 className="h-4 w-4" />
      </Button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('icon-only button has aria-label', () => {
    render(
      <Button aria-label="Settings">
        <Settings className="h-4 w-4" />
      </Button>
    );

    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
  });
});
```

---

### **Manual Testing**

#### **1. Keyboard-Only Navigation**
```
✓ Unplug mouse
✓ Navigate entire app with Tab, Enter, Escape, Arrow keys
✓ All interactive elements reachable?
✓ Focus visible on all elements?
✓ Modal focus trap works?
✓ Can complete all tasks (create product, checkout, etc.)?
```

#### **2. Screen Reader Testing**

**Tools:**
- **Windows:** NVDA (free) or JAWS
- **macOS:** VoiceOver (built-in, ⌘F5)
- **Linux:** Orca

**Test checklist:**
```
✓ Headings announced in order (H1, H2, H3)?
✓ Form labels read correctly?
✓ Button purposes clear?
✓ Dynamic updates announced (cart, notifications)?
✓ Error messages read?
✓ Table headers announced?
```

**VoiceOver (Mac) quick test:**
1. Enable: System Preferences > Accessibility > VoiceOver > Enable
2. Or: Press ⌘F5
3. Navigate: Control + Option + Arrow keys
4. Interact: Control + Option + Shift + Down Arrow
5. Test: Login, add product to cart, checkout

#### **3. Color Contrast Testing**

**Tools:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Stark Plugin](https://www.getstark.co/) (Figma/Chrome)
- Chrome DevTools (inspect element > Styles > color preview)

**Test all combinations:**
```
✓ Text on background
✓ Links on background
✓ Buttons (normal, hover, focus, active, disabled)
✓ Form inputs (normal, focus, error)
✓ Badges/pills
✓ Muted text
```

#### **4. Touch Target Testing**

**Real device testing:**
```
✓ Test on actual phones (iPhone SE 375px, Galaxy S23 360px)
✓ Can tap all buttons without missing?
✓ Accidental taps on adjacent buttons?
✓ Comfortable thumb-friendly zones?
```

**DevTools simulation:**
```
1. Chrome DevTools > Toggle device toolbar (Ctrl+Shift+M)
2. Select device (iPhone SE, iPad, etc.)
3. Test all interactive elements
4. Verify 44px minimum tap targets
```

#### **5. High Contrast Mode**

**Windows:**
```
Settings > Ease of Access > High contrast > Turn on high contrast
```

**macOS:**
```
System Preferences > Accessibility > Display > Increase contrast
```

**Test:**
```
✓ All text readable?
✓ Borders visible?
✓ Focus indicators visible?
✓ Icons distinguishable?
```

---

## Quick Wins (High Impact, Low Effort)

### **Priority 1: Fix Icon Buttons (30 min)**

**Affected:** 50+ buttons

**Fix:**
```tsx
// Find all instances of:
<Button variant="ghost" size="icon">
  <Icon className="h-4 w-4" />
</Button>

// Add aria-label:
<Button variant="ghost" size="icon" aria-label="Action description">
  <Icon className="h-4 w-4" />
</Button>
```

**Files to update:**
- `features/products/products-page.tsx`
- `features/customers/customers-page.tsx`
- `features/employees/employees-page.tsx`
- `features/settings/*-page.tsx`
- `components/layout/header.tsx`

---

### **Priority 2: Add aria-live to Cart (15 min)**

```tsx
// features/pos/components/cart-panel.tsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {items.length} items in cart. Total: {formatCurrency(total)}
</div>
```

---

### **Priority 3: Fix Muted Text Contrast (5 min)**

```css
/* styles/globals.css */
:root {
  --muted-foreground: 215.4 16.3% 55%;  /* Was 46.9% */
}

.dark {
  --muted-foreground: 215 20.2% 70%;   /* Was 65.1% */
}
```

---

### **Priority 4: Increase Icon Button Size (10 min)**

```tsx
// components/ui/button.tsx
const buttonVariants = cva({
  variants: {
    size: {
      icon: "h-11 w-11",  // Changed from h-10 w-10
    }
  }
});
```

---

### **Priority 5: Add aria-busy to Buttons (20 min)**

```tsx
// All mutation buttons
<Button
  onClick={handleSubmit}
  disabled={isPending}
  aria-busy={isPending}
>
  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Save
</Button>
```

---

## Implementation Checklist

### **Component Level**

When building a component:

- [ ] All interactive elements have accessible names (text or `aria-label`)
- [ ] Icon-only buttons have `aria-label`
- [ ] Decorative icons have `aria-hidden="true"`
- [ ] Forms have proper `<label>` associations
- [ ] Error messages use `aria-describedby`
- [ ] Loading states use `aria-busy`
- [ ] Dynamic content uses `aria-live`
- [ ] Focus styling visible (`focus-visible:ring-2`)
- [ ] Touch targets minimum 44px
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Keyboard navigable (Tab, Enter, Escape)
- [ ] Screen reader tested

---

### **Page Level**

When building a page:

- [ ] Proper heading hierarchy (H1 → H2 → H3)
- [ ] Skip to main content link (optional)
- [ ] Keyboard shortcuts documented
- [ ] Focus management on navigation
- [ ] Error states announced
- [ ] Loading states announced
- [ ] Form validation accessible
- [ ] Modal focus trap working
- [ ] All tasks completable with keyboard only
- [ ] Tested with screen reader
- [ ] Lighthouse score > 95

---

## Related Documentation

- **[03-SHARED-COMPONENTS.md](./03-SHARED-COMPONENTS.md)** - Component accessibility requirements
- **[04-LOADING-STATES.md](./04-LOADING-STATES.md)** - Accessible loading patterns
- **[02-DESIGN-SYSTEM.md](./02-DESIGN-SYSTEM.md)** - Color contrast guidelines

---

## Resources

### **WCAG Guidelines**
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM WCAG Checklist](https://webaim.org/standards/wcag/checklist)

### **Testing Tools**
- [axe DevTools](https://www.deque.com/axe/devtools/) (Chrome/Firefox extension)
- [WAVE](https://wave.webaim.org/) (Web accessibility evaluation tool)
- [NVDA](https://www.nvaccess.org/) (Free screen reader for Windows)

### **Learning Resources**
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [Inclusive Components](https://inclusive-components.design/)

---

**Remember:** Accessibility is not optional. Every user deserves equal access to TiloPOS features regardless of their abilities.

**Questions?** Test with keyboard-only navigation first, then screen reader.

**Found accessibility issue?** Fix it immediately and add test to prevent regression.
