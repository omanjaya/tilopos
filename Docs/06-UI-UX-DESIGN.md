# UI/UX Design - TiloPOS

> **Version:** 1.0  
> **Last Updated:** January 2026

---

## 1. Design Principles

### Core Values

| Principle | Description |
|-----------|-------------|
| **Speed First** | Every interaction optimized for speed (retail/F&B context) |
| **Touch Optimized** | Large touch targets (min 44px), swipe gestures |
| **Visual Clarity** | Clear hierarchy, high contrast, readable fonts |
| **Error Prevention** | Confirmations for destructive actions |
| **Accessibility** | WCAG 2.1 AA compliant |

---

## 2. Color System

### Brand Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Primary** | `#2563EB` | CTAs, links, active states |
| **Secondary** | `#0F172A` | Headers, primary text |
| **Success** | `#10B981` | Completed, approved |
| **Warning** | `#F59E0B` | Alerts, pending |
| **Danger** | `#EF4444` | Errors, void, delete |
| **Neutral** | `#64748B` | Secondary text, borders |

### Dark Mode

| Element | Light | Dark |
|---------|-------|------|
| Background | `#FFFFFF` | `#0F172A` |
| Surface | `#F8FAFC` | `#1E293B` |
| Text Primary | `#0F172A` | `#F8FAFC` |
| Text Secondary | `#64748B` | `#94A3B8` |

---

## 3. Typography

### Font Stack

```css
--font-primary: 'Inter', -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Scale

| Type | Size | Weight | Line Height |
|------|------|--------|-------------|
| H1 | 32px | 700 | 1.2 |
| H2 | 24px | 600 | 1.3 |
| H3 | 20px | 600 | 1.4 |
| Body | 16px | 400 | 1.5 |
| Small | 14px | 400 | 1.5 |
| Caption | 12px | 500 | 1.4 |

---

## 4. Screen Layouts

### 4.1 POS Terminal

```
┌─────────────────────────────────────────────────────────────────┐
│  Logo   │  Search...  │ User ▼ │ Outlet ▼ │ Settings │ Shift  │
├─────────┴───────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────┐  ┌───────────────────────────┐│
│  │       PRODUCT CATALOG       │  │        CART               ││
│  │                             │  │                           ││
│  │  [Category Tabs]            │  │  Item 1          Rp 25.000││
│  │                             │  │  Item 2 (x2)     Rp 50.000││
│  │  ┌─────┐ ┌─────┐ ┌─────┐   │  │  Item 3          Rp 15.000││
│  │  │ A   │ │ B   │ │ C   │   │  │                           ││
│  │  │25K  │ │30K  │ │20K  │   │  ├───────────────────────────┤│
│  │  └─────┘ └─────┘ └─────┘   │  │  Subtotal        Rp 90.000││
│  │                             │  │  Discount           -5.000││
│  │  ┌─────┐ ┌─────┐ ┌─────┐   │  │  Tax (11%)        Rp 9.350││
│  │  │ D   │ │ E   │ │ F   │   │  │  ─────────────────────────││
│  │  │15K  │ │45K  │ │35K  │   │  │  TOTAL           Rp 94.350││
│  │  └─────┘ └─────┘ └─────┘   │  │                           ││
│  │                             │  │  ┌─────────────────────┐  ││
│  └─────────────────────────────┘  │  │     CHARGE          │  ││
│                                   │  └─────────────────────┘  ││
│                                   └───────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Kitchen Display (KDS)

```
┌─────────────────────────────────────────────────────────────────┐
│  KITCHEN DISPLAY  │  All Orders: 8  │  Pending: 5  │  Ready: 3 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ #A12        │  │ #A13        │  │ #A14        │             │
│  │ Table 5     │  │ Takeaway    │  │ Table 2     │             │
│  │ 5:23        │  │ 3:45        │  │ 2:10        │             │
│  │ ─────────── │  │ ─────────── │  │ ─────────── │             │
│  │ 1x Nasi Grg │  │ 2x Es Teh   │  │ 1x Mie Ayam │             │
│  │ 2x Mie Grg  │  │ 1x Juice    │  │ 1x Nasi Grg │             │
│  │ 1x Es Teh   │  │             │  │             │             │
│  │ ─────────── │  │ ─────────── │  │ ─────────── │             │
│  │ [  BUMP  ]  │  │ [  BUMP  ]  │  │ [  BUMP  ]  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐                              │
│  │ #A15        │  │ #A16        │                              │
│  │ Delivery    │  │ Table 8     │                              │
│  │ 1:30        │  │ 0:45        │                              │
│  └─────────────┘  └─────────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Dashboard (Backoffice)

```
┌─────────────────────────────────────────────────────────────────┐
│  Logo  │  Dashboard  Products  Orders  Reports  Settings       │
├────────┴────────────────────────────────────────────────────────┤
│                                                                  │
│  Today's Overview                                    [Outlet ▼] │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Sales    │  │ Trans.   │  │ Avg.     │  │ Customers│        │
│  │ Rp 15.2M │  │ 234      │  │ Rp 65K   │  │ 189      │        │
│  │ +12%     │  │ +8%      │  │ +5%      │  │ +15%     │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  Sales Trend                          Top Products              │
│  ┌────────────────────────────┐      ┌────────────────────────┐│
│  │                            │      │ 1. Nasi Goreng  Rp 2.5M││
│  │     ___/\___/\             │      │ 2. Mie Goreng   Rp 1.8M││
│  │    /          \___         │      │ 3. Es Teh       Rp 1.2M││
│  │___/                        │      │ 4. Ayam Bakar   Rp 980K││
│  │                            │      │ 5. Juice        Rp 750K││
│  └────────────────────────────┘      └────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Component Spacing

| Token | Size | Usage |
|-------|------|-------|
| `xs` | 4px | Icon padding |
| `sm` | 8px | Inner component spacing |
| `md` | 16px | Component gaps |
| `lg` | 24px | Section spacing |
| `xl` | 32px | Page margins |

---

## 6. Touch Targets

| Element | Min Size |
|---------|----------|
| Buttons | 44 x 44 px |
| Product Cards | 80 x 80 px |
| Cart Items | Full-width x 56px |
| Icons (tappable) | 44 x 44 px |

---

## 7. Icons (Premium)

Using **Lucide Icons** library:

| Category | Icons |
|----------|-------|
| Navigation | `Home`, `Menu`, `ArrowLeft`, `ChevronRight` |
| Actions | `Plus`, `Minus`, `Edit2`, `Trash2`, `Search` |
| Commerce | `ShoppingCart`, `CreditCard`, `Receipt`, `Tag` |
| Status | `Check`, `X`, `AlertCircle`, `Info`, `Clock` |
| User | `User`, `Users`, `Shield`, `Settings` |

---

## 8. Motion & Animation

| Transition | Duration | Easing |
|------------|----------|--------|
| Button press | 100ms | ease-out |
| Modal open | 200ms | ease-out |
| Page transition | 300ms | ease-in-out |
| Cart item add | 150ms | spring |

---

## 9. Responsive Breakpoints

| Screen | Min Width | Layout |
|--------|-----------|--------|
| Mobile | 0px | Single column |
| Tablet | 768px | Side-by-side |
| Desktop | 1024px | Full layout |
| Large | 1440px | Max-width contained |

---

## 10. Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Color Contrast | Min 4.5:1 for text |
| Focus States | Visible outline on all interactive |
| Screen Reader | ARIA labels on icons |
| Keyboard Nav | Tab order logical |
| Touch | Min 44px targets |

---

> **Next:** [00-INDEX.md](./00-INDEX.md)
