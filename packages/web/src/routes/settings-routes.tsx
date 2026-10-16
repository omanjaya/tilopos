import type { RouteObject } from 'react-router-dom';
import { LazyRoute } from './shared';
import {
  BusinessSettingsPage, OutletsPage, DevicesPage, NotificationsPage,
  TaxSettingsPage, ReceiptTemplatePage, OperatingHoursPage,
  ModifierGroupsPage, FeaturesPage, BusinessTypePage, AppearanceSettingsPage,
  PaymentSettingsPage, PrinterSettingsPage, ReportSchedulePage, BillingPage,
} from './lazy-imports';

// Access: ROUTE_ROLES['settings'] (owner/manager, matching SettingsController @Roles).
export const settingsRoutes: RouteObject[] = [
  { path: 'business', element: <LazyRoute><BusinessSettingsPage /></LazyRoute> },
  { path: 'outlets', element: <LazyRoute><OutletsPage /></LazyRoute> },
  { path: 'devices', element: <LazyRoute><DevicesPage /></LazyRoute> },
  { path: 'notifications', element: <LazyRoute><NotificationsPage /></LazyRoute> },
  { path: 'tax', element: <LazyRoute><TaxSettingsPage /></LazyRoute> },
  { path: 'receipt', element: <LazyRoute><ReceiptTemplatePage /></LazyRoute> },
  { path: 'hours', element: <LazyRoute><OperatingHoursPage /></LazyRoute> },
  { path: 'modifiers', element: <LazyRoute><ModifierGroupsPage /></LazyRoute> },
  { path: 'features', element: <LazyRoute><FeaturesPage /></LazyRoute> },
  { path: 'business-type', element: <LazyRoute><BusinessTypePage /></LazyRoute> },
  { path: 'appearance', element: <LazyRoute><AppearanceSettingsPage /></LazyRoute> },
  { path: 'payments', element: <LazyRoute><PaymentSettingsPage /></LazyRoute> },
  { path: 'printers', element: <LazyRoute><PrinterSettingsPage /></LazyRoute> },
  { path: 'report-schedule', element: <LazyRoute><ReportSchedulePage /></LazyRoute> },
  { path: 'billing', element: <LazyRoute><BillingPage /></LazyRoute> },
];
