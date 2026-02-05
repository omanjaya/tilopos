import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

/**
 * useCrudForm Hook
 *
 * Generic hook for create/edit form pages that handles:
 * - Fetching existing data (edit mode)
 * - Create/update mutations
 * - Loading states
 * - Success/error callbacks
 * - Type-safe
 *
 * Eliminates duplication across 4+ form pages.
 *
 * Usage:
 * ```tsx
 * const {
 *   item,
 *   isLoading,
 *   isSubmitting,
 *   submitForm,
 * } = useCrudForm({
 *   itemId: productId, // from useParams()
 *   queryKey: ['products', productId],
 *   getFn: (id) => productsApi.get(id),
 *   createFn: (data) => productsApi.create(data),
 *   updateFn: (id, data) => productsApi.update(id, data),
 *   onSuccess: (data) => {
 *     toast({ title: 'Product saved successfully' });
 *     navigate('/products');
 *   },
 *   onError: (error) => {
 *     toast({
 *       variant: 'destructive',
 *       title: 'Failed to save product',
 *       description: error.response?.data?.message,
 *     });
 *   },
 * });
 * ```
 */

export interface UseCrudFormOptions<TItem, TFormData, TError = AxiosError<ApiErrorResponse>> {
  /** Item ID for edit mode (undefined = create mode) */
  itemId?: string;
  /** Query key for caching */
  queryKey: unknown[];
  /** Function to fetch existing item (edit mode) */
  getFn: (id: string) => Promise<TItem>;
  /** Function to create new item */
  createFn: (data: TFormData) => Promise<TItem>;
  /** Function to update existing item */
  updateFn: (id: string, data: TFormData) => Promise<TItem>;
  /** Callback when save succeeds */
  onSuccess?: (data: TItem, isCreate: boolean) => void;
  /** Callback when save fails */
  onError?: (error: TError, isCreate: boolean) => void;
  /** Enable fetching (default: true) */
  enabled?: boolean;
}

export interface UseCrudFormResult<TItem, TFormData, TError = AxiosError<ApiErrorResponse>> {
  /** Existing item data (edit mode) */
  item: TItem | undefined;
  /** Loading existing item */
  isLoading: boolean;
  /** Submitting form (create or update) */
  isSubmitting: boolean;
  /** Error loading item */
  error: TError | null;
  /** Whether in create or edit mode */
  isCreateMode: boolean;
  /** Submit form function */
  submitForm: (data: TFormData) => void;
  /** Submit mutation object */
  submitMutation: {
    isPending: boolean;
    isError: boolean;
    error: TError | null;
  };
}

export function useCrudForm<TItem = unknown, TFormData = unknown, TError = AxiosError<ApiErrorResponse>>({
  itemId,
  queryKey,
  getFn,
  createFn,
  updateFn,
  onSuccess,
  onError,
  enabled = true,
}: UseCrudFormOptions<TItem, TFormData, TError>): UseCrudFormResult<TItem, TFormData, TError> {
  const queryClient = useQueryClient();
  const isCreateMode = !itemId;

  // Fetch existing item (edit mode only)
  const {
    data: item,
    isLoading,
    error,
  } = useQuery<TItem, TError>({
    queryKey,
    queryFn: () => getFn(itemId!),
    enabled: enabled && !isCreateMode,
  });

  // Create/Update mutation
  const submitMutation = useMutation<TItem, TError, TFormData>({
    mutationFn: async (data: TFormData) => {
      if (isCreateMode) {
        return createFn(data);
      } else {
        return updateFn(itemId!, data);
      }
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [queryKey[0]] });
      if (onSuccess) {
        onSuccess(data, isCreateMode);
      }
    },
    onError: (error) => {
      if (onError) {
        onError(error, isCreateMode);
      }
    },
  });

  // Convenient submit handler
  const submitForm = (data: TFormData) => {
    submitMutation.mutate(data);
  };

  return {
    item,
    isLoading,
    isSubmitting: submitMutation.isPending,
    error,
    isCreateMode,
    submitForm,
    submitMutation: {
      isPending: submitMutation.isPending,
      isError: submitMutation.isError,
      error: submitMutation.error,
    },
  };
}

/**
 * Example Usage in a Form Page:
 *
 * ```tsx
 * import { useParams, useNavigate } from 'react-router-dom';
 * import { useForm } from 'react-hook-form';
 * import { zodResolver } from '@hookform/resolvers/zod';
 * import { useCrudForm } from '@/hooks/use-crud-form';
 * import { productsApi } from '@/api/endpoints/products.api';
 * import { useToast } from '@/hooks/use-toast';
 * import { productSchema, type ProductFormData } from '@/schemas/product.schema';
 *
 * export function ProductFormPage() {
 *   const { id } = useParams();
 *   const navigate = useNavigate();
 *   const { toast } = useToast();
 *
 *   // CRUD hook
 *   const {
 *     item: product,
 *     isLoading,
 *     isSubmitting,
 *     submitForm,
 *     isCreateMode,
 *   } = useCrudForm({
 *     itemId: id,
 *     queryKey: ['products', id],
 *     getFn: (id) => productsApi.get(id),
 *     createFn: (data) => productsApi.create(data),
 *     updateFn: (id, data) => productsApi.update(id, data),
 *     onSuccess: () => {
 *       toast({
 *         title: isCreateMode ? 'Product created' : 'Product updated',
 *       });
 *       navigate('/products');
 *     },
 *     onError: (error) => {
 *       toast({
 *         variant: 'destructive',
 *         title: 'Failed to save product',
 *         description: error.response?.data?.message,
 *       });
 *     },
 *   });
 *
 *   // Form
 *   const form = useForm<ProductFormData>({
 *     resolver: zodResolver(productSchema),
 *     defaultValues: product || {},
 *   });
 *
 *   // Update form when product loads
 *   useEffect(() => {
 *     if (product) {
 *       form.reset(product);
 *     }
 *   }, [product, form]);
 *
 *   const onSubmit = (data: ProductFormData) => {
 *     submitForm(data);
 *   };
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <Form {...form}>
 *       <form onSubmit={form.handleSubmit(onSubmit)}>
 *         // Form fields here
 *         <Button type="submit" disabled={isSubmitting}>
 *           {isSubmitting && <Loader2 />}
 *           {isCreateMode ? 'Create' : 'Update'}
 *         </Button>
 *       </form>
 *     </Form>
 *   );
 * }
 * ```
 *
 * This replaces ~60-100 lines of boilerplate code per form page!
 */
