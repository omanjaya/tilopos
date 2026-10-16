import { apiClient } from '../client';
import type {
  Business,
  UpdateBusinessRequest,
  Outlet,
  CreateOutletRequest,
  Device,
  NotificationSetting,
  NotificationLog,
  TaxConfig,
  UpdateTaxConfigRequest,
  ReceiptTemplate,
  UpdateReceiptTemplateRequest,
  OperatingHours,
  UpdateOperatingHoursRequest,
  ModifierGroup,
  CreateModifierGroupRequest,
  UpdateModifierGroupRequest,
  PaymentMethod,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
  PrinterConfig,
  CreatePrinterConfigRequest,
  UpdatePrinterConfigRequest,
  ReportSchedule,
  CreateReportScheduleRequest,
  UpdateReportScheduleRequest,
} from '@/types/settings.types';

const DAY_DEFAULTS = [
  { dayOfWeek: 0, day: 'sunday', dayLabel: 'Minggu' },
  { dayOfWeek: 1, day: 'monday', dayLabel: 'Senin' },
  { dayOfWeek: 2, day: 'tuesday', dayLabel: 'Selasa' },
  { dayOfWeek: 3, day: 'wednesday', dayLabel: 'Rabu' },
  { dayOfWeek: 4, day: 'thursday', dayLabel: 'Kamis' },
  { dayOfWeek: 5, day: 'friday', dayLabel: 'Jumat' },
  { dayOfWeek: 6, day: 'saturday', dayLabel: 'Sabtu' },
];

/** Known alert thresholds accepted by the backend (NotificationThresholdDto). */
export interface NotificationThreshold {
  quantity?: number;
  amount?: number;
  minutesBefore?: number;
}

/** Throw instead of rendering a contract/shape error as an empty list (F2). */
function expectArray<T>(raw: unknown, endpoint: string): T[] {
  if (!Array.isArray(raw)) {
    throw new Error(`Respons tidak valid dari ${endpoint}`);
  }
  return raw as T[];
}

const getOutlets = () => apiClient.get<Outlet[]>('/settings/outlets').then((r) => r.data);

/** Maps the backend OutletReceiptTemplate (GET/PUT /settings/receipt, GET /settings/pos/receipt). */
/** A group allowing at most one modifier is single-select; anything else is multiple. */
function selectionTypeFor(maxSelections: number | null | undefined): 'single' | 'multiple' {
  return maxSelections === 1 ? 'single' : 'multiple';
}

export function toReceiptTemplate(data: unknown): ReceiptTemplate {
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    showLogo: Boolean(d.showLogo),
    showAddress: Boolean(d.showAddress),
    showPhone: Boolean(d.showPhone),
    showTaxBreakdown: Boolean(d.showTaxDetails),
    showPaymentMethod: Boolean(d.showPaymentMethod),
    headerText: typeof d.header === 'string' ? d.header : '',
    footerText: typeof d.footer === 'string' ? d.footer : '',
    paperSize: d.paperWidth === '58mm' ? '58mm' : '80mm',
  };
}

export const settingsApi = {
  getBusiness: () =>
    apiClient.get<Business>('/settings/business').then((r) => r.data),
  updateBusiness: (data: UpdateBusinessRequest) =>
    apiClient.put<Business>('/settings/business', data).then((r) => r.data),

  getOutlets,
  /** Alias of getOutlets (kept for existing callers). */
  listOutlets: getOutlets,
  createOutlet: (data: CreateOutletRequest) =>
    apiClient.post<Outlet>('/settings/outlets', data).then((r) => r.data),
  updateOutlet: (id: string, data: Partial<CreateOutletRequest>) =>
    apiClient.put<Outlet>(`/settings/outlets/${id}`, data).then((r) => r.data),
  deleteOutlet: (id: string) =>
    apiClient.delete(`/settings/outlets/${id}`).then((r) => r.data),

  listDevices: () =>
    apiClient.get<Device[]>('/devices').then((r) => r.data),
  syncDevice: (id: string) =>
    apiClient.put(`/devices/${id}/sync`).then((r) => r.data),
  removeDevice: (id: string) =>
    apiClient.delete(`/devices/${id}`).then((r) => r.data),

  listNotificationSettings: () =>
    apiClient.get('/notifications/settings').then((r) => {
      const arr = expectArray<Record<string, unknown>>(r.data, '/notifications/settings');
      // Backend uses notificationType, frontend expects type
      return arr.map((s) => ({
        id: (s.id as string) ?? '',
        type: (s.type ?? s.notificationType ?? '') as string,
        channel: (s.channel ?? '') as string,
        isEnabled: Boolean(s.isEnabled),
      })) as NotificationSetting[];
    }),
  /** POST /notifications/settings (owner/manager; backend field is notificationType). */
  createNotificationSetting: (data: { type: string; channel: string; isEnabled: boolean }) =>
    apiClient
      .post('/notifications/settings', {
        notificationType: data.type,
        channel: data.channel,
        isEnabled: data.isEnabled,
      })
      .then((r) => r.data),
  /** PUT /notifications/settings/:id — only isEnabled/threshold are accepted (owner/manager). */
  updateNotificationSetting: (id: string, data: { isEnabled?: boolean; threshold?: NotificationThreshold }) =>
    apiClient
      .put<NotificationSetting>(`/notifications/settings/${id}`, {
        isEnabled: data.isEnabled,
        threshold: data.threshold,
      })
      .then((r) => r.data),
  /** The caller's own logs, newest first: GET /notifications/logs?page&limit(<=100, default 50). */
  getNotificationLogs: (params: { page?: number; limit?: number } = {}) =>
    apiClient.get('/notifications/logs', { params }).then((r) => {
      const arr = expectArray<Record<string, unknown>>(r.data, '/notifications/logs');
      // Backend returns notificationType/body/status/sentAt; frontend expects type/message/isRead/createdAt
      return arr.map((log) => ({
        id: (log.id as string) ?? '',
        type: ((log.type ?? log.notificationType ?? 'system_alert') as string),
        title: (log.title as string) ?? '',
        message: ((log.message ?? log.body ?? log.title ?? '') as string),
        isRead: log.isRead === true || log.status === 'read' || !!log.readAt,
        createdAt: ((log.createdAt ?? log.sentAt ?? '') as string),
      })) as NotificationLog[];
    }),
  markNotificationRead: (id: string) =>
    apiClient.put(`/notifications/logs/${id}/read`).then((r) => r.data),
  /** PUT /notifications/logs/read-all — marks all of the caller's logs read. */
  markAllNotificationsRead: () =>
    apiClient.put<{ count: number }>('/notifications/logs/read-all').then((r) => r.data),

  // Tax Config (business-level; keys from settings.dto.ts TaxConfigResponse)
  getTaxConfig: () =>
    apiClient.get('/settings/tax').then((r) => {
      const d = r.data as Record<string, unknown>;
      return {
        taxEnabled: Boolean(d.taxEnabled),
        taxRate: Number(d.taxRate),
        taxName: String(d.taxName ?? 'PPN'),
        isTaxInclusive: Boolean(d.taxInclusive),
        serviceChargeEnabled: Boolean(d.serviceChargeEnabled),
        serviceChargeRate: Number(d.serviceChargeRate),
      } satisfies TaxConfig;
    }),
  updateTaxConfig: (data: UpdateTaxConfigRequest) =>
    apiClient.put<TaxConfig>('/settings/tax', {
      taxEnabled: data.taxEnabled,
      taxRate: data.taxRate,
      taxName: data.taxName,
      taxInclusive: data.isTaxInclusive,
      serviceChargeEnabled: data.serviceChargeEnabled,
      serviceChargeRate: data.serviceChargeRate,
    }).then((r) => r.data),

  // Receipt Template (outlet-level). `outletId` selects the outlet being edited (validated
  // server-side: 403/404 for outlets the user cannot access); without it the user's outlet is used.
  getReceiptTemplate: (outletId: string | null) =>
    apiClient
      .get('/settings/receipt', { params: outletId ? { outletId } : undefined })
      .then((r) => toReceiptTemplate(r.data)),
  updateReceiptTemplate: (outletId: string | null, data: UpdateReceiptTemplateRequest) =>
    apiClient
      .put<unknown>(
        '/settings/receipt',
        {
          header: data.headerText,
          footer: data.footerText,
          showLogo: data.showLogo,
          showAddress: data.showAddress,
          showPhone: data.showPhone,
          showTaxDetails: data.showTaxBreakdown,
          showPaymentMethod: data.showPaymentMethod,
          paperWidth: data.paperSize,
        },
        { params: outletId ? { outletId } : undefined },
      )
      .then((r) => toReceiptTemplate(r.data)),

  // Operating Hours (per outlet; caller passes the selected outlet explicitly)
  getOperatingHours: (outletId: string) =>
    apiClient.get(`/settings/hours/${outletId}`).then((r) => {
      const entries = expectArray<{
        dayOfWeek: number;
        openTime: string;
        closeTime: string;
        isClosed?: boolean;
      }>(r.data, '/settings/hours');
      const schedule = DAY_DEFAULTS.map((def) => {
        const entry = entries.find((e) => e.dayOfWeek === def.dayOfWeek);
        return {
          day: def.day,
          dayLabel: def.dayLabel,
          isOpen: entry ? !entry.isClosed : false,
          openTime: entry?.openTime ?? '',
          closeTime: entry?.closeTime ?? '',
        };
      });
      return { outletId, schedule } satisfies OperatingHours;
    }),
  updateOperatingHours: (outletId: string, data: UpdateOperatingHoursRequest) => {
    const hours = DAY_DEFAULTS.map((def) => {
      const s = data.schedule.find((d) => d.day === def.day);
      const isOpen = s?.isOpen ?? false;
      // OperatingHoursEntryDto requires HH:mm on every entry, even closed days
      return {
        dayOfWeek: def.dayOfWeek,
        openTime: isOpen && s?.openTime ? s.openTime : '00:00',
        closeTime: isOpen && s?.closeTime ? s.closeTime : '00:00',
        isClosed: !isOpen,
      };
    });
    return apiClient.put(`/settings/hours/${outletId}`, { hours }).then((r) => r.data);
  },

  // Modifier Groups (only active groups/modifiers are returned; Decimals come as strings)
  listModifierGroups: () =>
    apiClient.get('/settings/modifier-groups').then((r) => {
      const arr = expectArray<Record<string, unknown>>(r.data, '/settings/modifier-groups');
      // Backend uses minSelection/maxSelection (singular, max null = unlimited)
      return arr.map((g) => ({
        id: g.id as string,
        name: g.name as string,
        isRequired: Boolean(g.isRequired),
        minSelections: Number(g.minSelection ?? 0),
        maxSelections: g.maxSelection === null || g.maxSelection === undefined ? null : Number(g.maxSelection),
        businessId: g.businessId as string,
        createdAt: g.createdAt as string,
        modifiers: (Array.isArray(g.modifiers) ? g.modifiers : []).map((m: Record<string, unknown>) => ({
          id: m.id as string,
          name: m.name as string,
          price: Number(m.price ?? 0),
          isActive: m.isActive !== false,
          sortOrder: Number(m.sortOrder ?? 0),
        })),
      })) as ModifierGroup[];
    }),
  /** POST /settings/modifier-groups — modifiers accept only { name, price }. */
  createModifierGroup: (data: CreateModifierGroupRequest) =>
    apiClient.post<ModifierGroup>('/settings/modifier-groups', {
      name: data.name,
      isRequired: data.isRequired,
      selectionType: selectionTypeFor(data.maxSelections),
      minSelection: data.minSelections,
      maxSelection: data.maxSelections ?? undefined,
      modifiers: data.modifiers.map((m) => ({ name: m.name, price: m.price })),
    }).then((r) => r.data),
  /**
   * PUT /settings/modifier-groups/:id. When `modifiers` is sent it is the full
   * list: items with id are updated, without id created, missing ones deactivated.
   */
  updateModifierGroup: (id: string, data: UpdateModifierGroupRequest) =>
    apiClient.put<ModifierGroup>(`/settings/modifier-groups/${id}`, {
      name: data.name,
      isActive: data.isActive,
      isRequired: data.isRequired,
      ...(data.maxSelections !== undefined && { selectionType: selectionTypeFor(data.maxSelections) }),
      minSelection: data.minSelections,
      maxSelection: data.maxSelections,
      modifiers: data.modifiers?.map((m) => ({ id: m.id, name: m.name, price: m.price })),
    }).then((r) => r.data),
  deleteModifierGroup: (id: string) =>
    apiClient.delete(`/settings/modifier-groups/${id}`).then((r) => r.data),

  // Payment Methods
  listPaymentMethods: () =>
    apiClient.get<PaymentMethod[]>('/settings/payment-methods/list').then((r) => expectArray<PaymentMethod>(r.data, '/settings/payment-methods/list')),
  createPaymentMethod: (data: CreatePaymentMethodRequest) =>
    apiClient.post<PaymentMethod>('/settings/payment-methods/create', data).then((r) => r.data),
  updatePaymentMethod: (id: string, data: UpdatePaymentMethodRequest) =>
    apiClient.put<PaymentMethod>(`/settings/payment-methods/${id}/update`, data).then((r) => r.data),
  deletePaymentMethod: (id: string) =>
    apiClient.delete(`/settings/payment-methods/${id}`).then((r) => r.data),

  // Printer Configs
  listPrinters: () =>
    apiClient.get<PrinterConfig[]>('/settings/printers').then((r) => expectArray<PrinterConfig>(r.data, '/settings/printers')),
  createPrinter: (data: CreatePrinterConfigRequest) =>
    apiClient.post<PrinterConfig>('/settings/printers', data).then((r) => r.data),
  updatePrinter: (id: string, data: UpdatePrinterConfigRequest) =>
    apiClient.put<PrinterConfig>(`/settings/printers/${id}`, data).then((r) => r.data),
  deletePrinter: (id: string) =>
    apiClient.delete(`/settings/printers/${id}`).then((r) => r.data),

  // Report Schedules
  listReportSchedules: () =>
    apiClient.get<ReportSchedule[]>('/settings/report-schedules').then((r) => expectArray<ReportSchedule>(r.data, '/settings/report-schedules')),
  createReportSchedule: (data: CreateReportScheduleRequest) =>
    apiClient.post<ReportSchedule>('/settings/report-schedules', data).then((r) => r.data),
  updateReportSchedule: (id: string, data: UpdateReportScheduleRequest) =>
    apiClient.put<ReportSchedule>(`/settings/report-schedules/${id}`, data).then((r) => r.data),
  deleteReportSchedule: (id: string) =>
    apiClient.delete(`/settings/report-schedules/${id}`).then((r) => r.data),
};
