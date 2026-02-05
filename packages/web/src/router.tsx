import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useRouteError, useNavigate } from 'react-router-dom';
import { AuthGuard } from '@/features/auth/auth-guard';
import { RoleGuard } from '@/features/auth/role-guard';
import { AppLayout } from '@/components/layout/app-layout';
import { DeviceRoute } from '@/components/shared/device-route';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

// eslint-disable-next-line react-refresh/only-export-components
function RouteErrorPage() {
  const error = useRouteError() as Error & { status?: number; statusText?: string };
  const navigate = useNavigate();

  const is404 = (error as { status?: number }).status === 404;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <span className="text-3xl">{is404 ? '🔍' : '⚠️'}</span>
        </div>
        <h1 className="mt-4 text-xl font-bold">
          {is404 ? 'Halaman Tidak Ditemukan' : 'Terjadi Kesalahan'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {is404
            ? 'Halaman yang kamu cari tidak tersedia.'
            : 'Aplikasi mengalami error. Silakan coba lagi.'}
        </p>
        {!is404 && error?.message && (
          <p className="mt-2 rounded bg-muted p-2 text-xs text-muted-foreground font-mono break-all">
            {error.message}
          </p>
        )}
        <div className="mt-4 flex justify-center gap-2">
          <button
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => navigate('/app')}
          >
            Ke Dashboard
          </button>
          <button
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            onClick={() => window.location.reload()}
          >
            Muat Ulang
          </button>
        </div>
      </div>
    </div>
  );
}

// Public pages (eager loading for fast initial load)
import { LoginPage } from '@/features/auth/login-page';
import { LandingPage } from '@/pages/landing-page';
import { CustomerSelfOrderPage } from '@/features/self-order/customer-self-order-page';

// Lazy-loaded pages (code splitting for better bundle size)
// Dashboard
const DashboardPage = lazy(() => import('@/features/dashboard/dashboard-page').then(m => ({ default: m.DashboardPage })));
const DashboardPageMobile = lazy(() => import('@/features/dashboard/dashboard-page.mobile').then(m => ({ default: m.DashboardPage })));

// Products
const ProductsPage = lazy(() => import('@/features/products/products-page').then(m => ({ default: m.ProductsPage })));
const ProductsPageMobile = lazy(() => import('@/features/products/products-page.mobile').then(m => ({ default: m.ProductsPage })));
const ProductFormPage = lazy(() => import('@/features/products/product-form-page').then(m => ({ default: m.ProductFormPage })));

// Employees
const EmployeesPage = lazy(() => import('@/features/employees/employees-page').then(m => ({ default: m.EmployeesPage })));
const EmployeeFormPage = lazy(() => import('@/features/employees/employee-form-page').then(m => ({ default: m.EmployeeFormPage })));

// Customers
const CustomersPage = lazy(() => import('@/features/customers/customers-page').then(m => ({ default: m.CustomersPage })));
const CustomersPageMobile = lazy(() => import('@/features/customers/customers-page.mobile').then(m => ({ default: m.CustomersPage })));
const CustomerFormPage = lazy(() => import('@/features/customers/customer-form-page').then(m => ({ default: m.CustomerFormPage })));
const CustomerSegmentsPage = lazy(() => import('@/features/customers/customer-segments-page').then(m => ({ default: m.CustomerSegmentsPage })));

// POS & KDS (critical pages, but lazy loaded)
const POSPage = lazy(() => import('@/features/pos/pos-page').then(m => ({ default: m.POSPage })));
const KDSPage = lazy(() => import('@/features/kds/kds-page').then(m => ({ default: m.KDSPage })));

// Reports
const ReportsPage = lazy(() => import('@/features/reports/reports-page').then(m => ({ default: m.ReportsPage })));
const ReportsPageMobile = lazy(() => import('@/features/reports/reports-page.mobile').then(m => ({ default: m.ReportsPage })));

// Transactions
const TransactionsPage = lazy(() => import('@/features/transactions/transactions-page').then(m => ({ default: m.TransactionsPage })));
const TransactionDetailPage = lazy(() => import('@/features/transactions/transaction-detail-page').then(m => ({ default: m.TransactionDetailPage })));
const SettlementsPage = lazy(() => import('@/features/transactions/settlements-page').then(m => ({ default: m.SettlementsPage })));

// Inventory
const StockPage = lazy(() => import('@/features/inventory/stock-page').then(m => ({ default: m.StockPage })));
const StockPageMobile = lazy(() => import('@/features/inventory/stock-page.mobile').then(m => ({ default: m.StockPage })));
const TransfersPage = lazy(() => import('@/features/inventory/transfers-page').then(m => ({ default: m.TransfersPage })));
const TransferDetailPage = lazy(() => import('@/features/inventory/transfer-detail-page').then(m => ({ default: m.TransferDetailPage })));
const SuppliersPage = lazy(() => import('@/features/inventory/suppliers-page').then(m => ({ default: m.SuppliersPage })));
const PurchaseOrdersPage = lazy(() => import('@/features/inventory/purchase-orders-page').then(m => ({ default: m.PurchaseOrdersPage })));

// Orders & Tables
const OrdersPage = lazy(() => import('@/features/orders/orders-page').then(m => ({ default: m.OrdersPage })));
const OrdersPageMobile = lazy(() => import('@/features/orders/orders-page.mobile').then(m => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('@/features/orders/order-detail-page').then(m => ({ default: m.OrderDetailPage })));
const TablesPage = lazy(() => import('@/features/tables/tables-page').then(m => ({ default: m.TablesPage })));
const TablesPageMobile = lazy(() => import('@/features/tables/tables-page.mobile').then(m => ({ default: m.TablesPage })));

// Waiting List
const WaitingListPage = lazy(() => import('@/features/waiting-list/waiting-list-page').then(m => ({ default: m.WaitingListPage })));
const WaitingListPageMobile = lazy(() => import('@/features/waiting-list/waiting-list-page.mobile').then(m => ({ default: m.WaitingListPage })));

// Shifts
const ShiftsPage = lazy(() => import('@/features/shifts/shifts-page').then(m => ({ default: m.ShiftsPage })));

// Promotions & Loyalty
const PromotionsPage = lazy(() => import('@/features/promotions/promotions-page').then(m => ({ default: m.PromotionsPage })));
const PromotionFormPage = lazy(() => import('@/features/promotions/promotion-form-page').then(m => ({ default: m.PromotionFormPage })));
const LoyaltyPage = lazy(() => import('@/features/promotions/loyalty-page').then(m => ({ default: m.LoyaltyPage })));
const VoucherGeneratorPage = lazy(() => import('@/features/promotions/voucher-generator-page').then(m => ({ default: m.VoucherGeneratorPage })));

// Settings
const BusinessSettingsPage = lazy(() => import('@/features/settings/business-settings-page').then(m => ({ default: m.BusinessSettingsPage })));
const OutletsPage = lazy(() => import('@/features/settings/outlets-page').then(m => ({ default: m.OutletsPage })));
const DevicesPage = lazy(() => import('@/features/settings/devices-page').then(m => ({ default: m.DevicesPage })));
const NotificationsPage = lazy(() => import('@/features/settings/notifications-page').then(m => ({ default: m.NotificationsPage })));
const TaxSettingsPage = lazy(() => import('@/features/settings/tax-settings-page').then(m => ({ default: m.TaxSettingsPage })));
const ReceiptTemplatePage = lazy(() => import('@/features/settings/receipt-template-page').then(m => ({ default: m.ReceiptTemplatePage })));
const OperatingHoursPage = lazy(() => import('@/features/settings/operating-hours-page').then(m => ({ default: m.OperatingHoursPage })));
const ModifierGroupsPage = lazy(() => import('@/features/settings/modifier-groups-page').then(m => ({ default: m.ModifierGroupsPage })));

// Audit
const AuditPage = lazy(() => import('@/features/audit/audit-page').then(m => ({ default: m.AuditPage })));

// Ingredients
const IngredientsPage = lazy(() => import('@/features/ingredients/ingredients-page').then(m => ({ default: m.IngredientsPage })));

// Online Store & Self Order
const OnlineStorePage = lazy(() => import('@/features/online-store/online-store-page').then(m => ({ default: m.OnlineStorePage })));
const SelfOrderPage = lazy(() => import('@/features/self-order/self-order-page').then(m => ({ default: m.SelfOrderPage })));

// Help & Profile
const HelpCenterPage = lazy(() => import('@/features/help/help-center-page').then(m => ({ default: m.HelpCenterPage })));
const TutorialLibraryPage = lazy(() => import('@/features/help/tutorial-library-page').then(m => ({ default: m.TutorialLibraryPage })));
const MyProfilePage = lazy(() => import('@/features/profile/my-profile-page').then(m => ({ default: m.MyProfilePage })));

// Suspense wrapper component for lazy routes
// eslint-disable-next-line react-refresh/only-export-components
function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  // Landing page (public)
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  // Public customer-facing self-order (no auth required)
  {
    path: '/order/:sessionCode',
    element: <CustomerSelfOrderPage />,
  },
  // POS Terminal (fullscreen, no sidebar)
  {
    path: '/pos',
    errorElement: <RouteErrorPage />,
    element: (
      <AuthGuard>
        <LazyRoute>
          <POSPage />
        </LazyRoute>
      </AuthGuard>
    ),
  },
  // KDS Display (fullscreen, no sidebar)
  {
    path: '/kds',
    errorElement: <RouteErrorPage />,
    element: (
      <AuthGuard>
        <LazyRoute>
          <KDSPage />
        </LazyRoute>
      </AuthGuard>
    ),
  },
  // Backoffice (with sidebar layout)
  {
    path: '/app',
    errorElement: <RouteErrorPage />,
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: (
          <LazyRoute>
            <DeviceRoute desktop={DashboardPage} mobile={DashboardPageMobile} />
          </LazyRoute>
        ),
      },
      {
        path: 'products',
        element: (
          <LazyRoute>
            <DeviceRoute desktop={ProductsPage} mobile={ProductsPageMobile} />
          </LazyRoute>
        ),
      },
      {
        path: 'products/new',
        element: (
          <LazyRoute>
            <ProductFormPage />
          </LazyRoute>
        ),
      },
      {
        path: 'products/:id/edit',
        element: (
          <LazyRoute>
            <ProductFormPage />
          </LazyRoute>
        ),
      },
      {
        path: 'employees',
        element: (
          <LazyRoute>
            <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
              <EmployeesPage />
            </RoleGuard>
          </LazyRoute>
        ),
      },
      {
        path: 'employees/new',
        element: (
          <LazyRoute>
            <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
              <EmployeeFormPage />
            </RoleGuard>
          </LazyRoute>
        ),
      },
      {
        path: 'employees/:id/edit',
        element: (
          <LazyRoute>
            <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
              <EmployeeFormPage />
            </RoleGuard>
          </LazyRoute>
        ),
      },
      {
        path: 'customers',
        element: (
          <LazyRoute>
            <DeviceRoute desktop={CustomersPage} mobile={CustomersPageMobile} />
          </LazyRoute>
        ),
      },
      {
        path: 'customers/new',
        element: (
          <LazyRoute>
            <CustomerFormPage />
          </LazyRoute>
        ),
      },
      {
        path: 'customers/:id/edit',
        element: (
          <LazyRoute>
            <CustomerFormPage />
          </LazyRoute>
        ),
      },
      {
        path: 'transactions',
        element: (
          <LazyRoute>
            <TransactionsPage />
          </LazyRoute>
        ),
      },
      {
        path: 'transactions/:id',
        element: (
          <LazyRoute>
            <TransactionDetailPage />
          </LazyRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <LazyRoute>
            <DeviceRoute desktop={ReportsPage} mobile={ReportsPageMobile} />
          </LazyRoute>
        ),
      },
      {
        path: 'inventory/stock',
        element: (
          <LazyRoute>
            <DeviceRoute desktop={StockPage} mobile={StockPageMobile} />
          </LazyRoute>
        ),
      },
      {
        path: 'inventory/transfers',
        element: (
          <LazyRoute>
            <TransfersPage />
          </LazyRoute>
        ),
      },
      {
        path: 'inventory/transfers/:id',
        element: (
          <LazyRoute>
            <TransferDetailPage />
          </LazyRoute>
        ),
      },
      {
        path: 'inventory/suppliers',
        element: (
          <LazyRoute>
            <SuppliersPage />
          </LazyRoute>
        ),
      },
      {
        path: 'inventory/purchase-orders',
        element: (
          <LazyRoute>
            <PurchaseOrdersPage />
          </LazyRoute>
        ),
      },
      {
        path: 'orders',
        element: (
          <LazyRoute>
            <DeviceRoute desktop={OrdersPage} mobile={OrdersPageMobile} />
          </LazyRoute>
        ),
      },
      {
        path: 'orders/:id',
        element: (
          <LazyRoute>
            <OrderDetailPage />
          </LazyRoute>
        ),
      },
      {
        path: 'tables',
        element: (
          <LazyRoute>
            <DeviceRoute desktop={TablesPage} mobile={TablesPageMobile} />
          </LazyRoute>
        ),
      },
      {
        path: 'waiting-list',
        element: (
          <LazyRoute>
            <DeviceRoute desktop={WaitingListPage} mobile={WaitingListPageMobile} />
          </LazyRoute>
        ),
      },
      {
        path: 'shifts',
        element: (
          <LazyRoute>
            <ShiftsPage />
          </LazyRoute>
        ),
      },
      {
        path: 'promotions',
        element: (
          <LazyRoute>
            <PromotionsPage />
          </LazyRoute>
        ),
      },
      {
        path: 'promotions/new',
        element: (
          <LazyRoute>
            <PromotionFormPage />
          </LazyRoute>
        ),
      },
      {
        path: 'promotions/:id/edit',
        element: (
          <LazyRoute>
            <PromotionFormPage />
          </LazyRoute>
        ),
      },
      {
        path: 'loyalty',
        element: (
          <LazyRoute>
            <LoyaltyPage />
          </LazyRoute>
        ),
      },
      {
        path: 'ingredients',
        element: (
          <LazyRoute>
            <IngredientsPage />
          </LazyRoute>
        ),
      },
      {
        path: 'online-store',
        element: (
          <LazyRoute>
            <OnlineStorePage />
          </LazyRoute>
        ),
      },
      {
        path: 'self-order',
        element: (
          <LazyRoute>
            <SelfOrderPage />
          </LazyRoute>
        ),
      },
      {
        path: 'audit',
        element: (
          <LazyRoute>
            <RoleGuard allowedRoles={['owner', 'super_admin']}>
              <AuditPage />
            </RoleGuard>
          </LazyRoute>
        ),
      },
      {
        path: 'settings/business',
        element: (
          <LazyRoute>
            <RoleGuard allowedRoles={['owner', 'super_admin']}>
              <BusinessSettingsPage />
            </RoleGuard>
          </LazyRoute>
        ),
      },
      {
        path: 'settings/outlets',
        element: (
          <LazyRoute>
            <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
              <OutletsPage />
            </RoleGuard>
          </LazyRoute>
        ),
      },
      {
        path: 'settings/devices',
        element: (
          <LazyRoute>
            <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
              <DevicesPage />
            </RoleGuard>
          </LazyRoute>
        ),
      },
      {
        path: 'settings/notifications',
        element: (
          <LazyRoute>
            <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
              <NotificationsPage />
            </RoleGuard>
          </LazyRoute>
        ),
      },
      {
        path: 'settlements',
        element: (
          <LazyRoute>
            <SettlementsPage />
          </LazyRoute>
        ),
      },
      {
        path: 'promotions/vouchers',
        element: (
          <LazyRoute>
            <VoucherGeneratorPage />
          </LazyRoute>
        ),
      },
      {
        path: 'customers/segments',
        element: (
          <LazyRoute>
            <CustomerSegmentsPage />
          </LazyRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <LazyRoute>
            <MyProfilePage />
          </LazyRoute>
        ),
      },
      {
        path: 'help',
        element: (
          <LazyRoute>
            <HelpCenterPage />
          </LazyRoute>
        ),
      },
      {
        path: 'help/tutorials',
        element: (
          <LazyRoute>
            <TutorialLibraryPage />
          </LazyRoute>
        ),
      },
      {
        path: 'settings/tax',
        element: (
          <LazyRoute>
            <RoleGuard allowedRoles={['owner', 'super_admin']}>
              <TaxSettingsPage />
            </RoleGuard>
          </LazyRoute>
        ),
      },
      {
        path: 'settings/receipt',
        element: (
          <LazyRoute>
            <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
              <ReceiptTemplatePage />
            </RoleGuard>
          </LazyRoute>
        ),
      },
      {
        path: 'settings/hours',
        element: (
          <LazyRoute>
            <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
              <OperatingHoursPage />
            </RoleGuard>
          </LazyRoute>
        ),
      },
      {
        path: 'settings/modifiers',
        element: (
          <LazyRoute>
            <ModifierGroupsPage />
          </LazyRoute>
        ),
      },
    ],
  },
  // Catch-all: redirect legacy paths (without /app prefix) to /app/*
  {
    path: '*',
    element: <Navigate to="/app" replace />,
  },
]);
