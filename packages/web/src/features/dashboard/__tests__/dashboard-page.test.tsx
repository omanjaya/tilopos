import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../dashboard-page';

// ---- Mock API modules ----

const { mockDashboardSummary, mockDashboardItems, mockOutletComparison, currentRole } = vi.hoisted(() => ({
  currentRole: { value: 'owner' },
  mockDashboardSummary: {
    grossSales: 15000000,
    netSales: 14000000,
    grossProfit: 6000000,
    transactions: 120,
    averageSalePerTransaction: 125000,
    grossMargin: 40,
    salesByDayOfWeek: [],
    salesByHour: [],
  },
  mockDashboardItems: {
    topItems: [],
    lowItems: [],
  },
  mockOutletComparison: {
    outlets: [],
  },
}));

vi.mock('@/api/endpoints/reports.api', () => ({
  reportsApi: {
    dashboardSummary: vi.fn().mockResolvedValue(mockDashboardSummary),
    dashboardItems: vi.fn().mockResolvedValue(mockDashboardItems),
    outletComparison: vi.fn().mockResolvedValue(mockOutletComparison),
  },
}));

vi.mock('@/stores/ui.store', () => ({
  useUIStore: vi.fn((selector: (state: { selectedOutletId: string }) => unknown) =>
    selector({ selectedOutletId: 'outlet-1' }),
  ),
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn((selector: (state: { user: { outletId: string; name: string; outletName: string; role: string } }) => unknown) =>
    selector({
      user: { outletId: 'outlet-1', name: 'Admin', outletName: 'Outlet Utama', role: currentRole.value },
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
    currentRole.value = 'owner';
  });

  it('shows a no-access landing instead of Rp 0 KPIs for roles without report access', async () => {
    currentRole.value = 'cashier';
    renderDashboard();

    expect(screen.getByText(/Ringkasan penjualan hanya tersedia/)).toBeInTheDocument();
    expect(screen.getByText('Buka Kasir (POS)')).toBeInTheDocument();
    expect(screen.queryByText('Penjualan Kotor')).not.toBeInTheDocument();
    const { reportsApi } = await import('@/api/endpoints/reports.api');
    expect(reportsApi.dashboardSummary).not.toHaveBeenCalled();
  });

  it('renders an error state (not zero KPIs) when the summary query fails', async () => {
    const { reportsApi } = await import('@/api/endpoints/reports.api');
    vi.mocked(reportsApi.dashboardSummary).mockRejectedValueOnce(new Error('403 Forbidden'));
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Gagal memuat ringkasan penjualan')).toBeInTheDocument();
    });
    expect(screen.queryByText('Penjualan Kotor')).not.toBeInTheDocument();
  });

  it('renders metric cards with loaded data', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Penjualan Kotor')).toBeInTheDocument();
    });

    expect(screen.getByText('Penjualan Bersih')).toBeInTheDocument();
    expect(screen.getByText('Laba Kotor')).toBeInTheDocument();
    expect(screen.getByText('Transaksi')).toBeInTheDocument();
    expect(screen.getByText('Rata-rata / Transaksi')).toBeInTheDocument();
    expect(screen.getByText('Margin Kotor')).toBeInTheDocument();
  });

  it('shows loading state with skeleton cards', () => {
    // By default, React Query fires the queries asynchronously, so
    // immediately after render we should see loading skeletons.
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          // Disable queries so we see the loading state
          enabled: false,
        },
      },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Should render skeleton elements (DashboardSkeleton contains multiple bg-muted elements)
    const skeletons = container.querySelectorAll('.bg-muted');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('allows switching between tabs', async () => {
    const user = userEvent.setup();
    renderDashboard();

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Tabs should be present
    const dashboardTab = screen.getByRole('tab', { name: 'Dashboard' });
    const outletComparisonTab = screen.getByRole('tab', { name: 'Perbandingan Outlet' });

    expect(dashboardTab).toBeInTheDocument();
    expect(outletComparisonTab).toBeInTheDocument();

    // Click on "Perbandingan Outlet" tab
    await user.click(outletComparisonTab);

    // The page should still be rendered after tab switch
    expect(screen.getByRole('tab', { name: 'Perbandingan Outlet' })).toBeInTheDocument();
  });
});
