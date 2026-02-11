import { Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/features/auth/role-guard';
import { SettingsLayout } from '@/components/layout/settings-layout';
import { DeviceRoute } from '@/components/shared/device-route';
import { LazyRoute } from './shared';
import { settingsRoutes } from './settings-routes';
import {
  DashboardPage, DashboardPageMobile,
  ProductsPage, ProductsPageMobile, ProductFormPage,
  EmployeesPage, EmployeeFormPage,
  CustomersPage, CustomersPageMobile, CustomerFormPage, CustomerSegmentsPage,
  TransactionsPage, TransactionDetailPage, SettlementsPage,
  ReportsPage, ReportsPageMobile,
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

export const appRoutes: RouteObject[] = [
  // Dashboard
  {
    index: true,
    element: <LazyRoute><DeviceRoute desktop={DashboardPage} mobile={DashboardPageMobile} /></LazyRoute>,
  },

  // Products
  { path: 'products', element: <LazyRoute><DeviceRoute desktop={ProductsPage} mobile={ProductsPageMobile} /></LazyRoute> },
  { path: 'products/new', element: <LazyRoute><ProductFormPage /></LazyRoute> },
  { path: 'products/:id/edit', element: <LazyRoute><ProductFormPage /></LazyRoute> },
  { path: 'ingredients', element: <LazyRoute><IngredientsPage /></LazyRoute> },

  // Employees
  { path: 'employees', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}><EmployeesPage /></RoleGuard></LazyRoute> },
  { path: 'employees/new', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}><EmployeeFormPage /></RoleGuard></LazyRoute> },
  { path: 'employees/:id/edit', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}><EmployeeFormPage /></RoleGuard></LazyRoute> },

  // Customers
  { path: 'customers', element: <LazyRoute><DeviceRoute desktop={CustomersPage} mobile={CustomersPageMobile} /></LazyRoute> },
  { path: 'customers/new', element: <LazyRoute><CustomerFormPage /></LazyRoute> },
  { path: 'customers/:id/edit', element: <LazyRoute><CustomerFormPage /></LazyRoute> },
  { path: 'customers/segments', element: <LazyRoute><CustomerSegmentsPage /></LazyRoute> },

  // Transactions
  { path: 'transactions', element: <LazyRoute><TransactionsPage /></LazyRoute> },
  { path: 'transactions/:id', element: <LazyRoute><TransactionDetailPage /></LazyRoute> },
  { path: 'settlements', element: <LazyRoute><SettlementsPage /></LazyRoute> },

  // Credit Sales / BON
  { path: 'credit-sales', element: <LazyRoute><CreditSalesPage /></LazyRoute> },

  // Reports
  { path: 'reports', element: <LazyRoute><DeviceRoute desktop={ReportsPage} mobile={ReportsPageMobile} /></LazyRoute> },

  // Inventory
  { path: 'inventory/stock', element: <LazyRoute><DeviceRoute desktop={StockPage} mobile={StockPageMobile} /></LazyRoute> },
  { path: 'inventory/transfers', element: <LazyRoute><TransfersPage /></LazyRoute> },
  { path: 'inventory/transfers/dashboard', element: <LazyRoute><TransfersDashboardPage /></LazyRoute> },
  { path: 'inventory/transfers/:id', element: <LazyRoute><TransferDetailPage /></LazyRoute> },
  { path: 'inventory/suppliers', element: <LazyRoute><SuppliersPage /></LazyRoute> },
  { path: 'inventory/purchase-orders', element: <LazyRoute><PurchaseOrdersPage /></LazyRoute> },
  { path: 'inventory/price-tiers', element: <LazyRoute><PriceTiersPage /></LazyRoute> },
  { path: 'inventory/unit-conversion', element: <LazyRoute><UnitConversionPage /></LazyRoute> },
  { path: 'inventory/batch-tracking', element: <LazyRoute><BatchTrackingPage /></LazyRoute> },
  { path: 'inventory/serial-numbers', element: <LazyRoute><SerialNumbersPage /></LazyRoute> },
  { path: 'inventory/product-assignment', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin', 'manager']}><ProductAssignmentPage /></RoleGuard></LazyRoute> },

  // Import
  { path: 'import', element: <LazyRoute><ExcelImportPage /></LazyRoute> },

  // Orders & Tables
  { path: 'orders', element: <LazyRoute><DeviceRoute desktop={OrdersPage} mobile={OrdersPageMobile} /></LazyRoute> },
  { path: 'orders/:id', element: <LazyRoute><OrderDetailPage /></LazyRoute> },
  { path: 'tables', element: <LazyRoute><DeviceRoute desktop={TablesPage} mobile={TablesPageMobile} /></LazyRoute> },
  { path: 'waiting-list', element: <LazyRoute><DeviceRoute desktop={WaitingListPage} mobile={WaitingListPageMobile} /></LazyRoute> },
  { path: 'shifts', element: <LazyRoute><ShiftsPage /></LazyRoute> },

  // Promotions & Loyalty
  { path: 'promotions', element: <LazyRoute><PromotionsPage /></LazyRoute> },
  { path: 'promotions/new', element: <LazyRoute><PromotionFormPage /></LazyRoute> },
  { path: 'promotions/:id/edit', element: <LazyRoute><PromotionFormPage /></LazyRoute> },
  { path: 'promotions/vouchers', element: <LazyRoute><VoucherGeneratorPage /></LazyRoute> },
  { path: 'loyalty', element: <LazyRoute><LoyaltyPage /></LazyRoute> },

  // Online & Self-order
  { path: 'online-store', element: <LazyRoute><OnlineStorePage /></LazyRoute> },
  { path: 'self-order', element: <LazyRoute><SelfOrderPage /></LazyRoute> },

  // Service business
  { path: 'appointments', element: <LazyRoute><AppointmentsPage /></LazyRoute> },
  { path: 'work-orders', element: <LazyRoute><WorkOrdersPage /></LazyRoute> },
  { path: 'item-tracking', element: <LazyRoute><ItemTrackingPage /></LazyRoute> },

  // Audit
  { path: 'audit', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin']}><AuditPage /></RoleGuard></LazyRoute> },

  // Profile & Help
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
