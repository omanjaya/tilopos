import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useUIStore } from '@/stores/ui.store';

/**
 * Response of GET /settings/outlets/:id/tax — the same per-outlet config the backend
 * uses in create-transaction.use-case (rates in percent).
 */
interface OutletTaxConfig {
  outletId: string;
  taxRate: number;
  serviceCharge: number;
  taxInclusive: boolean;
}

/**
 * Loads the outlet's tax / service-charge config from the server and writes it to the
 * UI store used by the cart, so POS totals match the server-computed totals.
 * The last value stays cached in the UI store for offline use.
 */
export function usePosTaxConfig(outletId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['outlet-tax-config', outletId],
    queryFn: async () => {
      const { data } = await apiClient.get<OutletTaxConfig>(`/settings/outlets/${outletId}/tax`);
      return data;
    },
    enabled: !!outletId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const cfg = query.data;
    if (!cfg) return;
    const ui = useUIStore.getState();
    ui.setTaxRate((Number(cfg.taxRate) || 0) / 100);
    ui.setServiceChargeRate((Number(cfg.serviceCharge) || 0) / 100);
    ui.setTaxInclusive(Boolean(cfg.taxInclusive));
  }, [query.data]);

  return query;
}
