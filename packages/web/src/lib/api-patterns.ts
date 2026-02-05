import { apiClient } from '@/api/client';
import type { AxiosRequestConfig } from 'axios';

/**
 * API Patterns Utility Library
 *
 * Factory functions for creating standardized API clients.
 * Eliminates boilerplate code in api/endpoints/*.api.ts files.
 *
 * Benefits:
 * - Consistent API client structure
 * - Less boilerplate (5-10 lines → 1 line)
 * - Type-safe
 * - Easier to add new endpoints
 *
 * Usage:
 * ```tsx
 * import { createStandardApiClient } from '@/lib/api-patterns';
 * import type { Product } from '@/types/product.types';
 *
 * export const productsApi = createStandardApiClient<Product>('/products');
 *
 * // Now you have:
 * // - productsApi.list(params)
 * // - productsApi.get(id)
 * // - productsApi.create(data)
 * // - productsApi.update(id, data)
 * // - productsApi.delete(id)
 * ```
 */

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/**
 * List response with pagination
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Standard API client interface
 */
export interface StandardApiClient<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  /** List all items with optional filters */
  list: (params?: Record<string, unknown>, config?: AxiosRequestConfig) => Promise<ApiResponse<T[]>>;
  /** Get single item by ID */
  get: (id: string, config?: AxiosRequestConfig) => Promise<ApiResponse<T>>;
  /** Create new item */
  create: (data: TCreate, config?: AxiosRequestConfig) => Promise<ApiResponse<T>>;
  /** Update existing item */
  update: (id: string, data: TUpdate, config?: AxiosRequestConfig) => Promise<ApiResponse<T>>;
  /** Delete item */
  delete: (id: string, config?: AxiosRequestConfig) => Promise<void>;
}

/**
 * Paginated API client interface
 */
export interface PaginatedApiClient<T, TCreate = Partial<T>, TUpdate = Partial<T>>
  extends Omit<StandardApiClient<T, TCreate, TUpdate>, 'list'> {
  /** List items with pagination */
  list: (
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ) => Promise<PaginatedResponse<T>>;
}

/**
 * Create standard API client
 *
 * Generates CRUD methods for a given API endpoint.
 *
 * @param basePath - API endpoint base path (e.g., '/products')
 * @returns Standard API client object
 *
 * @example
 * ```tsx
 * // Simple usage
 * export const productsApi = createStandardApiClient<Product>('/products');
 *
 * // With custom create/update types
 * export const customersApi = createStandardApiClient<
 *   Customer,
 *   CustomerCreateDto,
 *   CustomerUpdateDto
 * >('/customers');
 *
 * // Usage in components
 * const products = await productsApi.list({ category: 'food' });
 * const product = await productsApi.get('123');
 * await productsApi.create({ name: 'New Product', price: 1000 });
 * await productsApi.update('123', { price: 1500 });
 * await productsApi.delete('123');
 * ```
 */
export function createStandardApiClient<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  basePath: string
): StandardApiClient<T, TCreate, TUpdate> {
  return {
    list: (params?, config?) =>
      apiClient.get<ApiResponse<T[]>>(basePath, { params, ...config }),

    get: (id, config?) =>
      apiClient.get<ApiResponse<T>>(`${basePath}/${id}`, config),

    create: (data, config?) =>
      apiClient.post<ApiResponse<T>>(basePath, data, config),

    update: (id, data, config?) =>
      apiClient.put<ApiResponse<T>>(`${basePath}/${id}`, data, config),

    delete: (id, config?) =>
      apiClient.delete<void>(`${basePath}/${id}`, config),
  };
}

/**
 * Create paginated API client
 *
 * Similar to createStandardApiClient but with pagination support.
 *
 * @param basePath - API endpoint base path
 * @returns Paginated API client object
 *
 * @example
 * ```tsx
 * export const transactionsApi = createPaginatedApiClient<Transaction>('/transactions');
 *
 * // Usage
 * const response = await transactionsApi.list({ page: 1, limit: 20 });
 * console.log(response.data); // Transaction[]
 * console.log(response.pagination); // { page, limit, total, totalPages }
 * ```
 */
export function createPaginatedApiClient<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  basePath: string
): PaginatedApiClient<T, TCreate, TUpdate> {
  return {
    list: (params?, config?) =>
      apiClient.get<PaginatedResponse<T>>(basePath, { params, ...config }),

    get: (id, config?) =>
      apiClient.get<ApiResponse<T>>(`${basePath}/${id}`, config),

    create: (data, config?) =>
      apiClient.post<ApiResponse<T>>(basePath, data, config),

    update: (id, data, config?) =>
      apiClient.put<ApiResponse<T>>(`${basePath}/${id}`, data, config),

    delete: (id, config?) =>
      apiClient.delete<void>(`${basePath}/${id}`, config),
  };
}

/**
 * Create API client with custom methods
 *
 * Extends standard client with additional custom endpoints.
 *
 * @param basePath - API endpoint base path
 * @param customMethods - Additional methods to add
 * @returns Extended API client
 *
 * @example
 * ```tsx
 * export const ordersApi = createApiClientWithCustom<Order>('/orders', {
 *   // Add custom method
 *   updateStatus: (id: string, status: string) =>
 *     apiClient.patch(`/orders/${id}/status`, { status }),
 *
 *   // Add bulk operation
 *   bulkDelete: (ids: string[]) =>
 *     apiClient.post('/orders/bulk-delete', { ids }),
 * });
 *
 * // Usage
 * await ordersApi.list(); // Standard method
 * await ordersApi.updateStatus('123', 'completed'); // Custom method
 * await ordersApi.bulkDelete(['1', '2', '3']); // Custom method
 * ```
 */
export function createApiClientWithCustom<
  T,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
  TCustom extends Record<string, (...args: unknown[]) => unknown> = Record<string, never>
>(
  basePath: string,
  customMethods: TCustom
): StandardApiClient<T, TCreate, TUpdate> & TCustom {
  const standardClient = createStandardApiClient<T, TCreate, TUpdate>(basePath);

  return {
    ...standardClient,
    ...customMethods,
  };
}

/**
 * Create nested resource API client
 *
 * For nested resources like /products/:id/variants
 *
 * @param parentPath - Parent resource path
 * @param childPath - Child resource path
 * @returns Nested API client
 *
 * @example
 * ```tsx
 * export const productVariantsApi = createNestedApiClient<ProductVariant>(
 *   '/products',
 *   'variants'
 * );
 *
 * // Usage
 * const variants = await productVariantsApi.list('product-123'); // GET /products/product-123/variants
 * const variant = await productVariantsApi.get('product-123', 'variant-456'); // GET /products/product-123/variants/variant-456
 * await productVariantsApi.create('product-123', variantData); // POST /products/product-123/variants
 * ```
 */
export interface NestedApiClient<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list: (
    parentId: string,
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ) => Promise<ApiResponse<T[]>>;
  get: (parentId: string, id: string, config?: AxiosRequestConfig) => Promise<ApiResponse<T>>;
  create: (parentId: string, data: TCreate, config?: AxiosRequestConfig) => Promise<ApiResponse<T>>;
  update: (
    parentId: string,
    id: string,
    data: TUpdate,
    config?: AxiosRequestConfig
  ) => Promise<ApiResponse<T>>;
  delete: (parentId: string, id: string, config?: AxiosRequestConfig) => Promise<void>;
}

export function createNestedApiClient<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  parentPath: string,
  childPath: string
): NestedApiClient<T, TCreate, TUpdate> {
  return {
    list: (parentId, params?, config?) =>
      apiClient.get<ApiResponse<T[]>>(`${parentPath}/${parentId}/${childPath}`, {
        params,
        ...config,
      }),

    get: (parentId, id, config?) =>
      apiClient.get<ApiResponse<T>>(`${parentPath}/${parentId}/${childPath}/${id}`, config),

    create: (parentId, data, config?) =>
      apiClient.post<ApiResponse<T>>(`${parentPath}/${parentId}/${childPath}`, data, config),

    update: (parentId, id, data, config?) =>
      apiClient.put<ApiResponse<T>>(`${parentPath}/${parentId}/${childPath}/${id}`, data, config),

    delete: (parentId, id, config?) =>
      apiClient.delete<void>(`${parentPath}/${parentId}/${childPath}/${id}`, config),
  };
}

/**
 * Create read-only API client
 *
 * For endpoints that only support GET operations.
 *
 * @param basePath - API endpoint base path
 * @returns Read-only API client
 *
 * @example
 * ```tsx
 * export const metricsApi = createReadOnlyApiClient<Metric>('/metrics');
 *
 * // Only list() and get() available
 * const metrics = await metricsApi.list();
 * const metric = await metricsApi.get('daily-sales');
 * ```
 */
export interface ReadOnlyApiClient<T> {
  list: (params?: Record<string, unknown>, config?: AxiosRequestConfig) => Promise<ApiResponse<T[]>>;
  get: (id: string, config?: AxiosRequestConfig) => Promise<ApiResponse<T>>;
}

export function createReadOnlyApiClient<T>(basePath: string): ReadOnlyApiClient<T> {
  return {
    list: (params?, config?) =>
      apiClient.get<ApiResponse<T[]>>(basePath, { params, ...config }),

    get: (id, config?) =>
      apiClient.get<ApiResponse<T>>(`${basePath}/${id}`, config),
  };
}

/**
 * Create action-based API client
 *
 * For resources with custom actions instead of standard CRUD.
 *
 * @param basePath - API endpoint base path
 * @param actions - Custom action methods
 * @returns Action-based API client
 *
 * @example
 * ```tsx
 * export const shiftsApi = createActionApiClient('/shifts', {
 *   start: (data: StartShiftDto) =>
 *     apiClient.post('/shifts/start', data),
 *
 *   end: (id: string, data: EndShiftDto) =>
 *     apiClient.post(`/shifts/${id}/end`, data),
 *
 *   current: () =>
 *     apiClient.get('/shifts/current'),
 * });
 *
 * // Usage
 * await shiftsApi.start({ employeeId: '123', registerId: '456' });
 * await shiftsApi.end('shift-789', { closingAmount: 1000000 });
 * const currentShift = await shiftsApi.current();
 * ```
 */
export function createActionApiClient<
  TActions extends Record<string, (...args: unknown[]) => unknown>
>(
  basePath: string,
  actions: TActions
): TActions {
  return actions;
}

/**
 * Batch operation helper
 *
 * Utility for batch operations like bulk delete, bulk update, etc.
 *
 * @param basePath - API endpoint base path
 * @param operation - Operation name (e.g., 'delete', 'update', 'archive')
 * @param ids - Array of IDs
 * @param data - Optional data for bulk update
 * @returns Promise
 *
 * @example
 * ```tsx
 * // Bulk delete
 * await batchOperation('/products', 'delete', ['1', '2', '3']);
 *
 * // Bulk update
 * await batchOperation('/products', 'update', ['1', '2', '3'], { status: 'active' });
 * ```
 */
export function batchOperation(
  basePath: string,
  operation: string,
  ids: string[],
  data?: Record<string, unknown>
): Promise<void> {
  return apiClient.post(`${basePath}/bulk-${operation}`, {
    ids,
    ...data,
  });
}
