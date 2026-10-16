import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { heldBillsApi } from '@/api/endpoints/held-bills.api';
import { HeldBillsService } from '../services/held-bills.service';

const service = new HeldBillsService(
  heldBillsApi,
  () => {
    const user = useAuthStore.getState().user;
    const outletId = useUIStore.getState().selectedOutletId ?? user?.outletId;
    return user?.businessId && outletId
      ? { businessId: user.businessId, outletId, employeeId: user.id }
      : null;
  },
  () => navigator.onLine,
);

export function useHeldBills(outletId: string, isOffline: boolean) {
  const user = useAuthStore((state) => state.user);
  const allBills = useCartStore((state) => state.heldBills);
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ['pos', 'held-bills', user?.businessId, outletId, user?.id],
    queryFn: async () => {
      await service.sync();
      return true;
    },
    enabled: !!outletId && !!user?.businessId && !isOffline,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: false,
  });
  const run = async <T>(work: () => Promise<T>) => {
    setBusy(true);
    try {
      return await work();
    } finally {
      setBusy(false);
      void query.refetch();
    }
  };
  return {
    bills: allBills.filter(
      (bill) => bill.businessId === user?.businessId && bill.outletId === outletId,
    ),
    legacyCount: service.legacyCount(),
    adoptLegacy: () => {
      service.adoptLegacy();
      void query.refetch();
    },
    hold: () => run(() => service.hold()),
    resume: (id: string) => run(() => service.resume(id)),
    discard: (id: string) => run(() => service.discard(id)),
    busy,
    isLoading: query.isFetching,
    error: query.isError ? query.error : null,
    retry: () => {
      void query.refetch();
    },
  };
}
