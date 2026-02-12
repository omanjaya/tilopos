import { Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/features/auth/role-guard';
import { FeatureGuard } from '@/components/shared/feature-guard';
import { SettingsLayout } from '@/components/layout/settings-layout';
import { DeviceRoute } from '@/components/shared/device-route';
import { LazyRoute } from './shared';
import { settingsRoutes } from './settings-routes';
import {
  DashboardPage, DashboardPageMobile, OwnerDashboardPage,
  ProductsPage, ProductsPageMobile, ProductFormPage,
  EmployeesPage, EmployeeFormPage,
  CustomersPage, CustomersPageMobile, CustomerFormPage, CustomerSegmentsPage,
  InvoicePage,
  TransactionsPage, TransactionDetailPage, SettlementsPage,
  ReportsPage, ReportsPageMobile, SalesReportPage, SalesReportPageMobile,
  StockPage, StockPageMobile, TransfersPage, TransferDetailPage, TransfersDashboardPage,
  SuppliersPage, PurchaseOrdersPage, PriceTiersPage,
  UnitConversionPage, BatchTrackingPage, SerialNumbersPage,
  ProductAssignmentPage,
  OrdersPage, OrdersPageMobile, OrderDetailPage,
  TablesPage, TablesPageMobile,
  WaitingListPage, WaitingListPageMobile,
  ShiftsPage,
  PromotionsPage, PromotionFormPage, LoyaltyPage, VoucherGeneratorPage,
  ExcelImportPage,
  CreditSalesPage,
  AuditPage, IngredientsPage,
  OnlineStorePage, SelfOrderPage,
  AppointmentsPage, WorkOrdersPage, ItemTrackingPage,
  HelpCenterPage, TutorialLibraryPage, MyProfilePage,
} from './lazy-imports';

/** Shorthand: wrap element with FeatureGuard for a specific path */
function FG({ path, children }: { path: string; children: React.ReactNode }) {
  return <FeatureGuard path={path}>{children}</FeatureGuard>;
}

export const appRoutes: RouteObject[] = [
  // Dashboard
  {
    index: true,
    element: <LazyRoute><DeviceRoute desktop={DashboardPage} mobile={DashboardPageMobile} /></LazyRoute>,
  },
  // Owner Dashboard
  {
    path: 'dashboard/owner',
    element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin']}><OwnerDashboardPage /></RoleGuard></LazyRoute>,
  },

  // Products (always visible)
  { path: 'products', element: <LazyRoute><DeviceRoute desktop={ProductsPage} mobile={ProductsPageMobile} /></LazyRoute> },
  { path: 'products/new', element: <LazyRoute><ProductFormPage /></LazyRoute> },
  { path: 'products/:id/edit', element: <LazyRoute><ProductFormPage /></LazyRoute> },
  { path: 'ingredients', element: <LazyRoute><FG path="/app/ingredients"><IngredientsPage /></FG></LazyRoute> },

  // Employees
  { path: 'employees', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}><EmployeesPage /></RoleGuard></LazyRoute> },
  { path: 'employees/new', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}><EmployeeFormPage /></RoleGuard></LazyRoute> },
  { path: 'employees/:id/edit', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}><EmployeeFormPage /></RoleGuard></LazyRoute> },

  // Customers
  { path: 'customers', element: <LazyRoute><DeviceRoute desktop={CustomersPage} mobile={CustomersPageMobile} /></LazyRoute> },
  { path: 'customers/new', element: <LazyRoute><CustomerFormPage /></LazyRoute> },
  { path: 'customers/:id/edit', element: <LazyRoute><CustomerFormPage /></LazyRoute> },
  { path: 'customers/segments', element: <LazyRoute><FG path="/app/customers/segments"><CustomerSegmentsPage /></FG></LazyRoute> },

  // Transactions (always visible)
  { path: 'transactions', element: <LazyRoute><TransactionsPage /></LazyRoute> },
  { path: 'transactions/:id', element: <LazyRoute><TransactionDetailPage /></LazyRoute> },
  { path: 'settlements', element: <LazyRoute><SettlementsPage /></LazyRoute> },

  // Invoices
  { path: 'invoices', element: <LazyRoute><InvoicePage /></LazyRoute> },

  // Credit Sales / BON
  { path: 'credit-sales', element: <LazyRoute><FG path="/app/credit-sales"><CreditSalesPage /></FG></LazyRoute> },

  // Reports (always visible)
  { path: 'reports', element: <LazyRoute><DeviceRoute desktop={ReportsPage} mobile={ReportsPageMobile} /></LazyRoute> },
  { path: 'reports/sales', element: <LazyRoute><DeviceRoute desktop={SalesReportPage} mobile={SalesReportPageMobile} /></LazyRoute> },

  // Inventory
  { path: 'inventory/stock', element: <LazyRoute><FG path="/app/inventory/stock"><DeviceRoute desktop={StockPage} mobile={StockPageMobile} /></FG></LazyRoute> },
  { path: 'inventory/transfers', element: <LazyRoute><FG path="/app/inventory/transfers"><TransfersPage /></FG></LazyRoute> },
  { path: 'inventory/transfers/dashboard', element: <LazyRoute><FG path="/app/inventory/transfers"><TransfersDashboardPage /></FG></LazyRoute> },
  { path: 'inventory/transfers/:id', element: <LazyRoute><FG path="/app/inventory/transfers"><TransferDetailPage /></FG></LazyRoute> },
  { path: 'inventory/suppliers', element: <LazyRoute><FG path="/app/inventory/suppliers"><SuppliersPage /></FG></LazyRoute> },
  { path: 'inventory/purchase-orders', element: <LazyRoute><FG path="/app/inventory/purchase-orders"><PurchaseOrdersPage /></FG></LazyRoute> },
  { path: 'inventory/price-tiers', element: <LazyRoute><FG path="/app/inventory/price-tiers"><PriceTiersPage /></FG></LazyRoute> },
  { path: 'inventory/unit-conversion', element: <LazyRoute><FG path="/app/inventory/unit-conversion"><UnitConversionPage /></FG></LazyRoute> },
  { path: 'inventory/batch-tracking', element: <LazyRoute><FG path="/app/inventory/batch-tracking"><BatchTrackingPage /></FG></LazyRoute> },
  { path: 'inventory/serial-numbers', element: <LazyRoute><FG path="/app/inventory/serial-numbers"><SerialNumbersPage /></FG></LazyRoute> },
  { path: 'inventory/product-assignment', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}><ProductAssignmentPage /></RoleGuard></LazyRoute> },

  // Import
  { path: 'import', element: <LazyRoute><ExcelImportPage /></LazyRoute> },

  // Orders & Tables
  { path: 'orders', element: <LazyRoute><FG path="/app/orders"><DeviceRoute desktop={OrdersPage} mobile={OrdersPageMobile} /></FG></LazyRoute> },
  { path: 'orders/:id', element: <LazyRoute><FG path="/app/orders"><OrderDetailPage /></FG></LazyRoute> },
  { path: 'tables', element: <LazyRoute><FG path="/app/tables"><DeviceRoute desktop={TablesPage} mobile={TablesPageMobile} /></FG></LazyRoute> },
  { path: 'waiting-list', element: <LazyRoute><FG path="/app/waiting-list"><DeviceRoute desktop={WaitingListPage} mobile={WaitingListPageMobile} /></FG></LazyRoute> },
  { path: 'shifts', element: <LazyRoute><ShiftsPage /></LazyRoute> },

  // Promotions & Loyalty
  { path: 'promotions', element: <LazyRoute><FG path="/app/promotions"><PromotionsPage /></FG></LazyRoute> },
  { path: 'promotions/new', element: <LazyRoute><FG path="/app/promotions"><PromotionFormPage /></FG></LazyRoute> },
  { path: 'promotions/:id/edit', element: <LazyRoute><FG path="/app/promotions"><PromotionFormPage /></FG></LazyRoute> },
  { path: 'promotions/vouchers', element: <LazyRoute><FG path="/app/promotions/vouchers"><VoucherGeneratorPage /></FG></LazyRoute> },
  { path: 'loyalty', element: <LazyRoute><FG path="/app/loyalty"><LoyaltyPage /></FG></LazyRoute> },

  // Online & Self-order
  { path: 'online-store', element: <LazyRoute><FG path="/app/online-store"><OnlineStorePage /></FG></LazyRoute> },
  { path: 'self-order', element: <LazyRoute><FG path="/app/self-order"><SelfOrderPage /></FG></LazyRoute> },

  // Service business
  { path: 'appointments', element: <LazyRoute><FG path="/app/appointments"><AppointmentsPage /></FG></LazyRoute> },
  { path: 'work-orders', element: <LazyRoute><FG path="/app/work-orders"><WorkOrdersPage /></FG></LazyRoute> },
  { path: 'item-tracking', element: <LazyRoute><FG path="/app/item-tracking"><ItemTrackingPage /></FG></LazyRoute> },

  // Audit
  { path: 'audit', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin']}><FG path="/app/audit"><AuditPage /></FG></RoleGuard></LazyRoute> },

  // Profile & Help (always visible)
  { path: 'profile', element: <LazyRoute><MyProfilePage /></LazyRoute> },
  { path: 'help', element: <LazyRoute><HelpCenterPage /></LazyRoute> },
  { path: 'help/tutorials', element: <LazyRoute><TutorialLibraryPage /></LazyRoute> },

  // Settings (nested layout)
  {
    path: 'settings',
    element: <RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}><SettingsLayout /></RoleGuard>,
    children: [
      { index: true, element: <Navigate to="/app/settings/business" replace /> },
      ...settingsRoutes,
    ],
  },
];
