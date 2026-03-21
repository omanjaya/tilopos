import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { kdsApi } from '@/api/endpoints/kds.api';

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
      toast.success({ title: 'Item selesai', duration: 2000 });
    },
    onError: (error) => handleMutationError(error, 'Gagal bump item'),
  });

  const notifyMutation = useMutation({
    mutationFn: (orderId: string) => kdsApi.notifyCashier(orderId),
    onSuccess: (_, orderId) => {
      const order = orders.find((o) => o.id === orderId);
      const orderNum = order?.orderNumber ?? orderId;

      toast.success({
        title: `Order #${orderNum} siap disajikan`,
        description: 'Kasir telah diberitahu.',
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
    },
    onError: (error) => handleMutationError(error, 'Gagal memberitahu kasir'),
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
