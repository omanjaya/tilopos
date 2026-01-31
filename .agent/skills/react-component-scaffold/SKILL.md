---
name: react-component-scaffold
description: "Scaffolds React components following the MokaPOS design system including POS terminal, KDS display, dashboard, and self-order components. Use when creating UI components for web, POS, or KDS."
---

# React Component Scaffold

## Goal
Generate React components that follow the MokaPOS design system and component structure.

## Instructions

1. Read `Docs/04-SHARED-COMPONENTS.md` for component library reference
2. Read `Docs/06-UI-UX-DESIGN.md` for design tokens and layout specs
3. Determine component type: shared, POS-specific, KDS, dashboard, or self-order
4. Generate the component folder structure

## Component Structure
```
src/shared/components/{ComponentName}/
├── {ComponentName}.tsx        # Main component
├── {ComponentName}.styles.ts  # Styled components
├── {ComponentName}.types.ts   # TypeScript interfaces
├── {ComponentName}.test.tsx   # Unit tests
└── index.ts                   # Re-export
```

## Design Tokens

```typescript
// Colors
const colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  neutral100: '#F5F5F5',
  neutral900: '#171717',
};

// Typography
const fonts = {
  sans: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

// Spacing: 4px, 8px, 16px, 24px, 32px
// Border Radius: 4px (sm), 8px (md), 12px (lg)
// Shadows: sm (0 1px 2px), md (0 4px 6px)
```

## Component Patterns

### Props Interface (types.ts)
```typescript
export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
```

### Functional Component (tsx)
```typescript
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  ...props
}) => {
  return (
    <StyledButton variant={variant} size={size} disabled={disabled || loading} {...props}>
      {loading && <Spinner size="sm" />}
      <span>{children}</span>
    </StyledButton>
  );
};
```

### Index Export (index.ts)
```typescript
export { Button } from './Button';
export type { ButtonProps } from './Button.types';
```

## POS-Specific Requirements
- Touch target minimum: 44x44px
- Product cards: 80x80px minimum
- NumPad buttons: large, tactile feedback
- Cart items: full-width x 56px
- Icons: Lucide Icons library
- Dark mode support via `[data-theme="dark"]`

## KDS-Specific Requirements
- High contrast for kitchen visibility
- Large text (min 16px body, 20px+ headers)
- Color-coded order status
- Timer display prominent
- Bump button large and accessible

## Constraints
- Selalu typed — TIDAK ADA `any` di props
- Icon HARUS dari Lucide Icons
- State management via Zustand hooks
- Support dark mode
- WCAG 2.1 AA: color contrast min 4.5:1, focus states, ARIA labels
