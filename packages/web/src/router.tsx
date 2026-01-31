import { createBrowserRouter, Navigate, useRouteError, useNavigate } from 'react-router-dom';
import { AuthGuard } from '@/features/auth/auth-guard';
import { RoleGuard } from '@/features/auth/role-guard';
import { AppLayout } from '@/components/layout/app-layout';

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
import { LoginPage } from '@/features/auth/login-page';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { ProductsPage } from '@/features/products/products-page';
import { ProductFormPage } from '@/features/products/product-form-page';
import { EmployeesPage } from '@/features/employees/employees-page';
import { EmployeeFormPage } from '@/features/employees/employee-form-page';
import { CustomersPage } from '@/features/customers/customers-page';
import { CustomerFormPage } from '@/features/customers/customer-form-page';
import { POSPage } from '@/features/pos/pos-page';
import { ReportsPage } from '@/features/reports/reports-page';
import { TransactionsPage } from '@/features/transactions/transactions-page';
import { TransactionDetailPage } from '@/features/transactions/transaction-detail-page';
import { StockPage } from '@/features/inventory/stock-page';
import { TransfersPage } from '@/features/inventory/transfers-page';
import { TransferDetailPage } from '@/features/inventory/transfer-detail-page';
import { SuppliersPage } from '@/features/inventory/suppliers-page';
import { PurchaseOrdersPage } from '@/features/inventory/purchase-orders-page';
import { OrdersPage } from '@/features/orders/orders-page';
import { OrderDetailPage } from '@/features/orders/order-detail-page';
import { TablesPage } from '@/features/tables/tables-page';
import { ShiftsPage } from '@/features/shifts/shifts-page';
import { PromotionsPage } from '@/features/promotions/promotions-page';
import { PromotionFormPage } from '@/features/promotions/promotion-form-page';
import { LoyaltyPage } from '@/features/promotions/loyalty-page';
import { BusinessSettingsPage } from '@/features/settings/business-settings-page';
import { OutletsPage } from '@/features/settings/outlets-page';
import { DevicesPage } from '@/features/settings/devices-page';
import { NotificationsPage } from '@/features/settings/notifications-page';
import { KDSPage } from '@/features/kds/kds-page';
import { AuditPage } from '@/features/audit/audit-page';
import { IngredientsPage } from '@/features/ingredients/ingredients-page';
import { OnlineStorePage } from '@/features/online-store/online-store-page';
import { SelfOrderPage } from '@/features/self-order/self-order-page';
import { CustomerSelfOrderPage } from '@/features/self-order/customer-self-order-page';
import { TaxSettingsPage } from '@/features/settings/tax-settings-page';
import { ReceiptTemplatePage } from '@/features/settings/receipt-template-page';
import { OperatingHoursPage } from '@/features/settings/operating-hours-page';
import { ModifierGroupsPage } from '@/features/settings/modifier-groups-page';
import { SettlementsPage } from '@/features/transactions/settlements-page';
import { VoucherGeneratorPage } from '@/features/promotions/voucher-generator-page';
import { CustomerSegmentsPage } from '@/features/customers/customer-segments-page';
import { LandingPage } from '@/pages/landing-page';

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
        <POSPage />
      </AuthGuard>
    ),
  },
  // KDS Display (fullscreen, no sidebar)
  {
    path: '/kds',
    errorElement: <RouteErrorPage />,
    element: (
      <AuthGuard>
        <KDSPage />
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
      { index: true, element: <DashboardPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'products/new', element: <ProductFormPage /> },
      { path: 'products/:id/edit', element: <ProductFormPage /> },
      {
        path: 'employees',
        element: (
          <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
            <EmployeesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'employees/new',
        element: (
          <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
            <EmployeeFormPage />
          </RoleGuard>
        ),
      },
      {
        path: 'employees/:id/edit',
        element: (
          <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
            <EmployeeFormPage />
          </RoleGuard>
        ),
      },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'customers/new', element: <CustomerFormPage /> },
      { path: 'customers/:id/edit', element: <CustomerFormPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'transactions/:id', element: <TransactionDetailPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'inventory/stock', element: <StockPage /> },
      { path: 'inventory/transfers', element: <TransfersPage /> },
      { path: 'inventory/transfers/:id', element: <TransferDetailPage /> },
      { path: 'inventory/suppliers', element: <SuppliersPage /> },
      { path: 'inventory/purchase-orders', element: <PurchaseOrdersPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
      { path: 'tables', element: <TablesPage /> },
      { path: 'shifts', element: <ShiftsPage /> },
      { path: 'promotions', element: <PromotionsPage /> },
      { path: 'promotions/new', element: <PromotionFormPage /> },
      { path: 'promotions/:id/edit', element: <PromotionFormPage /> },
      { path: 'loyalty', element: <LoyaltyPage /> },
      { path: 'ingredients', element: <IngredientsPage /> },
      { path: 'online-store', element: <OnlineStorePage /> },
      { path: 'self-order', element: <SelfOrderPage /> },
      {
        path: 'audit',
        element: (
          <RoleGuard allowedRoles={['owner', 'super_admin']}>
            <AuditPage />
          </RoleGuard>
        ),
      },
      {
        path: 'settings/business',
        element: (
          <RoleGuard allowedRoles={['owner', 'super_admin']}>
            <BusinessSettingsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'settings/outlets',
        element: (
          <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
            <OutletsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'settings/devices',
        element: (
          <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
            <DevicesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'settings/notifications',
        element: (
          <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
            <NotificationsPage />
          </RoleGuard>
        ),
      },
      { path: 'settlements', element: <SettlementsPage /> },
      { path: 'promotions/vouchers', element: <VoucherGeneratorPage /> },
      { path: 'customers/segments', element: <CustomerSegmentsPage /> },
      {
        path: 'settings/tax',
        element: (
          <RoleGuard allowedRoles={['owner', 'super_admin']}>
            <TaxSettingsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'settings/receipt',
        element: (
          <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
            <ReceiptTemplatePage />
          </RoleGuard>
        ),
      },
      {
        path: 'settings/hours',
        element: (
          <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}>
            <OperatingHoursPage />
          </RoleGuard>
        ),
      },
      { path: 'settings/modifiers', element: <ModifierGroupsPage /> },
    ],
  },
  // Catch-all: redirect legacy paths (without /app prefix) to /app/*
  {
    path: '*',
    element: <Navigate to="/app" replace />,
  },
]);
