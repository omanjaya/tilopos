import { EarnLoyaltyPointsUseCase, EarnLoyaltyPointsParams } from './earn-loyalty-points.use-case';
import { AppError } from '@shared/errors/app-error';
import type {
  ILoyaltyRepository,
  LoyaltyProgramRecord,
  LoyaltyTierRecord,
  LoyaltyTransactionRecord,
} from '@domain/interfaces/repositories/loyalty.repository';
import type { ICustomerRepository, CustomerRecord } from '@domain/interfaces/repositories/customer.repository';

describe('EarnLoyaltyPointsUseCase', () => {
  let useCase: EarnLoyaltyPointsUseCase;
  let mockLoyaltyRepo: jest.Mocked<ILoyaltyRepository>;
  let mockCustomerRepo: jest.Mocked<ICustomerRepository>;

  const baseCustomer: CustomerRecord = {
    id: 'cust-1',
    businessId: 'biz-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '081234567890',
    loyaltyPoints: 100,
    loyaltyTier: 'Bronze',
    totalSpent: 500000,
    visitCount: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const activeProgram: LoyaltyProgramRecord = {
    id: 'prog-1',
    businessId: 'biz-1',
    name: 'Standard Loyalty',
    pointsPerAmount: 1,
    amountPerPoint: 10000, // 1 point per 10,000 IDR
    redemptionRate: 100,
    pointExpiryDays: 365,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const bronzeTier: LoyaltyTierRecord = {
    id: 'tier-1',
    businessId: 'biz-1',
    name: 'Bronze',
    minPoints: 0,
    minSpent: 0,
    pointMultiplier: 1,
    benefits: {},
    sortOrder: 1,
    isActive: true,
    createdAt: new Date(),
  };

  const silverTier: LoyaltyTierRecord = {
    id: 'tier-2',
    businessId: 'biz-1',
    name: 'Silver',
    minPoints: 200,
    minSpent: 1000000,
    pointMultiplier: 1.5,
    benefits: {},
    sortOrder: 2,
    isActive: true,
    createdAt: new Date(),
  };

  const goldTier: LoyaltyTierRecord = {
    id: 'tier-3',
    businessId: 'biz-1',
    name: 'Gold',
    minPoints: 500,
    minSpent: 5000000,
    pointMultiplier: 2,
    benefits: {},
    sortOrder: 3,
    isActive: true,
    createdAt: new Date(),
  };

  const baseParams: EarnLoyaltyPointsParams = {
    customerId: 'cust-1',
    transactionId: 'txn-1',
    transactionTotal: 100000,
    employeeId: 'emp-1',
  };

  beforeEach(() => {
    mockLoyaltyRepo = {
      findActiveProgram: jest.fn(),
      findProgramById: jest.fn(),
      findTiersByBusiness: jest.fn(),
      findTierById: jest.fn(),
      findEligibleTier: jest.fn(),
      createTransaction: jest.fn(),
      findTransactionsByCustomer: jest.fn(),
      updateCustomerPoints: jest.fn(),
      findCustomerById: jest.fn(),
    };

    mockCustomerRepo = {
      findById: jest.fn(),
      findByBusinessId: jest.fn(),
      findByPhone: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new EarnLoyaltyPointsUseCase(mockLoyaltyRepo, mockCustomerRepo);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should earn points based on transaction total', async () => {
    mockCustomerRepo.findById.mockResolvedValue(baseCustomer);
    mockLoyaltyRepo.findActiveProgram.mockResolvedValue(activeProgram);
    mockLoyaltyRepo.findTiersByBusiness.mockResolvedValue([bronzeTier, silverTier, goldTier]);
    mockLoyaltyRepo.findEligibleTier.mockResolvedValue(bronzeTier);
    mockLoyaltyRepo.createTransaction.mockResolvedValue({} as LoyaltyTransactionRecord);
    mockLoyaltyRepo.updateCustomerPoints.mockResolvedValue();
    mockCustomerRepo.update.mockResolvedValue(baseCustomer);

    const result = await useCase.execute(baseParams);

    // 100000 / 10000 * 1 (Bronze multiplier) = 10 points
    expect(result.pointsEarned).toBe(10);
    expect(result.totalPoints).toBe(110); // 100 existing + 10 earned
    expect(result.tierChanged).toBe(false);
  });

  it('should apply tier multiplier correctly for Silver tier', async () => {
    const silverCustomer: CustomerRecord = {
      ...baseCustomer,
      loyaltyTier: 'Silver',
      loyaltyPoints: 250,
    };

    mockCustomerRepo.findById.mockResolvedValue(silverCustomer);
    mockLoyaltyRepo.findActiveProgram.mockResolvedValue(activeProgram);
    mockLoyaltyRepo.findTiersByBusiness.mockResolvedValue([bronzeTier, silverTier, goldTier]);
    mockLoyaltyRepo.findEligibleTier.mockResolvedValue(silverTier);
    mockLoyaltyRepo.createTransaction.mockResolvedValue({} as LoyaltyTransactionRecord);
    mockLoyaltyRepo.updateCustomerPoints.mockResolvedValue();
    mockCustomerRepo.update.mockResolvedValue(silverCustomer);

    const result = await useCase.execute(baseParams);

    // 100000 / 10000 * 1.5 (Silver multiplier) = 15 points
    expect(result.pointsEarned).toBe(15);
    expect(result.totalPoints).toBe(265); // 250 + 15
  });

  it('should apply Gold tier multiplier (2x)', async () => {
    const goldCustomer: CustomerRecord = {
      ...baseCustomer,
      loyaltyTier: 'Gold',
      loyaltyPoints: 600,
      totalSpent: 6000000,
    };

    mockCustomerRepo.findById.mockResolvedValue(goldCustomer);
    mockLoyaltyRepo.findActiveProgram.mockResolvedValue(activeProgram);
    mockLoyaltyRepo.findTiersByBusiness.mockResolvedValue([bronzeTier, silverTier, goldTier]);
    mockLoyaltyRepo.findEligibleTier.mockResolvedValue(goldTier);
    mockLoyaltyRepo.createTransaction.mockResolvedValue({} as LoyaltyTransactionRecord);
    mockLoyaltyRepo.updateCustomerPoints.mockResolvedValue();
    mockCustomerRepo.update.mockResolvedValue(goldCustomer);

    const result = await useCase.execute(baseParams);

    // 100000 / 10000 * 2 (Gold multiplier) = 20 points
    expect(result.pointsEarned).toBe(20);
    expect(result.totalPoints).toBe(620); // 600 + 20
  });

  it('should return zero points when no active loyalty program exists', async () => {
    mockCustomerRepo.findById.mockResolvedValue(baseCustomer);
    mockLoyaltyRepo.findActiveProgram.mockResolvedValue(null);

    const result = await useCase.execute(baseParams);

    expect(result.pointsEarned).toBe(0);
    expect(result.totalPoints).toBe(100); // unchanged
    expect(result.tierChanged).toBe(false);
    expect(mockLoyaltyRepo.createTransaction).not.toHaveBeenCalled();
    expect(mockLoyaltyRepo.updateCustomerPoints).not.toHaveBeenCalled();
  });

  it('should throw AppError when customer is not found', async () => {
    mockCustomerRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(baseParams)).rejects.toThrow(AppError);
    await expect(useCase.execute(baseParams)).rejects.toThrow('Customer not found');
  });

  it('should detect tier upgrade and return new tier', async () => {
    // Customer at Bronze with 195 points; earning 10 more puts them at 205
    const nearUpgradeCustomer: CustomerRecord = {
      ...baseCustomer,
      loyaltyPoints: 195,
      totalSpent: 950000,
    };

    mockCustomerRepo.findById.mockResolvedValue(nearUpgradeCustomer);
    mockLoyaltyRepo.findActiveProgram.mockResolvedValue(activeProgram);
    mockLoyaltyRepo.findTiersByBusiness.mockResolvedValue([bronzeTier, silverTier, goldTier]);
    // After earning, eligible for Silver
    mockLoyaltyRepo.findEligibleTier.mockResolvedValue(silverTier);
    mockLoyaltyRepo.createTransaction.mockResolvedValue({} as LoyaltyTransactionRecord);
    mockLoyaltyRepo.updateCustomerPoints.mockResolvedValue();
    mockCustomerRepo.update.mockResolvedValue(nearUpgradeCustomer);

    const result = await useCase.execute(baseParams);

    expect(result.pointsEarned).toBe(10);
    expect(result.totalPoints).toBe(205);
    expect(result.tierChanged).toBe(true);
    expect(result.newTier).toBe('Silver');
    expect(mockLoyaltyRepo.updateCustomerPoints).toHaveBeenCalledWith('cust-1', 205, 'Silver');
  });

  it('should NOT indicate tier change when tier stays the same', async () => {
    mockCustomerRepo.findById.mockResolvedValue(baseCustomer);
    mockLoyaltyRepo.findActiveProgram.mockResolvedValue(activeProgram);
    mockLoyaltyRepo.findTiersByBusiness.mockResolvedValue([bronzeTier, silverTier, goldTier]);
    mockLoyaltyRepo.findEligibleTier.mockResolvedValue(bronzeTier);
    mockLoyaltyRepo.createTransaction.mockResolvedValue({} as LoyaltyTransactionRecord);
    mockLoyaltyRepo.updateCustomerPoints.mockResolvedValue();
    mockCustomerRepo.update.mockResolvedValue(baseCustomer);

    const result = await useCase.execute(baseParams);

    expect(result.tierChanged).toBe(false);
    expect(result.newTier).toBeUndefined();
  });

  it('should create loyalty transaction record with expiry date', async () => {
    mockCustomerRepo.findById.mockResolvedValue(baseCustomer);
    mockLoyaltyRepo.findActiveProgram.mockResolvedValue(activeProgram); // 365 pointExpiryDays
    mockLoyaltyRepo.findTiersByBusiness.mockResolvedValue([bronzeTier]);
    mockLoyaltyRepo.findEligibleTier.mockResolvedValue(bronzeTier);
    mockLoyaltyRepo.createTransaction.mockResolvedValue({} as LoyaltyTransactionRecord);
    mockLoyaltyRepo.updateCustomerPoints.mockResolvedValue();
    mockCustomerRepo.update.mockResolvedValue(baseCustomer);

    await useCase.execute(baseParams);

    expect(mockLoyaltyRepo.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        transactionId: 'txn-1',
        type: 'earned',
        points: 10,
        balanceAfter: 110,
        expiresAt: expect.any(Date),
        createdBy: 'emp-1',
      }),
    );
  });

  it('should update customer totalSpent and visitCount', async () => {
    mockCustomerRepo.findById.mockResolvedValue(baseCustomer);
    mockLoyaltyRepo.findActiveProgram.mockResolvedValue(activeProgram);
    mockLoyaltyRepo.findTiersByBusiness.mockResolvedValue([bronzeTier]);
    mockLoyaltyRepo.findEligibleTier.mockResolvedValue(bronzeTier);
    mockLoyaltyRepo.createTransaction.mockResolvedValue({} as LoyaltyTransactionRecord);
    mockLoyaltyRepo.updateCustomerPoints.mockResolvedValue();
    mockCustomerRepo.update.mockResolvedValue(baseCustomer);

    await useCase.execute(baseParams);

    expect(mockCustomerRepo.update).toHaveBeenCalledWith('cust-1', {
      totalSpent: 600000, // 500000 + 100000
      visitCount: 11, // 10 + 1
    });
  });

  it('should return zero points when transaction total is too small for any points', async () => {
    mockCustomerRepo.findById.mockResolvedValue(baseCustomer);
    mockLoyaltyRepo.findActiveProgram.mockResolvedValue(activeProgram);
    mockLoyaltyRepo.findTiersByBusiness.mockResolvedValue([bronzeTier]);

    const tinyTransaction: EarnLoyaltyPointsParams = {
      ...baseParams,
      transactionTotal: 5000, // less than amountPerPoint (10000)
    };

    const result = await useCase.execute(tinyTransaction);

    // 5000 / 10000 * 1 = 0.5 -> floor = 0
    expect(result.pointsEarned).toBe(0);
    expect(result.totalPoints).toBe(100); // unchanged
    expect(mockLoyaltyRepo.createTransaction).not.toHaveBeenCalled();
  });

  it('should use multiplier 1 when customer tier is not found in tiers list', async () => {
    const unknownTierCustomer: CustomerRecord = {
      ...baseCustomer,
      loyaltyTier: 'Platinum', // not in available tiers
    };

    mockCustomerRepo.findById.mockResolvedValue(unknownTierCustomer);
    mockLoyaltyRepo.findActiveProgram.mockResolvedValue(activeProgram);
    mockLoyaltyRepo.findTiersByBusiness.mockResolvedValue([bronzeTier, silverTier, goldTier]);
    mockLoyaltyRepo.findEligibleTier.mockResolvedValue(null);
    mockLoyaltyRepo.createTransaction.mockResolvedValue({} as LoyaltyTransactionRecord);
    mockLoyaltyRepo.updateCustomerPoints.mockResolvedValue();
    mockCustomerRepo.update.mockResolvedValue(unknownTierCustomer);

    const result = await useCase.execute(baseParams);

    // multiplier defaults to 1 when tier not found
    // 100000 / 10000 * 1 = 10
    expect(result.pointsEarned).toBe(10);
  });

  it('should handle program without point expiry', async () => {
    const noExpiryProgram: LoyaltyProgramRecord = {
      ...activeProgram,
      pointExpiryDays: null,
    };

    mockCustomerRepo.findById.mockResolvedValue(baseCustomer);
    mockLoyaltyRepo.findActiveProgram.mockResolvedValue(noExpiryProgram);
    mockLoyaltyRepo.findTiersByBusiness.mockResolvedValue([bronzeTier]);
    mockLoyaltyRepo.findEligibleTier.mockResolvedValue(bronzeTier);
    mockLoyaltyRepo.createTransaction.mockResolvedValue({} as LoyaltyTransactionRecord);
    mockLoyaltyRepo.updateCustomerPoints.mockResolvedValue();
    mockCustomerRepo.update.mockResolvedValue(baseCustomer);

    await useCase.execute(baseParams);

    expect(mockLoyaltyRepo.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresAt: undefined,
      }),
    );
  });
});
