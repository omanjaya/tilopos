import { lazy } from 'react';

// ── Dashboard ────────────────────────────────────────────────────────────────
export const DashboardPage = lazy(() => import('@/features/dashboard/dashboard-page').then(m => ({ default: m.DashboardPage })));
export const DashboardPageMobile = lazy(() => import('@/features/dashboard/dashboard-page.mobile').then(m => ({ default: m.DashboardPage })));
export const OwnerDashboardPage = lazy(() => import('@/features/dashboard/owner-dashboard-page').then(m => ({ default: m.OwnerDashboardPage })));

// ── Products ─────────────────────────────────────────────────────────────────
export const ProductsPage = lazy(() => import('@/features/products/products-page').then(m => ({ default: m.ProductsPage })));
export const ProductsPageMobile = lazy(() => import('@/features/products/products-page.mobile').then(m => ({ default: m.ProductsPage })));
export const ProductFormPage = lazy(() => import('@/features/products/product-form-page').then(m => ({ default: m.ProductFormPage })));

// ── Employees ────────────────────────────────────────────────────────────────
export const EmployeesPage = lazy(() => import('@/features/employees/employees-page').then(m => ({ default: m.EmployeesPage })));
export const EmployeeFormPage = lazy(() => import('@/features/employees/employee-form-page').then(m => ({ default: m.EmployeeFormPage })));

// ── Customers ────────────────────────────────────────────────────────────────
export const CustomersPage = lazy(() => import('@/features/customers/customers-page').then(m => ({ default: m.CustomersPage })));
export const CustomersPageMobile = lazy(() => import('@/features/customers/customers-page.mobile').then(m => ({ default: m.CustomersPage })));
export const CustomerFormPage = lazy(() => import('@/features/customers/customer-form-page').then(m => ({ default: m.CustomerFormPage })));
export const CustomerSegmentsPage = lazy(() => import('@/features/customers/customer-segments-page').then(m => ({ default: m.CustomerSegmentsPage })));

// ── POS & KDS ────────────────────────────────────────────────────────────────
export const POSPage = lazy(() => import('@/features/pos/pos-page').then(m => ({ default: m.POSPage })));
export const KDSPage = lazy(() => import('@/features/kds/kds-page').then(m => ({ default: m.KDSPage })));

// ── Reports ──────────────────────────────────────────────────────────────────
export const ReportsPage = lazy(() => import('@/features/reports/reports-page').then(m => ({ default: m.ReportsPage })));
export const ReportsPageMobile = lazy(() => import('@/features/reports/reports-page.mobile').then(m => ({ default: m.ReportsPage })));
export const SalesReportPage = lazy(() => import('@/features/reports/sales-report-page').then(m => ({ default: m.SalesReportPage })));
export const SalesReportPageMobile = lazy(() => import('@/features/reports/sales-report-page.mobile').then(m => ({ default: m.SalesReportPage })));

// ── Invoices ────────────────────────────────────────────────────────────────
export const InvoicePage = lazy(() => import('@/features/invoices/invoice-page').then(m => ({ default: m.InvoicePage })));

// ── Transactions ─────────────────────────────────────────────────────────────
export const TransactionsPage = lazy(() => import('@/features/transactions/transactions-page').then(m => ({ default: m.TransactionsPage })));
export const TransactionDetailPage = lazy(() => import('@/features/transactions/transaction-detail-page').then(m => ({ default: m.TransactionDetailPage })));
export const SettlementsPage = lazy(() => import('@/features/transactions/settlements-page').then(m => ({ default: m.SettlementsPage })));

// ── Inventory ────────────────────────────────────────────────────────────────
export const StockPage = lazy(() => import('@/features/inventory/stock-page').then(m => ({ default: m.StockPage })));
export const StockPageMobile = lazy(() => import('@/features/inventory/stock-page.mobile').then(m => ({ default: m.StockPage })));
export const TransfersPage = lazy(() => import('@/features/inventory/transfers-page').then(m => ({ default: m.TransfersPage })));
export const TransfersDashboardPage = lazy(() => import('@/features/inventory/transfers-dashboard-page').then(m => ({ default: m.TransfersDashboardPage })));
export const TransferDetailPage = lazy(() => import('@/features/inventory/transfer-detail-page').then(m => ({ default: m.TransferDetailPage })));
export const SuppliersPage = lazy(() => import('@/features/inventory/suppliers-page').then(m => ({ default: m.SuppliersPage })));
export const PurchaseOrdersPage = lazy(() => import('@/features/inventory/purchase-orders-page').then(m => ({ default: m.PurchaseOrdersPage })));
export const PriceTiersPage = lazy(() => import('@/features/inventory/price-tiers-page').then(m => ({ default: m.PriceTiersPage })));
export const UnitConversionPage = lazy(() => import('@/features/inventory/unit-conversion-page').then(m => ({ default: m.UnitConversionPage })));
export const BatchTrackingPage = lazy(() => import('@/features/inventory/batch-tracking-page').then(m => ({ default: m.BatchTrackingPage })));
export const SerialNumbersPage = lazy(() => import('@/features/inventory/serial-numbers-page').then(m => ({ default: m.SerialNumbersPage })));
export const ProductAssignmentPage = lazy(() => import('@/features/inventory/product-assignment-page').then(m => ({ default: m.ProductAssignmentPage })));

// ── Orders & Tables ──────────────────────────────────────────────────────────
export const OrdersPage = lazy(() => import('@/features/orders/orders-page').then(m => ({ default: m.OrdersPage })));
export const OrdersPageMobile = lazy(() => import('@/features/orders/orders-page.mobile').then(m => ({ default: m.OrdersPage })));
export const OrderDetailPage = lazy(() => import('@/features/orders/order-detail-page').then(m => ({ default: m.OrderDetailPage })));
export const TablesPage = lazy(() => import('@/features/tables/tables-page').then(m => ({ default: m.TablesPage })));
export const TablesPageMobile = lazy(() => import('@/features/tables/tables-page.mobile').then(m => ({ default: m.TablesPage })));
export const WaitingListPage = lazy(() => import('@/features/waiting-list/waiting-list-page').then(m => ({ default: m.WaitingListPage })));
export const WaitingListPageMobile = lazy(() => import('@/features/waiting-list/waiting-list-page.mobile').then(m => ({ default: m.WaitingListPage })));

// ── Shifts ───────────────────────────────────────────────────────────────────
export const ShiftsPage = lazy(() => import('@/features/shifts/shifts-page').then(m => ({ default: m.ShiftsPage })));

// ── Promotions & Loyalty ─────────────────────────────────────────────────────
export const PromotionsPage = lazy(() => import('@/features/promotions/promotions-page').then(m => ({ default: m.PromotionsPage })));
export const PromotionFormPage = lazy(() => import('@/features/promotions/promotion-form-page').then(m => ({ default: m.PromotionFormPage })));
export const LoyaltyPage = lazy(() => import('@/features/promotions/loyalty-page').then(m => ({ default: m.LoyaltyPage })));
export const VoucherGeneratorPage = lazy(() => import('@/features/promotions/voucher-generator-page').then(m => ({ default: m.VoucherGeneratorPage })));

// ── Settings ─────────────────────────────────────────────────────────────────
export const BusinessSettingsPage = lazy(() => import('@/features/settings/business-settings-page').then(m => ({ default: m.BusinessSettingsPage })));
export const OutletsPage = lazy(() => import('@/features/settings/outlets-page').then(m => ({ default: m.OutletsPage })));
export const DevicesPage = lazy(() => import('@/features/settings/devices-page').then(m => ({ default: m.DevicesPage })));
export const NotificationsPage = lazy(() => import('@/features/settings/notifications-page').then(m => ({ default: m.NotificationsPage })));
export const TaxSettingsPage = lazy(() => import('@/features/settings/tax-settings-page').then(m => ({ default: m.TaxSettingsPage })));
export const ReceiptTemplatePage = lazy(() => import('@/features/settings/receipt-template-page').then(m => ({ default: m.ReceiptTemplatePage })));
export const OperatingHoursPage = lazy(() => import('@/features/settings/operating-hours-page').then(m => ({ default: m.OperatingHoursPage })));
export const ModifierGroupsPage = lazy(() => import('@/features/settings/modifier-groups-page').then(m => ({ default: m.ModifierGroupsPage })));
export const FeaturesPage = lazy(() => import('@/features/settings/features-page').then(m => ({ default: m.FeaturesPage })));
export const BusinessTypePage = lazy(() => import('@/features/settings/business-type-page').then(m => ({ default: m.BusinessTypePage })));
export const AppearanceSettingsPage = lazy(() => import('@/features/settings/appearance-settings-page').then(m => ({ default: m.AppearanceSettingsPage })));
export const PaymentSettingsPage = lazy(() => import('@/features/settings/payment-settings-page').then(m => ({ default: m.PaymentSettingsPage })));
export const PrinterSettingsPage = lazy(() => import('@/features/settings/printer-settings-page').then(m => ({ default: m.PrinterSettingsPage })));
export const ReportSchedulePage = lazy(() => import('@/features/settings/report-schedule-page').then(m => ({ default: m.ReportSchedulePage })));

// ── Registration ─────────────────────────────────────────────────────────────
export const RegisterPage = lazy(() => import('@/features/auth/register/register-page').then(m => ({ default: m.RegisterPage })));

// ── Import ──────────────────────────────────────────────────────────────────
export const ExcelImportPage = lazy(() => import('@/features/import/excel-import-page').then(m => ({ default: m.ExcelImportPage })));

// ── Credit ──────────────────────────────────────────────────────────────────
export const CreditSalesPage = lazy(() => import('@/features/credit/credit-sales-page').then(m => ({ default: m.CreditSalesPage })));

// ── Misc ─────────────────────────────────────────────────────────────────────
export const AuditPage = lazy(() => import('@/features/audit/audit-page').then(m => ({ default: m.AuditPage })));
export const IngredientsPage = lazy(() => import('@/features/ingredients/ingredients-page').then(m => ({ default: m.IngredientsPage })));
export const OnlineStorePage = lazy(() => import('@/features/online-store/online-store-page').then(m => ({ default: m.OnlineStorePage })));
export const SelfOrderPage = lazy(() => import('@/features/self-order/self-order-page').then(m => ({ default: m.SelfOrderPage })));
export const AppointmentsPage = lazy(() => import('@/features/appointments/appointments-page').then(m => ({ default: m.AppointmentsPage })));
export const WorkOrdersPage = lazy(() => import('@/features/work-orders/work-orders-page').then(m => ({ default: m.WorkOrdersPage })));
export const ItemTrackingPage = lazy(() => import('@/features/item-tracking/item-tracking-page').then(m => ({ default: m.ItemTrackingPage })));
export const HelpCenterPage = lazy(() => import('@/features/help/help-center-page').then(m => ({ default: m.HelpCenterPage })));
export const TutorialLibraryPage = lazy(() => import('@/features/help/tutorial-library-page').then(m => ({ default: m.TutorialLibraryPage })));
export const MyProfilePage = lazy(() => import('@/features/profile/my-profile-page').then(m => ({ default: m.MyProfilePage })));
