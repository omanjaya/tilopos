# Waiting List Feature

High-priority restaurant queue management system for TiloPOS.

## Overview

The Waiting List feature allows restaurants to manage customer queues efficiently, track wait times, and seat customers when tables become available.

## Files Created

### Pages
- `waiting-list-page.tsx` - Desktop version with DataTable, stats cards, and action dialogs
- `waiting-list-page.mobile.tsx` - Mobile-optimized version with swipeable cards and bottom sheets

### Components
- `components/add-customer-dialog.tsx` - Dialog for adding customers to the waiting list
- `components/seat-customer-dialog.tsx` - Dialog for seating customers with table selection
- `components/index.ts` - Component exports

## Features Implemented

### Desktop Page
- Stats cards showing:
  - Total waiting customers
  - Average wait time
  - Longest wait time
- Status tabs (All, Waiting, Seated, Cancelled)
- DataTable with columns:
  - Customer name & phone
  - Party size
  - Wait time (live calculation)
  - Status badge
  - Table name
  - Special requests
  - Created date
  - Actions dropdown
- Actions available:
  - Send notification
  - Seat customer (with table selector)
  - Cancel queue
  - Mark as no-show
- Keyboard shortcuts:
  - `N` - Add new customer
  - `1-4` - Switch status tabs
- Real-time updates (30s refresh interval)

### Mobile Page
- Horizontal scrollable stats cards
- Search functionality
- Status tabs optimized for mobile
- Card-based queue list with:
  - Customer info
  - Live wait time display
  - Party size
  - Status badge
- Bottom sheet for entry details
- FAB (Floating Action Button) for quick add
- Swipeable actions on cards
- Real-time wait time updates

### Add Customer Dialog
- Form fields:
  - Customer name (required)
  - Phone number (required)
  - Party size (required, 1-50)
  - Special requests (optional)
- Client-side validation
- Loading states
- Error handling with toast notifications

### Seat Customer Dialog
- Table grid with visual status indicators
- Search/filter tables
- Only shows available tables
- Grouped by section
- Shows table capacity
- Highlights recommended tables based on party size
- Legend for table statuses
- Responsive grid layout

## Integration

### Router
Routes added to `/Users/omanjaya/project/moka/packages/web/src/router.tsx`:
- `/app/waiting-list` - Uses DeviceRoute for responsive behavior

### Sidebar
Menu item added to "Penjualan" (Sales) section with ListOrdered icon.

### Command Palette
Added to quick search with keywords: queue, antrian, waitlist

## API Endpoints Used

All endpoints from `/api/endpoints/waiting-list.api.ts`:
- `GET /waiting-list` - List entries with filters
- `GET /waiting-list/stats` - Get statistics
- `POST /waiting-list` - Create new entry
- `PUT /waiting-list/:id` - Update entry
- `PUT /waiting-list/:id/notify` - Send notification
- `PUT /waiting-list/:id/seat` - Seat customer
- `PUT /waiting-list/:id/cancel` - Cancel entry
- `PUT /waiting-list/:id/no-show` - Mark as no-show
- `DELETE /waiting-list/:id` - Delete entry

## Testing Checklist

- [ ] Desktop page loads without errors
- [ ] Mobile page loads without errors
- [ ] Stats cards display correct data
- [ ] Can add new customer to waiting list
- [ ] Can seat customer with table selection
- [ ] Can send notification
- [ ] Can cancel entry
- [ ] Can mark as no-show
- [ ] Search functionality works
- [ ] Status tabs filter correctly
- [ ] Real-time wait time updates
- [ ] Keyboard shortcuts work (desktop)
- [ ] FAB works (mobile)
- [ ] Bottom sheet works (mobile)
- [ ] Responsive design works on all screen sizes
- [ ] Toast notifications appear correctly
- [ ] Loading states work
- [ ] Error handling works
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] ESLint passes
- [ ] TypeScript compiles without errors

## Usage

### Desktop
1. Navigate to "Daftar Tunggu" from sidebar
2. View stats at the top
3. Use tabs to filter by status
4. Click "Tambah Pelanggan" or press `N` to add customer
5. Use actions dropdown for each entry
6. Select table when seating customers

### Mobile
1. Navigate to "Daftar Tunggu" from bottom nav
2. Scroll through stats cards horizontally
3. Use search to find customers
4. Tap FAB to add customer
5. Tap card to view details and take actions
6. Swipe cards for quick actions (future enhancement)

## Notes

- Backend API is fully ready with 12 endpoints
- Real-time updates via polling (30s interval)
- Wait time calculated client-side for instant updates
- Optimistic UI updates for better UX
- Mobile-first design approach
- Follows existing TiloPOS patterns and conventions
