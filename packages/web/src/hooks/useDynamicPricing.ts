import { useQuery } from '@tanstack/react-query';
import { pricingApi, CalculatePriceRequest } from '@/api/endpoints/pricing.api';

export interface UseDynamicPricingOptions {
  productId: string;
  categoryId?: string;
  quantity: number;
  originalPrice: number;
  customerSegment?: string;
  stockLevel?: number;
  cartTotal?: number;
  cartItemCount?: number;
  enabled?: boolean;
}

/**
 * Hook to calculate dynamic pricing for a product
 * Uses TanStack Query for caching and automatic refetching
 */
export function useDynamicPricing(options: UseDynamicPricingOptions) {
  const { enabled = true, ...requestData } = options;

  const query = useQuery({
    queryKey: ['dynamic-pricing', requestData],
    queryFn: () => pricingApi.calculatePrice(requestData as CalculatePriceRequest),
    enabled: enabled && !!options.productId && options.quantity > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  });

  return {
    ...query,
    pricing: query.data,
    finalPrice: query.data?.finalPrice ?? options.originalPrice,
    discount: query.data?.totalDiscount ?? 0,
    hasDiscount: (query.data?.totalDiscount ?? 0) > 0,
    savingsPercentage: query.data?.savingsPercentage ?? 0,
    appliedRules: query.data?.appliedRules ?? [],
  };
}

/**
 * Hook to preview applicable pricing rules
 */
export function usePricingRulesPreview(options: UseDynamicPricingOptions) {
  const { enabled = true, ...requestData } = options;

  return useQuery({
    queryKey: ['pricing-rules-preview', requestData],
    queryFn: () => pricingApi.previewRules(requestData as CalculatePriceRequest),
    enabled: enabled && !!options.productId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to get potential savings opportunities
 */
export function usePotentialSavings(options: UseDynamicPricingOptions) {
  const { enabled = true, ...requestData } = options;

  return useQuery({
    queryKey: ['potential-savings', requestData],
    queryFn: () => pricingApi.getPotentialSavings(requestData as CalculatePriceRequest),
    enabled: enabled && !!options.productId,
    staleTime: 1000 * 60 * 5,
  });
}
