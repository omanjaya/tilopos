export const REPOSITORY_TOKENS = {
  PRODUCT: 'IProductRepository',
  INVENTORY: 'IInventoryRepository',
  ORDER: 'IOrderRepository',
  CUSTOMER: 'ICustomerRepository',
  EMPLOYEE: 'IEmployeeRepository',
  SHIFT: 'IShiftRepository',
  AUDIT: 'IAuditRepository',
  PROMOTION: 'IPromotionRepository',
  /** SettingsRepository facade (infrastructure/repositories/settings); no domain interface. */
  SETTINGS: 'SettingsRepository',
  DEVICE: 'IDeviceRepository',
  ONLINE_STORE: 'IOnlineStoreRepository',
  NOTIFICATION: 'INotificationRepository',
  INGREDIENT: 'IIngredientRepository',
  LOYALTY: 'ILoyaltyRepository',
  TABLE: 'ITableRepository',
  CREDIT_SALE: 'ICreditSaleRepository',
} as const;
