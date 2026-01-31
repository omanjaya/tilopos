import { PrismaProductRepository } from '../prisma-product.repository';
import { PrismaService } from '../../database/prisma.service';
import type { ProductRecord } from '@domain/interfaces/repositories/product.repository';

describe('PrismaProductRepository', () => {
  let repository: PrismaProductRepository;
  let mockPrisma: jest.Mocked<PrismaService>;

  const now = new Date();

  const makePrismaProduct = (overrides: Record<string, unknown> = {}) => ({
    id: 'prod-1',
    businessId: 'biz-1',
    categoryId: 'cat-1',
    sku: 'SKU-001',
    name: 'Nasi Goreng',
    description: null,
    imageUrl: null,
    basePrice: { toNumber: () => 25000 },
    costPrice: null,
    hasVariants: false,
    trackStock: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    variants: [],
    ...overrides,
  });

  const expectedProductRecord: ProductRecord = {
    id: 'prod-1',
    businessId: 'biz-1',
    categoryId: 'cat-1',
    sku: 'SKU-001',
    name: 'Nasi Goreng',
    description: null,
    imageUrl: null,
    basePrice: 25000,
    costPrice: null,
    hasVariants: false,
    trackStock: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    mockPrisma = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    repository = new PrismaProductRepository(mockPrisma);
  });

  describe('findById', () => {
    it('should return a product record when found', async () => {
      const prismaResult = makePrismaProduct();
      (mockPrisma.product.findUnique as jest.Mock).mockResolvedValue(prismaResult);

      const result = await repository.findById('prod-1');

      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        include: { variants: true },
      });
      expect(result).toEqual(expectedProductRecord);
    });

    it('should return null when product is not found', async () => {
      (mockPrisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByBusinessId', () => {
    it('should return active products for a business sorted by name', async () => {
      const prismaResults = [
        makePrismaProduct({ id: 'prod-1', name: 'Ayam Bakar' }),
        makePrismaProduct({ id: 'prod-2', name: 'Nasi Goreng' }),
      ];
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue(prismaResults);

      const result = await repository.findByBusinessId('biz-1');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { businessId: 'biz-1', isActive: true },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('prod-1');
      expect(result[1].id).toBe('prod-2');
    });

    it('should return empty array when no products exist', async () => {
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.findByBusinessId('biz-empty');

      expect(result).toEqual([]);
    });
  });

  describe('save', () => {
    it('should create a product and return the record', async () => {
      const inputRecord: ProductRecord = {
        id: 'prod-new',
        businessId: 'biz-1',
        categoryId: 'cat-1',
        sku: 'SKU-NEW',
        name: 'Mie Goreng',
        description: 'Delicious noodles',
        imageUrl: null,
        basePrice: 20000,
        costPrice: 8000,
        hasVariants: false,
        trackStock: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      const prismaCreated = makePrismaProduct({
        id: 'prod-new',
        sku: 'SKU-NEW',
        name: 'Mie Goreng',
        description: 'Delicious noodles',
        basePrice: { toNumber: () => 20000 },
        costPrice: { toNumber: () => 8000 },
      });
      (mockPrisma.product.create as jest.Mock).mockResolvedValue(prismaCreated);

      const result = await repository.save(inputRecord);

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: {
          id: 'prod-new',
          businessId: 'biz-1',
          categoryId: 'cat-1',
          sku: 'SKU-NEW',
          name: 'Mie Goreng',
          description: 'Delicious noodles',
          imageUrl: null,
          basePrice: 20000,
          costPrice: 8000,
          hasVariants: false,
          trackStock: true,
          isActive: true,
        },
        include: { variants: true },
      });
      expect(result.id).toBe('prod-new');
      expect(result.name).toBe('Mie Goreng');
    });
  });

  describe('update', () => {
    it('should update a product and return the updated record', async () => {
      const prismaUpdated = makePrismaProduct({
        name: 'Nasi Goreng Special',
        basePrice: { toNumber: () => 30000 },
      });
      (mockPrisma.product.update as jest.Mock).mockResolvedValue(prismaUpdated);

      const result = await repository.update('prod-1', {
        name: 'Nasi Goreng Special',
        basePrice: 30000,
      });

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: expect.objectContaining({
          name: 'Nasi Goreng Special',
          basePrice: 30000,
        }),
        include: { variants: true },
      });
      expect(result.name).toBe('Nasi Goreng Special');
      expect(result.basePrice).toBe(30000);
    });

    it('should only include defined fields in the update data', async () => {
      const prismaUpdated = makePrismaProduct({ isActive: false });
      (mockPrisma.product.update as jest.Mock).mockResolvedValue(prismaUpdated);

      await repository.update('prod-1', { isActive: false });

      const callArgs = (mockPrisma.product.update as jest.Mock).mock.calls[0][0];
      expect(callArgs.data).toEqual({ isActive: false });
    });
  });

  describe('delete', () => {
    it('should soft-delete a product by setting isActive to false', async () => {
      (mockPrisma.product.update as jest.Mock).mockResolvedValue({});

      await repository.delete('prod-1');

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { isActive: false },
      });
    });
  });

  describe('findByCategoryId', () => {
    it('should return active products for a category', async () => {
      const prismaResults = [makePrismaProduct()];
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue(prismaResults);

      const result = await repository.findByCategoryId('cat-1');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'cat-1', isActive: true },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findBySku', () => {
    it('should return a product by SKU', async () => {
      const prismaResult = makePrismaProduct();
      (mockPrisma.product.findFirst as jest.Mock).mockResolvedValue(prismaResult);

      const result = await repository.findBySku('biz-1', 'SKU-001');

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { businessId: 'biz-1', sku: 'SKU-001' },
      });
      expect(result).toEqual(expectedProductRecord);
    });

    it('should return null when SKU is not found', async () => {
      (mockPrisma.product.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.findBySku('biz-1', 'NONEXISTENT');

      expect(result).toBeNull();
    });
  });
});
