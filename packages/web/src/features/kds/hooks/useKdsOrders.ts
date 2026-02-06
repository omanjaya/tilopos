import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { kdsApi } from '@/api/endpoints/kds.api';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export function useKdsOrders(outletId: string) {
  const queryClient = useQueryClient();

  const {
    data: orders = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['kds-orders', outletId],
    queryFn: () => kdsApi.getOrders(outletId),
    enabled: !!outletId,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const bumpMutation = useMutation({
    mutationFn: kdsApi.bumpItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
      toast({ title: 'Item selesai', duration: 2000 });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal bump item',
        description: error.response?.data?.message || 'Terjadi kesalahan',
        duration: 5000,
      });
    },
  });

  const notifyMutation = useMutation({
    mutationFn: (orderId: string) => kdsApi.notifyCashier(orderId),
    onSuccess: (_, orderId) => {
      const order = orders.find((o) => o.id === orderId);
      const orderNum = order?.orderNumber ?? orderId;

      toast({
        title: `Order #${orderNum} siap disajikan`,
        description: 'Kasir telah diberitahu.',
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal memberitahu kasir',
        description: error.response?.data?.message || 'Terjadi kesalahan',
        duration: 5000,
      });
    },
  });

  return {
    orders,
    isLoading,
    isError,
    isFetching,
    refetch,
    bumpItem: bumpMutation.mutate,
    notifyCashier: notifyMutation.mutate,
    bumpingItemId: bumpMutation.variables,
    notifyingOrderId: notifyMutation.variables,
    isBumping: bumpMutation.isPending,
    isNotifying: notifyMutation.isPending,
  };
}
