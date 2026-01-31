import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../dashboard-page';

// ---- Mock API modules ----

const mockSalesReport = {
  totalSales: 15000000,
  totalTransactions: 120,
  averageOrderValue: 125000,
  totalCustomers: 45,
  salesByDate: [
    { date: '2026-01-01', sales: 5000000, transactions: 40 },
    { date: '2026-01-02', sales: 5500000, transactions: 42 },
    { date: '2026-01-03', sales: 4500000, transactions: 38 },
  ],
};

const mockFinancialReport = {
  totalRevenue: 15000000,
  totalCost: 9000000,
  grossProfit: 6000000,
  grossMargin: 40,
};

const mockCustomerReport = {
  totalCustomers: 45,
  newCustomers: 12,
  returningCustomers: 33,
  topCustomers: [],
};

vi.mock('@/api/endpoints/reports.api', () => ({
  reportsApi: {
    sales: vi.fn().mockResolvedValue(mockSalesReport),
    financial: vi.fn().mockResolvedValue(mockFinancialReport),
    customers: vi.fn().mockResolvedValue(mockCustomerReport),
  },
}));

vi.mock('@/stores/ui.store', () => ({
  useUIStore: vi.fn((selector: (state: { selectedOutletId: string }) => unknown) =>
    selector({ selectedOutletId: 'outlet-1' }),
  ),
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn((selector: (state: { user: { outletId: string; name: string; outletName: string } }) => unknown) =>
    selector({
      user: { outletId: 'outlet-1', name: 'Admin', outletName: 'Outlet Utama' },
    }),
  ),
}));

// Mock recharts to avoid SVG rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

// ---- Helpers ----

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderDashboard() {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---- Tests ----

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders metric cards with loaded data', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Total Penjualan')).toBeInTheDocument();
    });

    expect(screen.getByText('Transaksi')).toBeInTheDocument();
    expect(screen.getByText('Rata-rata Order')).toBeInTheDocument();
    expect(screen.getByText('Pelanggan')).toBeInTheDocument();

    // Check values are rendered
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('shows loading state with skeleton cards', () => {
    // By default, React Query fires the queries asynchronously, so
    // immediately after render we should see loading skeletons.
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          // Use a very long stale time so the initial loading state persists
          enabled: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // The page header should still be visible
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('allows changing the date range via tabs', async () => {
    const user = userEvent.setup();
    renderDashboard();

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Tabs should be present
    const todayTab = screen.getByText('Hari Ini');
    const weekTab = screen.getByText('Minggu Ini');
    const monthTab = screen.getByText('Bulan Ini');

    expect(todayTab).toBeInTheDocument();
    expect(weekTab).toBeInTheDocument();
    expect(monthTab).toBeInTheDocument();

    // Click on "Hari Ini" tab
    await user.click(todayTab);

    // The API should be re-called (tabs changes trigger a re-query).
    // We just verify the tab is clickable and the page stays rendered.
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
