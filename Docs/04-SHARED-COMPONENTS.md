# Shared Components - TiloPOS

> **Version:** 1.0  
> **Last Updated:** January 2026

---

## 1. Design System Overview

```
/src/shared
├── /components          # Reusable UI components
├── /hooks               # Custom React hooks
├── /utils               # Utility functions
├── /constants           # Application constants
├── /types               # Shared TypeScript types
└── /assets              # Icons, images, fonts
```

---

## 2. UI Component Library

### 2.1 Core Components

| Category | Components |
|----------|------------|
| **Layout** | `Container`, `Grid`, `Stack`, `Flex`, `Divider` |
| **Typography** | `Heading`, `Text`, `Label`, `Badge` |
| **Forms** | `Input`, `Select`, `Checkbox`, `Radio`, `DatePicker`, `TimePicker` |
| **Buttons** | `Button`, `IconButton`, `ButtonGroup`, `FloatingActionButton` |
| **Feedback** | `Alert`, `Toast`, `Modal`, `Drawer`, `Spinner`, `Progress` |
| **Data Display** | `Table`, `DataGrid`, `Card`, `List`, `Avatar` |
| **Navigation** | `Tabs`, `Breadcrumb`, `Menu`, `Sidebar`, `Pagination` |

### 2.2 Component Structure

```
/components/Button
├── Button.tsx           # Main component
├── Button.styles.ts     # Styled components/CSS
├── Button.types.ts      # TypeScript interfaces
├── Button.test.tsx      # Unit tests
└── index.ts             # Export
```

### 2.3 Button Component Example

```tsx
// Button.types.ts
export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// Button.tsx
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  children,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {!loading && icon && <IconWrapper>{icon}</IconWrapper>}
      <span>{children}</span>
    </StyledButton>
  );
};
```

---

## 3. POS-Specific Components

### 3.1 Transaction Components

| Component | Usage |
|-----------|-------|
| `ProductCard` | Display product in catalog grid |
| `CartItem` | Item row in shopping cart |
| `CartSummary` | Total, tax, discount summary |
| `PaymentMethodSelector` | Payment method buttons |
| `NumPad` | Numeric keypad for cash input |
| `QuantitySelector` | +/- quantity selector |
| `ReceiptPreview` | Receipt preview before print |

### 3.2 Kitchen Display Components

| Component | Usage |
|-----------|-------|
| `OrderTicket` | Single order card on KDS |
| `OrderItemRow` | Item within order ticket |
| `CookingTimer` | Timer per item |
| `StationQueue` | Queue for specific station |
| `BumpButton` | Mark item/order as done |

### 3.3 Dashboard Components

| Component | Usage |
|-----------|-------|
| `MetricCard` | KPI display card |
| `SalesChart` | Line/bar chart for sales |
| `TopProductsList` | Best selling products |
| `RecentTransactions` | Latest transactions table |
| `OutletSelector` | Multi-outlet dropdown |

### 3.4 Self-Order Components

| Component | Usage |
|-----------|-------|
| `MenuBrowser` | Customer-facing product catalog with images |
| `MenuItemCard` | Product card with photo, price, description |
| `ModifierSelector` | Add-on/customization selection UI |
| `SelfOrderCart` | Customer cart view with running total |
| `QRScanner` | QR code reader for session initialization |
| `LanguageToggle` | ID/EN language switcher |
| `SelfOrderConfirm` | Order review before submission |
| `QRISPayment` | QR payment display for self-checkout |

### 3.5 Online Store Components

| Component | Usage |
|-----------|-------|
| `StorefrontLayout` | Public-facing store layout |
| `ProductGallery` | Product images with zoom |
| `ShoppingCart` | Online shopping cart with quantities |
| `CheckoutForm` | Shipping & payment form |
| `OrderTracker` | Customer order status timeline |
| `StoreOrderList` | Admin view of online store orders |
| `CatalogSyncStatus` | Product sync status indicator |
| `ShippingCalculator` | Shipping cost calculator widget |

### 3.6 Ingredient & Recipe Components

| Component | Usage |
|-----------|-------|
| `RecipeBuilder` | Ingredient-to-product recipe editor |
| `IngredientStockCard` | Ingredient stock level display |
| `CostBreakdown` | Ingredient cost per product display |
| `RecipeItemRow` | Single ingredient row in recipe |

### 3.7 Stock Transfer Components

| Component | Usage |
|-----------|-------|
| `TransferRequestForm` | Create transfer between outlets |
| `TransferStatusBadge` | Status indicator (pending/approved/in_transit/received) |
| `TransferTimeline` | Transfer progress timeline |
| `ReceiveTransferForm` | Verify & confirm received items |
| `DiscrepancyAlert` | Alert when received ≠ sent quantities |

### 3.8 Supplier & Purchase Order Components

| Component | Usage |
|-----------|-------|
| `SupplierCard` | Supplier info display |
| `PurchaseOrderForm` | Create/edit purchase order |
| `POStatusTracker` | Purchase order status timeline |
| `ReceiveGoodsForm` | Mark items as received |

### 3.9 Settlement & Audit Components

| Component | Usage |
|-----------|-------|
| `SettlementSummary` | Daily settlement reconciliation view |
| `SettlementMethodBreakdown` | Breakdown by payment method |
| `AuditLogTable` | Searchable audit trail table |
| `AuditLogDetail` | Before/after diff view for audit entry |
| `SuspiciousActivityAlert` | Fraud detection alert card |

### 3.10 Notification Components

| Component | Usage |
|-----------|-------|
| `NotificationBell` | Header notification icon with badge count |
| `NotificationDropdown` | Recent notifications list |
| `NotificationPreferences` | Per-channel toggle settings |
| `AlertConfigForm` | Threshold configuration form |

### 3.11 Device Management Components

| Component | Usage |
|-----------|-------|
| `DeviceList` | Registered devices overview |
| `DeviceStatusCard` | Device health & sync status |
| `DeviceRegistration` | New device registration flow |
| `RemoteWipeConfirm` | Confirmation dialog for remote wipe |

### 3.12 Waiting List Components

| Component | Usage |
|-----------|-------|
| `WaitingListQueue` | Visual queue of waiting customers |
| `WaitingListEntry` | Single entry with name, party size, wait time |
| `AddToWaitlistForm` | New waitlist entry form |
| `SeatNotification` | Alert when table is ready |

---

## 4. Icon System (Premium Icons)

Using **Lucide Icons** or **Phosphor Icons** (open-source premium alternatives)

### 4.1 Icon Categories

| Category | Icons |
|----------|-------|
| **Navigation** | Home, Menu, ChevronRight, ArrowLeft |
| **Actions** | Plus, Minus, Edit, Trash, Search |
| **Commerce** | ShoppingCart, CreditCard, Receipt, Barcode |
| **Status** | Check, X, AlertTriangle, Info, Clock |
| **User** | User, Users, UserPlus, Shield |

### 4.2 Icon Component

```tsx
// Icon.tsx
import * as LucideIcons from 'lucide-react';

interface IconProps {
  name: keyof typeof LucideIcons;
  size?: 16 | 20 | 24 | 32;
  color?: string;
  strokeWidth?: number;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = 'currentColor',
  strokeWidth = 2,
}) => {
  const IconComponent = LucideIcons[name];
  return <IconComponent size={size} color={color} strokeWidth={strokeWidth} />;
};
```

---

## 5. Custom Hooks

### 5.1 Available Hooks

| Hook | Purpose |
|------|---------|
| `useAuth` | Authentication state |
| `useCart` | Cart state management |
| `useOutlet` | Current outlet context |
| `useProducts` | Product fetching/filtering |
| `useTransaction` | Transaction operations |
| `useOfflineSync` | Offline sync status |
| `useKeyboard` | Keyboard shortcuts |
| `usePrinter` | Printer connection |
| `useModifiers` | Modifier group selection state |
| `useIngredients` | Ingredient stock & recipe data |
| `useSelfOrder` | Self-order session & cart state |
| `useOnlineStore` | Store configuration & orders |
| `useStockTransfer` | Transfer request & tracking |
| `useSuppliers` | Supplier & purchase order data |
| `useSettlement` | Payment settlement & reconciliation |
| `useNotifications` | Notification state & preferences |
| `useDevices` | Registered devices & status |
| `useAuditLog` | Audit trail query & filters |
| `useWaitingList` | Waiting list queue state |
| `useSplitBill` | Bill splitting logic |
| `useMultiPayment` | Multi-payment processing state |

### 5.2 Hook Example

```tsx
// useCart.ts
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  
  const addItem = (product: Product, quantity: number) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => 
          i.productId === product.id 
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { productId: product.id, product, quantity }];
    });
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(prev => 
      prev.map(i => i.productId === productId ? { ...i, quantity } : i)
    );
  };

  const clear = () => setItems([]);

  const subtotal = useMemo(() => 
    items.reduce((sum, i) => sum + (i.product.price * i.quantity), 0)
  , [items]);

  return { items, addItem, removeItem, updateQuantity, clear, subtotal };
}
```

---

## 6. Utility Functions

### 6.1 Money Utilities

```typescript
// money.utils.ts
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const parseCurrency = (value: string): number => {
  return Number(value.replace(/[^0-9-]/g, ''));
};
```

### 6.2 Date Utilities

```typescript
// date.utils.ts
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const formatTime = (date: Date): string => {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
```

---

## 7. Design Tokens

```css
/* tokens.css */
:root {
  /* Colors */
  --color-primary-500: #2563EB;
  --color-primary-600: #1D4ED8;
  --color-success-500: #10B981;
  --color-warning-500: #F59E0B;
  --color-danger-500: #EF4444;
  --color-neutral-100: #F5F5F5;
  --color-neutral-900: #171717;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-4: 16px;
  --space-6: 24px;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
}

/* Dark Mode */
[data-theme="dark"] {
  --color-neutral-100: #262626;
  --color-neutral-900: #FAFAFA;
}
```

---

> **Next:** [05-DATABASE-SCHEMA.md](./05-DATABASE-SCHEMA.md)
