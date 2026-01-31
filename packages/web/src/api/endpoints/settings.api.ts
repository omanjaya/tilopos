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

export const settingsApi = {
  getBusiness: () =>
    apiClient.get<Business>('/settings/business').then((r) => r.data),
  updateBusiness: (data: UpdateBusinessRequest) =>
    apiClient.put<Business>('/settings/business', data).then((r) => r.data),

  getOutlets: () =>
    apiClient.get<Outlet[]>('/settings/outlets').then((r) => r.data),
  listOutlets: () =>
    apiClient.get<Outlet[]>('/settings/outlets').then((r) => r.data),
  createOutlet: (data: CreateOutletRequest) =>
    apiClient.post<Outlet>('/settings/outlets', data).then((r) => r.data),
  updateOutlet: (id: string, data: Partial<CreateOutletRequest>) =>
    apiClient.put<Outlet>(`/settings/outlets/${id}`, data).then((r) => r.data),

  listDevices: () =>
    apiClient.get<Device[]>('/devices').then((r) => r.data),
  registerDevice: (data: { deviceName: string; deviceType: string; outletId?: string }) =>
    apiClient.post<Device>('/devices', data).then((r) => r.data),
  syncDevice: (id: string) =>
    apiClient.put(`/devices/${id}/sync`).then((r) => r.data),
  removeDevice: (id: string) =>
    apiClient.delete(`/devices/${id}`).then((r) => r.data),

  listNotificationSettings: () =>
    apiClient.get('/notifications/settings').then((r) => {
      const raw = r.data;
      const arr = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
      // Backend uses notificationType, frontend expects type
      return arr.map((s) => ({
        id: (s.id as string) ?? '',
        type: (s.type ?? s.notificationType ?? '') as string,
        channel: (s.channel ?? '') as string,
        isEnabled: Boolean(s.isEnabled),
      })) as NotificationSetting[];
    }),
  createNotificationSetting: (data: Partial<NotificationSetting>) =>
    apiClient.post<NotificationSetting>('/notifications/settings', data).then((r) => r.data),
  updateNotificationSetting: (id: string, data: Partial<NotificationSetting>) =>
    apiClient.put<NotificationSetting>(`/notifications/settings/${id}`, data).then((r) => r.data),
  getNotificationLogs: (_recipientId: string) =>
    apiClient.get<NotificationLog[]>('/notifications/logs').then((r) => {
      const raw = r.data;
      return Array.isArray(raw) ? raw : [];
    }),
  markNotificationRead: (id: string) =>
    apiClient.put(`/notifications/logs/${id}/read`).then((r) => r.data),

  // Tax Config
  getTaxConfig: () =>
    apiClient.get('/settings/tax').then((r) => {
      const d = r.data as Record<string, unknown>;
      return {
        id: (d.id as string) ?? '',
        taxRate: (d.taxRate as number) ?? 11,
        serviceChargeRate: (d.serviceChargeRate as number) ?? 0,
        isTaxInclusive: Boolean(d.isTaxInclusive ?? d.taxInclusive ?? true),
        taxExemptionRules: (d.taxExemptionRules as TaxConfig['taxExemptionRules']) ?? [],
        businessId: (d.businessId as string) ?? '',
      } as TaxConfig;
    }),
  updateTaxConfig: (data: UpdateTaxConfigRequest) =>
    apiClient.put<TaxConfig>('/settings/tax', {
      taxRate: data.taxRate,
      serviceChargeRate: data.serviceChargeRate,
      taxInclusive: data.isTaxInclusive,
      taxExemptionRules: data.taxExemptionRules,
    }).then((r) => r.data),

  // Receipt Template
  getReceiptTemplate: () =>
    apiClient.get('/settings/receipt').then((r) => {
      const d = r.data as Record<string, unknown>;
      return {
        showLogo: Boolean(d.showLogo ?? true),
        showAddress: Boolean(d.showAddress ?? true),
        showTaxBreakdown: Boolean(d.showTaxDetails ?? true),
        showBarcode: false,
        showQrCode: Boolean(d.showQRCode ?? false),
        headerText: (d.header as string) ?? '',
        footerText: (d.footer as string) ?? '',
        paperSize: ((d.paperWidth as string) ?? '80mm') as '58mm' | '80mm',
      } as ReceiptTemplate;
    }),
  updateReceiptTemplate: (data: UpdateReceiptTemplateRequest) =>
    apiClient.put<ReceiptTemplate>('/settings/receipt', {
      header: data.headerText,
      footer: data.footerText,
      showLogo: data.showLogo,
      showAddress: data.showAddress,
      showTaxDetails: data.showTaxBreakdown,
      showPaymentMethod: true,
      paperWidth: data.paperSize,
    }).then((r) => r.data),

  // Operating Hours
  getOperatingHours: () => {
    const outletId = localStorage.getItem('selectedOutletId');
    if (!outletId) {
      return Promise.resolve({
        id: '',
        schedule: DAY_DEFAULTS.map((d) => ({ ...d, isOpen: true, openTime: '08:00', closeTime: '22:00' })),
        specialHours: [],
        businessId: '',
      } as OperatingHours);
    }
    return apiClient.get(`/settings/hours/${outletId}`).then((r) => {
      const raw = r.data;
      const entries = (Array.isArray(raw) ? raw : []) as Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed?: boolean }>;
      const schedule = DAY_DEFAULTS.map((def) => {
        const entry = entries.find((e) => e.dayOfWeek === def.dayOfWeek);
        return {
          day: def.day,
          dayLabel: def.dayLabel,
          isOpen: entry ? !entry.isClosed : true,
          openTime: entry?.openTime ?? '08:00',
          closeTime: entry?.closeTime ?? '22:00',
        };
      });
      return { id: outletId, schedule, specialHours: [], businessId: '' } as OperatingHours;
    });
  },
  updateOperatingHours: (data: UpdateOperatingHoursRequest) => {
    const outletId = localStorage.getItem('selectedOutletId');
    if (!outletId) return Promise.reject(new Error('No outlet selected'));
    const hours = (data.schedule ?? []).map((s, i) => ({
      dayOfWeek: DAY_DEFAULTS.findIndex((d) => d.day === s.day) ?? i,
      openTime: s.openTime,
      closeTime: s.closeTime,
      isClosed: !s.isOpen,
    }));
    return apiClient.put(`/settings/hours/${outletId}`, { hours }).then((r) => r.data);
  },

  // Modifier Groups
  listModifierGroups: () =>
    apiClient.get('/settings/modifier-groups').then((r) => {
      const raw = r.data;
      const arr = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
      // Backend uses minSelection/maxSelection (singular), frontend expects minSelections/maxSelections (plural)
      return arr.map((g) => ({
        ...g,
        minSelections: (g.minSelections ?? g.minSelection ?? 0) as number,
        maxSelections: (g.maxSelections ?? g.maxSelection ?? 1) as number,
        modifiers: Array.isArray(g.modifiers) ? g.modifiers : [],
      })) as ModifierGroup[];
    }),
  getModifierGroup: (id: string) =>
    apiClient.get<ModifierGroup>(`/settings/modifier-groups/${id}`).then((r) => r.data),
  createModifierGroup: (data: CreateModifierGroupRequest) =>
    apiClient.post<ModifierGroup>('/settings/modifier-groups', {
      name: data.name,
      isRequired: data.isRequired,
      minSelection: data.minSelections,
      maxSelection: data.maxSelections,
      modifiers: data.modifiers,
    }).then((r) => r.data),
  updateModifierGroup: (id: string, data: UpdateModifierGroupRequest & { isActive?: boolean }) =>
    apiClient.put<ModifierGroup>(`/settings/modifier-groups/${id}`, {
      name: data.name,
      isRequired: data.isRequired,
      minSelection: data.minSelections,
      maxSelection: data.maxSelections,
      modifiers: data.modifiers,
      isActive: data.isActive,
    }).then((r) => r.data),
  deleteModifierGroup: (id: string) =>
    apiClient.delete(`/settings/modifier-groups/${id}`).then((r) => r.data),
};
