# TiloPOS - UX Improvements Plan

> **Document Purpose:** Comprehensive plan untuk meningkatkan user experience dengan onboarding, tutorial, help system, dan productivity features
> **Status:** Planning Phase
> **Priority:** HIGH - Directly impacts user adoption and satisfaction

---

## Executive Summary

Plan ini dirancang untuk menjawab gap UX yang teridentifikasi dari codebase exploration. Backend sudah **99% complete**, sekarang fokus ke **frontend UX** untuk:

1. **Onboarding & Tutorial System** - Mengurangi learning curve untuk new users
2. **User Profile & Account Management** - Self-service untuk mengurangi beban admin
3. **Contextual Help System** - Inline help dan dokumentasi untuk reduce support tickets
4. **Quick Actions & Productivity** - Command palette dan keyboard shortcuts untuk power users
5. **Client-Facing UX** - Enhanced self-order dan online storefront untuk customer satisfaction

**Total Effort:** 8-12 hari development + 1-2 hari testing
**Impact:** Peningkatan 40-50% user adoption, pengurangan 30-40% support tickets

---

## Current State Analysis

### ✅ Strengths (Yang Sudah Bagus)
- Solid component library (shadcn/ui berbasis Radix UI)
- Comprehensive navigation (30+ menu items, 7 sections)
- Role-based access control (RBAC) implemented
- POS keyboard shortcuts (F1-F10) sudah ada
- Dark mode support
- WebSocket real-time features
- Mobile responsive design
- 99% backend completion dengan zero TypeScript errors

### ❌ Gaps (Yang Perlu Ditambahkan)
- **No onboarding** - First-time users langsung masuk dashboard tanpa guidance
- **No contextual help** - Form fields tidak ada tooltip atau explanation
- **No user profile page** - Users tidak bisa edit profile sendiri
- **No breadcrumbs** - Navigasi dalam bisa membingungkan
- **No command palette** - Tidak ada ⌘K quick search
- **Limited documentation** - Help content minimal
- **Self-order perlu polish** - Customer-facing UX masih basic

---

## Feature 1: Onboarding & Tutorial System

### 1.1 First-Time User Experience (FTUE) Wizard

**Tujuan:** Membimbing new user setup bisnis pertama kali dengan 4-step wizard

**Flow:**
1. **Welcome Screen**
   - Selamat datang di TILO
   - Video intro 30 detik (opsional)
   - "Mulai Setup" button

2. **Business Setup**
   - Form: Nama bisnis, alamat, nomor telepon, email
   - Auto-validation dengan feedback real-time
   - "Skip for now" option

3. **First Outlet**
   - Panduan membuat outlet pertama
   - Fields: Nama outlet, kode, alamat
   - Default tax rate 11% (PPN Indonesia)

4. **Quick Tour**
   - Highlight 5 fitur utama: Dashboard, POS, Produk, Inventori, Laporan
   - "Start Using TILO" button

**Technical Implementation:**
```typescript
// Component structure
src/features/onboarding/
  onboarding-wizard.tsx       // Main wizard dengan step management
  steps/
    welcome-step.tsx          // Step 1
    business-step.tsx         // Step 2 (form dengan validasi)
    outlet-step.tsx           // Step 3 (form dengan validasi)
    tour-step.tsx             // Step 4 (feature highlights)
  onboarding-provider.tsx     // Context provider untuk state
  use-onboarding.ts           // Hook untuk status tracking
```

**State Management:**
- Store `onboardingCompleted: boolean` di backend (Employee model)
- Auto-trigger wizard jika `onboardingCompleted === false` pada first login
- Progress indicator (1/4 → 2/4 → 3/4 → 4/4)
- Framer Motion untuk smooth transitions

**Backend Changes Needed:**
```prisma
model Employee {
  // ... existing fields
  onboardingCompleted Boolean @default(false)
}
```

---

### 1.2 Interactive Product Tours (Shepherd.js)

**Tujuan:** Guided tours untuk fitur-fitur kompleks

**Library:** `shepherd.js` v13 + `react-shepherd` v9
- Lightweight (~20KB gzipped)
- Accessibility compliant
- Touch-friendly untuk tablet

**Tours yang akan dibuat:**

1. **Dashboard Tour** (6 steps)
   - Step 1: Metric cards explanation
   - Step 2: Sales chart interaction
   - Step 3: Date range selector
   - Step 4: Outlet selector
   - Step 5: Navigation sidebar
   - Step 6: Quick actions header

2. **POS Tour** (8 steps)
   - Product grid
   - Category filters
   - Search products
   - Add to cart
   - Cart management
   - Payment methods
   - Keyboard shortcuts
   - Print receipt

3. **Products Tour** (5 steps)
   - Product list
   - Search & filters
   - Create product
   - Variants & modifiers
   - Category management

4. **Inventory Tour** (6 steps)
   - Stock levels overview
   - Low stock alerts
   - Stock transfers
   - Stock adjustments
   - Purchase orders
   - Supplier management

5. **Reports Tour** (4 steps)
   - Report types
   - Date filters
   - Export options
   - Custom reports

**Trigger Mechanism:**
- Auto-show tour pada first visit ke halaman (localStorage tracking)
- Manual trigger dari header "Bantuan" dropdown
- "Replay Tour" option selalu available
- "Don't show again" checkbox

**Storage:**
```typescript
// localStorage key
"tilo-completed-tours": ["dashboard", "pos", "products", "inventory", "reports"]
```

**Files:**
```
src/components/shared/
  product-tour.tsx            // Wrapper component
  use-tour.ts                 // Tour management hook
src/config/
  tours.config.ts             // Tour definitions
```

---

### 1.3 Tutorial Video Library

**Tujuan:** Self-service learning dengan video tutorials

**Route:** `/app/help/tutorials`

**Content Structure:**

**Category 1: Getting Started** (5 videos)
- Video 1: "Setup Bisnis Pertama Kali" (3 menit)
- Video 2: "Menambahkan Outlet dan Karyawan" (4 menit)
- Video 3: "Membuat Produk dan Kategori" (5 menit)
- Video 4: "Transaksi Pertama di POS" (6 menit)
- Video 5: "Melihat Laporan Penjualan" (4 menit)

**Category 2: Advanced Features** (8 videos)
- Manajemen stok dan transfer antar outlet (7 menit)
- Program loyalty dan promosi (6 menit)
- Self-order QR code untuk pelanggan (5 menit)
- Setup toko online (8 menit)
- Integrasi marketplace (GoFood, GrabFood) (10 menit)
- Kitchen Display System (KDS) (6 menit)
- Shift management dan settlement (7 menit)
- Analisis dan laporan lanjutan (9 menit)

**Category 3: Troubleshooting** (4 videos)
- Handle refund dan void transaksi (5 menit)
- Sinkronisasi offline (4 menit)
- Setup thermal printer (6 menit)
- Reset PIN karyawan (3 menit)

**UI Features:**
- Grid layout: 3 columns desktop, 2 tablet, 1 mobile
- Video card: thumbnail, title, duration, category badge, "watched" checkmark
- Search bar (fuzzy search by title/description)
- Category filter tabs
- Video player modal (YouTube iframe atau self-hosted)
- Progress tracking (localStorage: watched videos)
- Bookmark/favorite feature

**Data Source Options:**

**Option A (Simple):** Static config file
```typescript
// tutorials.config.ts
export const tutorials = [
  {
    id: 'setup-first-business',
    title: 'Setup Bisnis Pertama Kali',
    category: 'getting-started',
    duration: '3:00',
    thumbnail: '/tutorials/thumbnails/setup.jpg',
    videoUrl: 'https://youtube.com/embed/...',
    description: 'Panduan lengkap setup bisnis...'
  },
  // ... more tutorials
];
```

**Option B (Dynamic):** Backend API
```typescript
GET /help/tutorials
Response: Tutorial[]
```

**Files:**
```
src/features/help/
  tutorial-library-page.tsx   // Main page
  components/
    tutorial-card.tsx         // Video card component
    video-player-modal.tsx    // Modal dengan iframe
    tutorial-filters.tsx      // Search + category filters
src/config/
  tutorials.config.ts         // Tutorial data
```

---

## Feature 2: User Profile & Account Management

### 2.1 My Profile Page

**Tujuan:** Self-service account management untuk reduce admin workload

**Route:** `/app/profile`

**Layout:** Tabs dengan 4 sections

#### Tab 1: Personal Information
- Profile photo upload (drag & drop, max 2MB, JPG/PNG)
- Name (editable)
- Email (editable)
- Phone (editable, Indonesian format validation)
- Role badge (read-only, assigned by admin)
- Outlet assignment (read-only, assigned by admin)
- Member since date (read-only)

#### Tab 2: Security
- **Change PIN**
  - Current PIN input (6 digits, masked)
  - New PIN input (6 digits, masked)
  - Confirm new PIN
  - Validation: PIN must be numeric, exactly 6 digits
  - Rate limiting: Max 3 attempts per hour

- **Active Sessions** (future phase)
  - List of login sessions: device, location, IP, timestamp
  - "Logout All" button (revoke all tokens)

- **Two-Factor Authentication** (future phase)
  - Enable/disable 2FA
  - TOTP QR code setup

#### Tab 3: Preferences
- **Language:** Indonesian / English (dropdown)
- **Timezone:** Asia/Jakarta (dropdown dengan search)
- **Date Format:** DD/MM/YYYY vs MM/DD/YYYY
- **Currency Display:** Rp 100.000 vs Rp 100,000
- **Notification Preferences:**
  - Email notifications (toggle)
  - Push notifications (toggle)
  - SMS notifications (toggle)
  - Notification categories (low stock, large transactions, refunds, etc.)

#### Tab 4: Activity Log
- Recent login history (last 20 logins)
  - Timestamp
  - Device type (Desktop/Mobile/Tablet)
  - Browser
  - IP address
  - Location (if available)

- Recent actions (last 50 from audit log)
  - Timestamp
  - Action type
  - Details
  - Result (success/failed)

**API Endpoints:**
```typescript
// Profile endpoints
GET  /auth/me                # Get current user (already exists)
PUT  /auth/profile           # Update profile (name, phone, photo)
PUT  /auth/change-pin        # Change PIN (requires old PIN)
GET  /auth/activity          # Activity log (last 50 actions)
GET  /auth/sessions          # Active sessions (future)
POST /auth/logout-all        # Revoke all sessions (future)
```

**Validation Rules:**
- PIN: Exactly 6 numeric digits
- Phone: Indonesian format (+62 atau 08xx)
- Email: RFC 5322 compliant
- Photo: Max 2MB, MIME type image/jpeg or image/png
- Name: 2-100 characters

**Files:**
```
src/features/profile/
  my-profile-page.tsx         // Main page dengan tabs
  components/
    personal-info-form.tsx    // Tab 1
    security-settings.tsx     // Tab 2
    preferences-form.tsx      // Tab 3
    activity-log.tsx          # Tab 4
src/api/endpoints/
  profile.api.ts              // API calls
```

---

### 2.2 Enhanced Header Profile Dropdown

**Tujuan:** Quick access ke profile dan help

**Current State:** Avatar + name + logout button

**Enhanced Version:**

**Section 1: User Info**
- Avatar dengan online status (green dot)
- Name (bold)
- Role badge (Manager, Cashier, etc.)
- Outlet name (muted text)

**Section 2: Quick Actions** (new)
- 👤 My Profile → `/app/profile`
- 🔒 Security Settings → `/app/profile#security`
- ⚙️ Preferences → `/app/profile#preferences`

**Section 3: Help & Support** (new)
- 📚 Help Center → `/app/help`
- 🎥 Video Tutorials → `/app/help/tutorials`
- ⌨️ Keyboard Shortcuts → Open shortcuts dialog

**Section 4: App Settings**
- 🌙 Theme Toggle (Light/Dark) - already exists
- 🏪 Switch Outlet (if multiple outlets)

**Section 5: Account**
- 🚪 Logout - already exists

**Visual Improvements:**
- Icons untuk semua menu items (Lucide)
- Divider antar sections
- Hover state dengan subtle highlight
- Smooth dropdown animation

**Files:**
```
src/components/layout/
  header.tsx                  // Enhanced dropdown menu
```

---

## Feature 3: Contextual Help System

### 3.1 Inline Help Tooltips

**Tujuan:** Explain complex fields tanpa leave page

**Implementation Pattern:**
```tsx
<div className="flex items-center gap-2">
  <Label>Tax Rate (%)</Label>
  <HelpTooltip content="Persentase pajak yang akan diterapkan pada semua transaksi. Default: 11% (PPN Indonesia)." />
</div>
```

**HelpTooltip Component:**
```tsx
// src/components/ui/help-tooltip.tsx
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function HelpTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

**Apply tooltips to:**

**Settings Pages:**
- Tax settings: tax rate, service charge, tax inclusive
- Receipt template: header, footer, logo
- Operating hours: timezone, day-specific hours
- Notification settings: each notification type

**Product Form:**
- SKU explanation
- Cost price vs selling price
- Track stock toggle
- Variants concept
- Modifier groups

**Employee Form:**
- Hourly rate (for commission calculation)
- Role permissions explanation
- PIN vs password

**POS Page:**
- Discount types (percentage vs fixed)
- Payment methods
- Split bill concept
- Hold/resume bill

**Content Source:**
```typescript
// src/config/help-content.ts
export const helpContent = {
  'tax-rate': 'Persentase pajak yang akan diterapkan pada semua transaksi. Default: 11% (PPN Indonesia).',
  'service-charge': 'Biaya layanan tambahan yang dikenakan pada transaksi (opsional).',
  'sku': 'Stock Keeping Unit - kode unik untuk identifikasi produk. Contoh: PRD-001',
  'cost-price': 'Harga modal/pokok produk. Digunakan untuk kalkulasi profit margin.',
  // ... 50+ more entries
};
```

**Files:**
```
src/components/ui/
  help-tooltip.tsx            // Reusable component
src/config/
  help-content.ts             // Centralized help text
```

---

### 3.2 Field Descriptions (Inline Help Text)

**Pattern:**
```tsx
<div className="space-y-2">
  <Label>Minimum Stock Level</Label>
  <Input type="number" {...field} />
  <p className="text-sm text-muted-foreground">
    Sistem akan mengirim notifikasi jika stok di bawah nilai ini.
    Contoh: Set 10 untuk produk yang sering laku.
  </p>
</div>
```

**Apply to:**
- Complex forms (inventory, promotions, loyalty)
- Settings dengan business logic
- Fields with non-obvious purpose

---

### 3.3 Help Center Page

**Route:** `/app/help`

**Layout:**

**Header:**
- Large search bar: "Cari bantuan..." (fuzzy search)
- Quick links: Tutorials | Shortcuts | Contact Support

**Category Cards Grid:**
```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ 🚀 Getting Started│ │ 💰 POS & Trans   │ │ 📦 Inventory     │
│ 12 articles       │ │ 18 articles      │ │ 15 articles      │
└──────────────────┘ └──────────────────┘ └──────────────────┘
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ 📊 Reports        │ │ 🔌 Integrations  │ │ 🔐 Account       │
│ 10 articles       │ │ 8 articles       │ │ 6 articles       │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

**FAQ Accordion:**
- Top 20 most asked questions
- Collapsible (Radix Accordion)
- Syntax highlighting untuk code examples
- Screenshots/GIFs untuk visual steps

**Contact Support Section:**
- Email: support@tilo.id
- WhatsApp: +62 xxx xxx xxxx
- Business hours: Mon-Fri 9AM-6PM WIB

**FAQ Categories & Sample Questions:**

**Getting Started:**
- Q: Bagaimana cara menambahkan produk pertama?
- Q: Cara setup outlet baru?
- Q: Bagaimana cara menambahkan karyawan?

**POS & Transactions:**
- Q: Cara melakukan refund transaksi?
- Q: Bagaimana cara split bill untuk meja yang sama?
- Q: Apa bedanya void dan refund?
- Q: Cara cetak ulang struk?

**Inventory:**
- Q: Cara transfer stok antar outlet?
- Q: Bagaimana sistem auto-deduction ingredients?
- Q: Cara set up low stock alerts?

**Reports:**
- Q: Cara export laporan ke Excel?
- Q: Bagaimana cara melihat laporan per karyawan?
- Q: Apa arti metric "Avg Order Value"?

**Integrations:**
- Q: Cara connect ke GoFood?
- Q: Setup payment gateway Xendit?
- Q: Integrasi thermal printer?

**Account & Security:**
- Q: Cara reset PIN karyawan?
- Q: Bagaimana cara ganti email?
- Q: Apa itu Two-Factor Authentication (2FA)?

**Data Source:**

**Option A:** Static config
```typescript
// src/config/faqs.config.ts
export const faqs = [
  {
    id: 'add-first-product',
    category: 'getting-started',
    question: 'Bagaimana cara menambahkan produk pertama?',
    answer: 'Untuk menambahkan produk: 1. Buka menu Products...',
    tags: ['products', 'setup'],
  },
  // ... more FAQs
];
```

**Option B:** Backend API
```typescript
GET /help/faqs?category=getting-started
Response: FAQ[]
```

**Files:**
```
src/features/help/
  help-center-page.tsx        // Main help center
  components/
    faq-accordion.tsx         // Collapsible FAQs
    category-cards.tsx        // Category grid
    search-bar.tsx            // Search dengan fuzzy match
src/config/
  faqs.config.ts              // FAQ data
```

---

## Feature 4: Quick Actions & Productivity

### 4.1 Command Palette (⌘K / Ctrl+K)

**Tujuan:** Power user feature untuk quick navigation

**Library:** `cmdk` v1.0.0 (already used by shadcn)
- Fuzzy search
- Keyboard navigation
- Categories & grouping
- Recent items
- ~5KB gzipped

**Global Shortcut:**
- Mac: `⌘K` (Command+K)
- Windows/Linux: `Ctrl+K`

**Search Categories:**

**1. Pages** (30+ items)
```
Dashboard
POS Terminal
Products
Categories
Inventory
Stock Transfers
Customers
Loyalty Program
Employees
Shifts
Orders
Kitchen Display (KDS)
Reports
Settings
...
```

**2. Actions** (20+ items)
```
Create New Product
Add Customer
Start Shift
New Transaction
Generate Report
Export Data
Sync Inventory
Process Refund
Split Bill
...
```

**3. Settings**
```
Tax Settings
Receipt Template
Operating Hours
Outlets
Notification Settings
...
```

**4. Help**
```
View Tutorials
Keyboard Shortcuts
Help Center
Contact Support
```

**Features:**
- Fuzzy match (e.g., "npr" matches "New Product")
- Recent items at top
- Icons untuk visual identification
- Keyboard hints (e.g., "Enter to select", "Esc to close")
- Category separators
- Empty state: "No results found. Try 'help' for assistance."

**Storage:**
```typescript
// localStorage
"tilo-recent-commands": ["dashboard", "pos", "products", "customers"]
// Max 10 recent items, FIFO
```

**Implementation:**
```tsx
// src/components/shared/command-palette.tsx
import { Command } from 'cmdk';

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  // Listen for ⌘K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <Command.Dialog open={open} onOpenChange={setOpen}>
      <Command.Input placeholder="Type a command or search..." />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>

        <Command.Group heading="Recent">
          <Command.Item onSelect={() => navigate('/app')}>
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Pages">
          <Command.Item onSelect={() => navigate('/app/pos')}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            POS Terminal
          </Command.Item>
          {/* ... more items */}
        </Command.Group>

        <Command.Group heading="Actions">
          <Command.Item onSelect={() => navigate('/app/products/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Product
          </Command.Item>
          {/* ... more items */}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

**Files:**
```
src/components/shared/
  command-palette.tsx         // Main component
  use-command-palette.ts      // Hook untuk open/close
src/config/
  commands.config.ts          // Command definitions
```

---

### 4.2 Global Keyboard Shortcuts

**Tujuan:** Quick navigation untuk power users

**Existing:** POS shortcuts (F1-F10) - already implemented

**New Global Shortcuts:**

| Shortcut | Action | Context |
|----------|--------|---------|
| `⌘K` / `Ctrl+K` | Open command palette | Global |
| `⌘/` / `Ctrl+/` | Show all shortcuts | Global |
| `⌘P` / `Ctrl+P` | Go to POS | Global |
| `⌘D` / `Ctrl+D` | Go to Dashboard | Global |
| `⌘E` / `Ctrl+E` | Go to Products | Global |
| `⌘I` / `Ctrl+I` | Go to Inventory | Global |
| `⌘R` / `Ctrl+R` | Go to Reports | Global |
| `⌘,` / `Ctrl+,` | Open Settings | Global |
| `⌘L` / `Ctrl+L` | Logout (with confirm) | Global |
| `Esc` | Close modal/dialog | Global |

**Implementation:**
```typescript
// src/hooks/use-global-shortcuts.ts
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router';

export function useGlobalShortcuts() {
  const navigate = useNavigate();

  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    // Command palette already handles this
  });

  useHotkeys('mod+p', (e) => {
    e.preventDefault();
    navigate('/app/pos');
  });

  useHotkeys('mod+d', (e) => {
    e.preventDefault();
    navigate('/app');
  });

  // ... more shortcuts
}
```

**Shortcuts Dialog Enhancement:**
```tsx
// Update existing shortcuts-dialog.tsx
<Dialog>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Keyboard Shortcuts</DialogTitle>
    </DialogHeader>

    <div className="grid gap-4">
      <div>
        <h3 className="font-medium mb-2">Global Shortcuts</h3>
        <ShortcutItem keys={['⌘', 'K']} description="Open command palette" />
        <ShortcutItem keys={['⌘', 'P']} description="Go to POS" />
        {/* ... more */}
      </div>

      <div>
        <h3 className="font-medium mb-2">POS Shortcuts</h3>
        <ShortcutItem keys={['F1']} description="Focus search" />
        <ShortcutItem keys={['F2']} description="Toggle view" />
        {/* ... existing POS shortcuts */}
      </div>
    </div>
  </DialogContent>
</Dialog>
```

**Prevent Browser Conflicts:**
- `Ctrl+P` normally opens print dialog → preventDefault
- `Ctrl+K` in Chrome opens search → preventDefault
- Use `mod+` prefix (auto-detects ⌘ on Mac, Ctrl on Windows)

**First-Use Hint:**
```tsx
// Show toast on first dashboard visit
useEffect(() => {
  const hasSeenHint = localStorage.getItem('tilo-shortcut-hint-seen');
  if (!hasSeenHint) {
    toast.info('💡 Tip: Press ⌘K to open quick actions', {
      duration: 5000,
    });
    localStorage.setItem('tilo-shortcut-hint-seen', 'true');
  }
}, []);
```

**Files:**
```
src/hooks/
  use-global-shortcuts.ts     // Global shortcuts hook
src/components/shared/
  keyboard-shortcuts-dialog.tsx  // Enhanced dialog
```

---

### 4.3 Breadcrumb Navigation

**Tujuan:** Help users understand location dalam app hierarchy

**Display:** Below page title in header

**Pattern:**
```
Dashboard > Products > Edit Product > "Nasi Goreng"
└─────┬─────┘ └───┬───┘ └─────┬──────┘ └──────┬──────┘
   clickable   clickable   clickable     current page
```

**Auto-Generation dari Route:**
```
Route: /app/products/edit/123
Breadcrumbs:
  Dashboard > Products > Edit Product > [product name from API]

Route: /app/inventory/transfers/new
Breadcrumbs:
  Dashboard > Inventory > Stock Transfers > New Transfer

Route: /app/settings/tax
Breadcrumbs:
  Dashboard > Settings > Tax Settings
```

**Implementation:**
```tsx
// src/components/shared/breadcrumbs.tsx
import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link to="/app" className="hover:text-foreground">
        Dashboard
      </Link>
      {pathnames.map((segment, index) => {
        const path = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = formatSegment(segment);

        return (
          <React.Fragment key={path}>
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function formatSegment(segment: string): string {
  // Map route segments to readable labels
  const labels: Record<string, string> = {
    'app': 'Dashboard',
    'pos': 'POS',
    'products': 'Products',
    'edit': 'Edit',
    'new': 'New',
    'inventory': 'Inventory',
    'transfers': 'Stock Transfers',
    // ... more mappings
  };
  return labels[segment] || segment;
}
```

**Usage in Page:**
```tsx
// src/features/products/product-form-page.tsx
export function ProductFormPage() {
  return (
    <div>
      <Breadcrumbs />
      <PageHeader title="Edit Product" description="..." />
      {/* ... rest of page */}
    </div>
  );
}
```

**Mobile Handling:**
- On mobile: Horizontal scroll breadcrumbs
- Show ellipsis for deep nesting (max 3 visible)
- Current page always visible

**Files:**
```
src/components/shared/
  breadcrumbs.tsx             // Component
  use-breadcrumbs.ts          // Hook untuk custom logic
```

---

## Feature 5: Client-Facing UX Improvements

### 5.1 Enhanced Self-Order Experience

**File:** `src/features/self-order/customer-self-order-page.tsx` (enhance existing 495-line file)

**Current State:** Basic self-order sudah ada dengan cart management

**Improvements:**

#### 1. Better Product Images
```tsx
// Lazy loading dengan blur placeholder
<img
  src={product.imageUrl}
  alt={product.name}
  loading="lazy"
  className="blur-load"
  onLoad={(e) => e.currentTarget.classList.remove('blur-load')}
/>

// Lightbox untuk zoom
import Lightbox from 'react-image-lightbox';
<Lightbox
  mainSrc={selectedImage}
  onCloseRequest={() => setShowLightbox(false)}
/>

// Fallback image
<img
  src={product.imageUrl || '/placeholder-product.png'}
  onError={(e) => { e.currentTarget.src = '/placeholder-product.png'; }}
/>
```

#### 2. Product Recommendations
```tsx
// Popular items section
<section className="mb-6">
  <h2 className="text-lg font-semibold mb-3">Menu Populer</h2>
  <div className="grid grid-cols-2 gap-3">
    {popularItems.map(item => (
      <ProductCard key={item.id} product={item} />
    ))}
  </div>
</section>

// "You May Also Like" below cart
<aside className="mt-4">
  <h3 className="text-sm font-medium mb-2">Anda Mungkin Suka</h3>
  <ProductCarousel items={relatedItems} />
</aside>
```

**Logic:** Popular items = top 5 by order count (from backend analytics)

#### 3. Sticky Cart Footer
```tsx
// Fixed bottom cart summary
<div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
  <div className="flex items-center justify-between max-w-6xl mx-auto">
    <div className="flex items-center gap-3">
      <ShoppingCart className="h-5 w-5" />
      <span className="font-medium">
        {cartItemCount} items
      </span>
    </div>

    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-sm text-muted-foreground">Total</p>
        <p className="text-lg font-bold text-primary">
          {formatCurrency(cartTotal)}
        </p>
      </div>
      <Button size="lg" onClick={openCart}>
        Lihat Keranjang
        <Badge className="ml-2">{cartItemCount}</Badge>
      </Button>
    </div>
  </div>
</div>

// Animation saat item ditambah
<motion.div
  initial={{ scale: 1 }}
  animate={{ scale: [1, 1.2, 1] }}
  transition={{ duration: 0.3 }}
>
  <Badge>{cartItemCount}</Badge>
</motion.div>
```

#### 4. Order Confirmation Screen
```tsx
// After successful order submission
<div className="text-center py-12">
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', duration: 0.5 }}
  >
    <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-4" />
  </motion.div>

  <h2 className="text-2xl font-bold mb-2">Pesanan Berhasil!</h2>
  <p className="text-muted-foreground mb-6">
    Terima kasih. Pesanan Anda sedang diproses.
  </p>

  <div className="bg-muted p-6 rounded-lg inline-block mb-6">
    <p className="text-sm text-muted-foreground mb-1">Nomor Pesanan</p>
    <p className="text-3xl font-bold">{orderNumber}</p>
  </div>

  <div className="mb-6">
    <p className="text-sm text-muted-foreground mb-2">Estimasi Waktu</p>
    <p className="text-lg font-medium">~15 menit</p>
  </div>

  <QRCode value={orderTrackingUrl} size={200} className="mx-auto mb-4" />
  <p className="text-sm text-muted-foreground mb-6">
    Scan QR code untuk tracking pesanan
  </p>

  <div className="flex gap-3 justify-center">
    <Button variant="outline" onClick={downloadReceipt}>
      Download Struk
    </Button>
    <Button onClick={trackOrder}>
      Track Pesanan
    </Button>
  </div>
</div>
```

#### 5. Loading States
```tsx
// Menu items skeleton
{isLoading && (
  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <Skeleton key={i} className="h-48 rounded-lg" />
    ))}
  </div>
)}

// Order submission spinner
<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Memproses...
    </>
  ) : (
    'Kirim Pesanan'
  )}
</Button>

// Success animation (confetti)
import confetti from 'canvas-confetti';
confetti({
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 }
});
```

#### 6. Error Handling
```tsx
// Network error
{error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Koneksi Terputus</AlertTitle>
    <AlertDescription>
      Tidak dapat terhubung ke server. Periksa koneksi internet Anda.
      <Button variant="ghost" size="sm" onClick={retry} className="mt-2">
        <RefreshCw className="mr-2 h-4 w-4" />
        Coba Lagi
      </Button>
    </AlertDescription>
  </Alert>
)}

// Offline indicator
{!isOnline && (
  <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 mb-4">
    <p className="text-sm text-yellow-800">
      <WifiOff className="inline h-4 w-4 mr-2" />
      Mode Offline - Beberapa fitur tidak tersedia
    </p>
  </div>
)}
```

#### 7. Accessibility
```tsx
// Larger touch targets (min 44px)
<Button className="min-h-[44px] min-w-[44px]">
  Add to Cart
</Button>

// Screen reader labels
<button aria-label="Add Nasi Goreng to cart">
  <Plus aria-hidden="true" />
</button>

// Keyboard navigation
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleAddToCart();
    }
  }}
>
  {/* Product card */}
</div>

// High contrast mode support
<div className="dark:bg-gray-900 dark:text-white">
  {/* Content */}
</div>
```

**New Components:**
```
src/features/self-order/components/
  product-recommendations.tsx  // Popular & related items
  cart-sticky-footer.tsx       // Fixed bottom cart
  order-confirmation.tsx       // Success screen
  order-tracking-qr.tsx        // QR code for tracking
  product-lightbox.tsx         // Image zoom
```

---

### 5.2 Online Store Customer Storefront

**Tujuan:** Full e-commerce experience untuk customer-facing online store

**Route:** `/store/:slug` (public, no authentication)

**Current State:** Backend API sudah ada (Round 6), frontend admin panel ada, customer storefront belum

**Features:**

#### 1. Store Header
```tsx
<header className="bg-white shadow-sm mb-6">
  <div className="max-w-7xl mx-auto px-4 py-6">
    {/* Banner image */}
    <img
      src={store.bannerUrl}
      alt={store.name}
      className="w-full h-48 object-cover rounded-lg mb-4"
    />

    <div className="flex items-center gap-4">
      {/* Logo */}
      <img
        src={store.logoUrl}
        alt={store.name}
        className="h-16 w-16 rounded-full border-2"
      />

      <div className="flex-1">
        <h1 className="text-2xl font-bold">{store.name}</h1>
        <p className="text-muted-foreground">{store.tagline}</p>

        {/* Social links */}
        <div className="flex gap-3 mt-2">
          {store.instagram && (
            <a href={store.instagram} target="_blank">
              <Instagram className="h-5 w-5" />
            </a>
          )}
          {store.facebook && (
            <a href={store.facebook} target="_blank">
              <Facebook className="h-5 w-5" />
            </a>
          )}
          {store.whatsapp && (
            <a href={`https://wa.me/${store.whatsapp}`} target="_blank">
              <MessageCircle className="h-5 w-5" />
            </a>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="w-64">
        <Input
          placeholder="Cari produk..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Cart button */}
      <Button variant="outline" size="lg" onClick={openCart}>
        <ShoppingCart className="h-5 w-5 mr-2" />
        <Badge>{cartCount}</Badge>
      </Button>
    </div>
  </div>
</header>
```

#### 2. Product Catalog
```tsx
<div className="max-w-7xl mx-auto px-4 grid grid-cols-12 gap-6">
  {/* Category sidebar */}
  <aside className="col-span-3">
    <h3 className="font-semibold mb-3">Kategori</h3>
    <nav className="space-y-1">
      <button
        className={cn(
          "w-full text-left px-3 py-2 rounded-md",
          selectedCategory === 'all' && "bg-primary text-white"
        )}
        onClick={() => setSelectedCategory('all')}
      >
        Semua Produk ({totalProducts})
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          className={cn(
            "w-full text-left px-3 py-2 rounded-md",
            selectedCategory === cat.id && "bg-primary text-white"
          )}
          onClick={() => setSelectedCategory(cat.id)}
        >
          {cat.name} ({cat.productCount})
        </button>
      ))}
    </nav>
  </aside>

  {/* Product grid */}
  <main className="col-span-9">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onQuickAdd={handleQuickAdd}
          onClick={() => openProductDetail(product)}
        />
      ))}
    </div>
  </main>
</div>
```

**ProductCard Component:**
```tsx
<Card className="overflow-hidden hover:shadow-lg transition cursor-pointer">
  <div className="relative">
    <img
      src={product.imageUrl}
      alt={product.name}
      className="w-full h-48 object-cover"
    />

    {!product.inStock && (
      <Badge className="absolute top-2 right-2" variant="secondary">
        Stok Habis
      </Badge>
    )}

    {product.isOnSale && (
      <Badge className="absolute top-2 left-2" variant="destructive">
        Sale {product.discountPercent}%
      </Badge>
    )}
  </div>

  <CardContent className="p-4">
    <h3 className="font-medium mb-1">{product.name}</h3>
    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
      {product.description}
    </p>

    <div className="flex items-center justify-between">
      <div>
        {product.isOnSale ? (
          <>
            <span className="text-lg font-bold text-destructive">
              {formatCurrency(product.salePrice)}
            </span>
            <span className="text-sm text-muted-foreground line-through ml-2">
              {formatCurrency(product.originalPrice)}
            </span>
          </>
        ) : (
          <span className="text-lg font-bold">
            {formatCurrency(product.price)}
          </span>
        )}
      </div>

      <Button
        size="sm"
        disabled={!product.inStock}
        onClick={(e) => {
          e.stopPropagation();
          handleQuickAdd(product);
        }}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  </CardContent>
</Card>
```

#### 3. Product Detail Modal
```tsx
<Dialog open={showDetail} onOpenChange={setShowDetail}>
  <DialogContent className="max-w-4xl">
    <div className="grid md:grid-cols-2 gap-6">
      {/* Image gallery */}
      <div>
        <img
          src={selectedImage}
          alt={product.name}
          className="w-full h-96 object-cover rounded-lg mb-3"
        />
        <div className="grid grid-cols-4 gap-2">
          {product.images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt=""
              className={cn(
                "h-20 object-cover rounded cursor-pointer",
                selectedImage === img && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedImage(img)}
            />
          ))}
        </div>
      </div>

      {/* Product info */}
      <div>
        <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
        <p className="text-muted-foreground mb-4">{product.description}</p>

        <div className="mb-4">
          <span className="text-3xl font-bold text-primary">
            {formatCurrency(product.price)}
          </span>
        </div>

        {/* Variant selector */}
        {product.variants.length > 0 && (
          <div className="mb-4">
            <Label className="mb-2">Pilih Varian</Label>
            <RadioGroup value={selectedVariant} onValueChange={setSelectedVariant}>
              {product.variants.map(v => (
                <div key={v.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={v.id} id={v.id} />
                  <Label htmlFor={v.id}>
                    {v.name} (+{formatCurrency(v.priceAdjustment)})
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Modifier selection */}
        {product.modifierGroups.map(group => (
          <div key={group.id} className="mb-4">
            <Label className="mb-2">{group.name}</Label>
            {group.modifiers.map(mod => (
              <div key={mod.id} className="flex items-center space-x-2">
                <Checkbox
                  id={mod.id}
                  checked={selectedModifiers.includes(mod.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedModifiers([...selectedModifiers, mod.id]);
                    } else {
                      setSelectedModifiers(selectedModifiers.filter(id => id !== mod.id));
                    }
                  }}
                />
                <Label htmlFor={mod.id}>
                  {mod.name} (+{formatCurrency(mod.price)})
                </Label>
              </div>
            ))}
          </div>
        ))}

        {/* Quantity selector */}
        <div className="mb-4">
          <Label className="mb-2">Jumlah</Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-20 text-center"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Add to cart */}
        <Button
          size="lg"
          className="w-full"
          onClick={handleAddToCart}
          disabled={!product.inStock}
        >
          {product.inStock ? (
            <>
              <ShoppingCart className="mr-2 h-5 w-5" />
              Tambah ke Keranjang - {formatCurrency(calculateTotal())}
            </>
          ) : (
            'Stok Habis'
          )}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

#### 4. Shopping Cart Drawer
```tsx
<Sheet open={showCart} onOpenChange={setShowCart}>
  <SheetContent side="right" className="w-full sm:max-w-lg">
    <SheetHeader>
      <SheetTitle>Keranjang Belanja</SheetTitle>
    </SheetHeader>

    <ScrollArea className="h-[calc(100vh-12rem)] mt-4">
      {cartItems.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Keranjang Kosong"
          description="Belum ada produk di keranjang Anda"
        />
      ) : (
        <div className="space-y-4">
          {cartItems.map(item => (
            <div key={item.id} className="flex gap-3 pb-4 border-b">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-16 w-16 object-cover rounded"
              />

              <div className="flex-1">
                <h4 className="font-medium">{item.name}</h4>
                {item.variant && (
                  <p className="text-sm text-muted-foreground">
                    {item.variant}
                  </p>
                )}
                {item.modifiers.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    + {item.modifiers.join(', ')}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => decreaseQuantity(item.id)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium w-8 text-center">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => increaseQuantity(item.id)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <p className="font-semibold">
                    {formatCurrency(item.subtotal)}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>

    {cartItems.length > 0 && (
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pajak (11%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ongkir</span>
            <span>{formatCurrency(shippingFee)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>
        </div>

        <Button size="lg" className="w-full" onClick={proceedToCheckout}>
          Checkout
        </Button>
      </div>
    )}
  </SheetContent>
</Sheet>
```

#### 5. Checkout Flow
```tsx
// Multi-step checkout
<Card>
  <CardHeader>
    <CardTitle>Checkout</CardTitle>
    <div className="flex gap-2 mt-4">
      <StepIndicator active={step === 1} completed={step > 1} number={1}>
        Informasi
      </StepIndicator>
      <StepIndicator active={step === 2} completed={step > 2} number={2}>
        Pengiriman
      </StepIndicator>
      <StepIndicator active={step === 3} completed={step > 3} number={3}>
        Pembayaran
      </StepIndicator>
    </div>
  </CardHeader>

  <CardContent>
    {step === 1 && (
      <form>
        <div className="space-y-4">
          <div>
            <Label>Nama Lengkap *</Label>
            <Input {...register('name')} />
          </div>
          <div>
            <Label>Nomor HP *</Label>
            <Input {...register('phone')} placeholder="08xx-xxxx-xxxx" />
          </div>
          <div>
            <Label>Email</Label>
            <Input {...register('email')} type="email" />
          </div>
        </div>
        <Button className="w-full mt-6" onClick={() => setStep(2)}>
          Lanjutkan
        </Button>
      </form>
    )}

    {step === 2 && (
      <div className="space-y-4">
        <div>
          <Label>Metode Pengiriman *</Label>
          <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod}>
            <div className="flex items-center space-x-2 border p-3 rounded">
              <RadioGroupItem value="delivery" id="delivery" />
              <Label htmlFor="delivery" className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Delivery</p>
                    <p className="text-sm text-muted-foreground">
                      Diantar ke alamat Anda
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(deliveryFee)}</p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 border p-3 rounded">
              <RadioGroupItem value="pickup" id="pickup" />
              <Label htmlFor="pickup" className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Pickup</p>
                    <p className="text-sm text-muted-foreground">
                      Ambil sendiri di toko
                    </p>
                  </div>
                  <p className="font-semibold text-green-600">Gratis</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {deliveryMethod === 'delivery' && (
          <div>
            <Label>Alamat Pengiriman *</Label>
            <Textarea
              {...register('address')}
              placeholder="Jl. Contoh No. 123, RT/RW, Kelurahan, Kecamatan, Kota"
              rows={3}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Pastikan alamat lengkap untuk memudahkan pengiriman
            </p>
          </div>
        )}

        <div>
          <Label>Catatan Pesanan (opsional)</Label>
          <Textarea {...register('notes')} placeholder="Contoh: Jangan pakai cabai" />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(1)}>
            Kembali
          </Button>
          <Button className="flex-1" onClick={() => setStep(3)}>
            Lanjutkan
          </Button>
        </div>
      </div>
    )}

    {step === 3 && (
      <div className="space-y-4">
        <div>
          <Label>Metode Pembayaran *</Label>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="flex items-center space-x-2 border p-3 rounded">
              <RadioGroupItem value="cod" id="cod" />
              <Label htmlFor="cod">
                <p className="font-medium">Cash on Delivery (COD)</p>
                <p className="text-sm text-muted-foreground">
                  Bayar saat menerima pesanan
                </p>
              </Label>
            </div>

            <div className="flex items-center space-x-2 border p-3 rounded">
              <RadioGroupItem value="qris" id="qris" />
              <Label htmlFor="qris">
                <p className="font-medium">QRIS</p>
                <p className="text-sm text-muted-foreground">
                  Scan QR code untuk bayar
                </p>
              </Label>
            </div>

            <div className="flex items-center space-x-2 border p-3 rounded">
              <RadioGroupItem value="ewallet" id="ewallet" />
              <Label htmlFor="ewallet">
                <p className="font-medium">E-Wallet</p>
                <p className="text-sm text-muted-foreground">
                  GoPay, OVO, Dana, LinkAja
                </p>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Card className="bg-muted">
          <CardHeader>
            <CardTitle className="text-base">Ringkasan Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal ({cartItemCount} items)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pajak</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Ongkir</span>
              <span>{formatCurrency(shippingFee)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(2)}>
            Kembali
          </Button>
          <Button
            className="flex-1"
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              `Buat Pesanan - ${formatCurrency(total)}`
            )}
          </Button>
        </div>
      </div>
    )}
  </CardContent>
</Card>
```

#### 6. Order Confirmation
```tsx
<div className="max-w-2xl mx-auto py-12 text-center">
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring' }}
  >
    <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-6" />
  </motion.div>

  <h2 className="text-3xl font-bold mb-2">Pesanan Berhasil!</h2>
  <p className="text-muted-foreground mb-8">
    Terima kasih atas pesanan Anda. Kami akan segera memproses.
  </p>

  <Card className="mb-6">
    <CardContent className="p-6">
      <p className="text-sm text-muted-foreground mb-2">Nomor Pesanan</p>
      <p className="text-4xl font-bold mb-4">{orderNumber}</p>

      <Separator className="my-4" />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground mb-1">Total</p>
          <p className="font-semibold text-lg">{formatCurrency(total)}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Estimasi</p>
          <p className="font-semibold text-lg">
            {deliveryMethod === 'delivery' ? '45-60 menit' : '20 menit'}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>

  {paymentMethod === 'qris' && (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Scan untuk Bayar</CardTitle>
      </CardHeader>
      <CardContent>
        <QRCode value={qrisUrl} size={256} className="mx-auto" />
        <p className="text-sm text-muted-foreground mt-4">
          Total: <span className="font-bold">{formatCurrency(total)}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Scan QR code dengan aplikasi e-wallet atau mobile banking Anda
        </p>
      </CardContent>
    </Card>
  )}

  <div className="flex flex-col sm:flex-row gap-3 justify-center">
    <Button variant="outline" onClick={downloadReceipt}>
      <Download className="mr-2 h-4 w-4" />
      Download Struk
    </Button>
    <Button onClick={() => navigate(`/track/${orderNumber}`)}>
      <MapPin className="mr-2 h-4 w-4" />
      Track Pesanan
    </Button>
    <Button variant="outline" onClick={() => navigate(`/store/${store.slug}`)}>
      Kembali ke Toko
    </Button>
  </div>

  <div className="mt-8 p-4 bg-muted rounded-lg">
    <p className="text-sm text-muted-foreground">
      📱 Notifikasi akan dikirim via WhatsApp ke <strong>{customerPhone}</strong>
    </p>
  </div>
</div>
```

**Backend API (sudah ada dari Round 6):**
```
GET  /online-store/s/:slug/storefront      # Store data + products
GET  /online-store/s/:slug/products/:id    # Product detail
POST /online-store/s/:slug/checkout        # Create order
```

**New Components:**
```
src/features/online-store/
  storefront-page.tsx         # Main storefront (NEW)
  components/
    store-header.tsx          # Header dengan search (NEW)
    product-catalog.tsx       # Product grid (NEW)
    product-detail-modal.tsx  # Product detail (NEW)
    shopping-cart-drawer.tsx  # Cart (NEW)
    checkout-form.tsx         # Multi-step checkout (NEW)
    order-confirmation.tsx    # Thank you page (NEW)
    step-indicator.tsx        # Checkout steps (NEW)
```

---

## Dependencies & Bundle Size

### New Dependencies

```json
{
  "dependencies": {
    "shepherd.js": "^13.0.0",           // 20KB - Product tours
    "react-shepherd": "^9.0.0",         // 5KB  - React wrapper
    "cmdk": "^1.0.0",                   // 5KB  - Command palette (already in shadcn)
    "react-hotkeys-hook": "^4.5.0",     // 3KB  - Keyboard shortcuts
    "framer-motion": "^11.0.0",         // 35KB - Animations (tree-shakable)
    "qrcode.react": "^4.1.0",           // 8KB  - QR code generation
    "react-image-lightbox": "^5.1.4",   // 12KB - Image zoom
    "canvas-confetti": "^1.9.3"         // 7KB  - Success animation
  }
}
```

**Total Added:** ~95KB minified (~35KB gzipped with tree-shaking)

**Bundle Impact:**
- Current bundle: ~250KB (estimated)
- After additions: ~285KB
- Increase: ~14% (acceptable untuk UX gains)

**Optimization:**
- Lazy load tutorial page (code splitting)
- Lazy load lightbox (only when needed)
- Lazy load confetti (only on success)
- Lazy load shepherd (only when tour triggered)
- Tree-shake Framer Motion (only use needed features)

---

## Backend Changes (Minimal)

### 1. Prisma Schema Updates

```prisma
model Employee {
  // Existing fields...

  // New fields
  onboardingCompleted Boolean   @default(false)
  profilePhotoUrl     String?
  preferences         Json?     // { language, timezone, dateFormat, notifications }
  lastLoginAt         DateTime?
  lastLoginIp         String?

  @@map("employees")
}
```

**Migration:**
```bash
cd packages/backend
npx prisma migrate dev --name add_employee_onboarding_and_prefs
```

### 2. New API Endpoints (Optional)

```typescript
// packages/backend/src/modules/auth/auth.controller.ts

@Put('profile')
@UseGuards(JwtAuthGuard)
async updateProfile(
  @CurrentUser() user: JwtPayload,
  @Body() dto: UpdateProfileDto,
) {
  return this.authService.updateProfile(user.employeeId, dto);
}

@Put('change-pin')
@UseGuards(JwtAuthGuard)
async changePin(
  @CurrentUser() user: JwtPayload,
  @Body() dto: ChangePinDto,
) {
  return this.authService.changePin(user.employeeId, dto);
}

@Get('activity')
@UseGuards(JwtAuthGuard)
async getActivity(@CurrentUser() user: JwtPayload) {
  return this.auditService.getEmployeeActivity(user.employeeId, 50);
}
```

**DTOs:**
```typescript
// update-profile.dto.ts
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional()
  preferences?: {
    language?: 'id' | 'en';
    timezone?: string;
    dateFormat?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
  };
}

// change-pin.dto.ts
export class ChangePinDto {
  @IsString()
  @Length(6, 6)
  oldPin: string;

  @IsString()
  @Length(6, 6)
  newPin: string;
}
```

---

## Implementation Phases & Timeline

### Phase 1: Onboarding & Tutorials (Priority: HIGH)
**Effort:** 2-3 days
**Tasks:**
1. Onboarding wizard (4 steps) - 1 day
2. Shepherd.js integration + 5 tours - 1 day
3. Tutorial library page - 1 day

**Deliverables:**
- Wizard auto-shows on first login
- All 5 tours working with localStorage tracking
- Tutorial library with sample videos

**Success Metrics:**
- 80%+ onboarding completion rate
- 60%+ users complete at least 1 tour

---

### Phase 2: User Profile & Account (Priority: HIGH)
**Effort:** 1-2 days
**Tasks:**
1. My Profile page (4 tabs) - 1 day
2. Backend endpoints (profile, PIN) - 0.5 day
3. Enhanced header dropdown - 0.5 day

**Deliverables:**
- Full profile management
- PIN change working
- Profile photo upload

**Success Metrics:**
- 50%+ users update profile within first week
- <5% PIN change errors

---

### Phase 3: Contextual Help (Priority: MEDIUM)
**Effort:** 1-2 days
**Tasks:**
1. HelpTooltip component + 50+ help texts - 1 day
2. Help center page + FAQs - 0.5 day
3. Inline field descriptions - 0.5 day

**Deliverables:**
- All complex forms have tooltips
- Help center with 30+ FAQs
- Field descriptions on settings pages

**Success Metrics:**
- 30% reduction in support tickets
- 70%+ users find help center useful (survey)

---

### Phase 4: Quick Actions (Priority: MEDIUM)
**Effort:** 1-2 days
**Tasks:**
1. Command palette - 0.5 day
2. Global keyboard shortcuts - 0.5 day
3. Breadcrumbs - 0.5 day

**Deliverables:**
- ⌘K command palette working
- 8 global shortcuts
- Breadcrumbs on all pages

**Success Metrics:**
- 20%+ power users use command palette daily
- 10%+ use keyboard shortcuts

---

### Phase 5: Client UX (Priority: MEDIUM)
**Effort:** 2-3 days
**Tasks:**
1. Enhanced self-order (7 improvements) - 1.5 days
2. Online store storefront (6 features) - 1.5 days

**Deliverables:**
- Self-order with sticky cart, recommendations, confirmation screen
- Full e-commerce storefront with checkout flow

**Success Metrics:**
- 15% increase in self-order completion rate
- 25% increase in online store orders

---

### Testing & Polish
**Effort:** 1-2 days
**Tasks:**
1. Cross-browser testing (Chrome, Safari, Firefox)
2. Mobile testing (iOS Safari, Android Chrome)
3. Accessibility audit (WCAG 2.1 AA)
4. Performance testing (Lighthouse)
5. Bug fixes

**Success Criteria:**
- Lighthouse score >90
- Zero accessibility violations
- <1% error rate

---

## Total Timeline: 8-12 Days

**Breakdown:**
- Phase 1: 2-3 days
- Phase 2: 1-2 days
- Phase 3: 1-2 days
- Phase 4: 1-2 days
- Phase 5: 2-3 days
- Testing: 1-2 days

**Recommended Approach:**
- Sprint 1 (Week 1): Phase 1 + Phase 2
- Sprint 2 (Week 2): Phase 3 + Phase 4
- Sprint 3 (Week 3): Phase 5 + Testing

---

## Success Metrics & KPIs

### User Adoption
- **Onboarding completion:** Target 80%+
- **Tour completion:** Target 60%+ for at least 1 tour
- **Profile update rate:** Target 50%+ within first week

### Support Reduction
- **Help center usage:** Target 70%+ find answers
- **Support ticket reduction:** Target 30-40% decrease
- **FAQ search success:** Target 80%+ find relevant results

### Productivity
- **Command palette usage:** Target 20%+ of power users
- **Keyboard shortcuts:** Target 10%+ regular usage
- **Time to complete tasks:** Target 25% faster (POS, products)

### Client Satisfaction
- **Self-order completion:** Target 15% increase
- **Online store conversion:** Target 25% increase
- **Customer satisfaction (NPS):** Target 8+ (out of 10)

### Technical
- **Lighthouse score:** Target >90
- **Error rate:** Target <1%
- **Page load time:** Target <2s

---

## Accessibility (WCAG 2.1 AA)

### Keyboard Navigation
- ✅ All interactive elements keyboard-accessible
- ✅ Focus indicators on all focusable elements
- ✅ Logical tab order
- ✅ Escape to close modals
- ✅ Arrow keys for navigation where appropriate

### Screen Readers
- ✅ ARIA labels on all icon buttons
- ✅ ARIA live regions for dynamic content
- ✅ Semantic HTML (headings, landmarks)
- ✅ Image alt text for all images
- ✅ Form labels properly associated

### Visual
- ✅ Color contrast ratio >4.5:1 (normal text)
- ✅ Color contrast ratio >3:1 (large text, UI components)
- ✅ No information conveyed by color alone
- ✅ Text resizable up to 200%
- ✅ Touch targets min 44x44px

### Testing Tools
- axe DevTools (browser extension)
- WAVE (accessibility evaluator)
- Lighthouse accessibility audit
- Screen reader testing (NVDA, JAWS, VoiceOver)

---

## Mobile Responsiveness

### Breakpoints
- **Mobile:** <640px (1 column layouts)
- **Tablet:** 640-1024px (2 column layouts)
- **Desktop:** >1024px (3-4 column layouts)

### Touch Optimization
- Min 44x44px touch targets
- No hover-dependent UI
- Swipe gestures where appropriate
- Bottom navigation for mobile
- Sticky headers/footers

### Performance
- Lazy load images
- Code splitting per route
- Service worker caching (PWA)
- Offline functionality
- <2s page load on 3G

---

## Security Considerations

### Profile Changes
- ✅ Require old PIN to change PIN
- ✅ Rate limiting (3 attempts/hour)
- ✅ Server-side validation
- ✅ Input sanitization
- ✅ CSRF protection

### File Uploads
- ✅ Max 2MB file size
- ✅ Whitelist MIME types (image/jpeg, image/png)
- ✅ Virus scan (optional)
- ✅ Rename files on server
- ✅ Serve from CDN (not app server)

### Session Management
- ✅ Activity log for audit trail
- ✅ Logout all devices feature
- ✅ Session expiration
- ✅ 2FA support (future)

---

## Performance Optimization

### Bundle Size
- Tree-shake unused code
- Code split by route
- Lazy load heavy components
- Compress images (WebP)
- Minify CSS/JS

### Runtime Performance
- React.memo for expensive renders
- useMemo/useCallback where needed
- Virtualize long lists
- Debounce search inputs
- Optimize re-renders

### Network
- HTTP/2 multiplexing
- Gzip/Brotli compression
- CDN for static assets
- Image optimization (next-gen formats)
- Lazy load images (Intersection Observer)

---

## Future Enhancements (Out of Scope)

### Phase 6 (Future)
- **In-App Chat Support** - Live chat dengan support team
- **Video Call Support** - Screen sharing untuk troubleshooting
- **Community Forum** - User-to-user help
- **Release Notes** - "What's New" modal on updates
- **Feature Voting** - Let users vote on roadmap
- **Gamification** - Badges/achievements untuk completing tours
- **AI Assistant** - Chatbot for common questions
- **Multi-Language** - Full i18n (EN, CN, etc.)
- **Voice Commands** - Voice navigation (accessibility)
- **Dark Mode Auto** - Based on time or system preference

---

## Maintenance & Updates

### Documentation
- Update CLAUDE.md with new features
- Update 07-PROGRESS.md with completion status
- Create user guide (PDF/website)
- Record tutorial videos
- Update API documentation

### Regular Tasks
- Review FAQs quarterly
- Update tutorial videos yearly
- Monitor user feedback
- Track metrics monthly
- Update help content as features change

### Support
- Monitor help center search queries (identify gaps)
- Track command palette usage (popular actions)
- Review tour completion rates
- Analyze drop-off points in onboarding
- Collect user feedback via surveys

---

## Conclusion

Plan ini dirancang untuk **dramatically improve user experience** TiloPOS dengan fokus pada:

1. **Reducing learning curve** via onboarding & tours
2. **Empowering users** via self-service profile & help
3. **Increasing productivity** via command palette & shortcuts
4. **Boosting customer satisfaction** via enhanced client-facing UX

**Expected Outcomes:**
- 40-50% increase in user adoption
- 30-40% reduction in support tickets
- 25% faster task completion
- 15-25% increase in online orders
- Higher user satisfaction (NPS 8+)

**ROI:**
- Development: 8-12 days
- Maintenance: ~2 hours/month
- Support savings: ~20 hours/month
- **Net positive ROI within 2 months**

---

**Status:** Ready for implementation
**Next Steps:** Approval → Phase 1 development → Iterative deployment
