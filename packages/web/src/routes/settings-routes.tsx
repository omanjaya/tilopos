import type { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/features/auth/role-guard';
import { LazyRoute } from './shared';
import {
  BusinessSettingsPage, OutletsPage, DevicesPage, NotificationsPage,
  TaxSettingsPage, ReceiptTemplatePage, OperatingHoursPage,
  ModifierGroupsPage, FeaturesPage, BusinessTypePage, AppearanceSettingsPage,
  PaymentSettingsPage, PrinterSettingsPage, ReportSchedulePage,
} from './lazy-imports';

export const settingsRoutes: RouteObject[] = [
  { path: 'business', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin']}><BusinessSettingsPage /></RoleGuard></LazyRoute> },
  { path: 'outlets', element: <LazyRoute><OutletsPage /></LazyRoute> },
  { path: 'devices', element: <LazyRoute><DevicesPage /></LazyRoute> },
  { path: 'notifications', element: <LazyRoute><NotificationsPage /></LazyRoute> },
  { path: 'tax', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin']}><TaxSettingsPage /></RoleGuard></LazyRoute> },
  { path: 'receipt', element: <LazyRoute><ReceiptTemplatePage /></LazyRoute> },
  { path: 'hours', element: <LazyRoute><OperatingHoursPage /></LazyRoute> },
  { path: 'modifiers', element: <LazyRoute><ModifierGroupsPage /></LazyRoute> },
  { path: 'features', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin']}><FeaturesPage /></RoleGuard></LazyRoute> },
  { path: 'business-type', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin']}><BusinessTypePage /></RoleGuard></LazyRoute> },
  { path: 'appearance', element: <LazyRoute><AppearanceSettingsPage /></LazyRoute> },
  { path: 'payments', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin']}><PaymentSettingsPage /></RoleGuard></LazyRoute> },
  { path: 'printers', element: <LazyRoute><PrinterSettingsPage /></LazyRoute> },
  { path: 'report-schedule', element: <LazyRoute><RoleGuard allowedRoles={['owner', 'super_admin']}><ReportSchedulePage /></RoleGuard></LazyRoute> },
];
