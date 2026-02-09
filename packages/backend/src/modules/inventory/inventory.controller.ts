import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  NotFoundException,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { CreateProductUseCase } from '../../application/use-cases/inventory/create-product.use-case';
import { UpdateStockUseCase } from '../../application/use-cases/inventory/update-stock.use-case';
import { CreateProductDto } from '../../application/dtos/product.dto';
import { UpdateStockDto } from '../../application/dtos/stock.dto';
import { CreateCategoryDto, UpdateCategoryDto } from '../../application/dtos/category.dto';
import {
  ImportProductsDto,
  ExportProductsQueryDto,
  StockDiscrepancyQueryDto,
  AutoRequestTransferDto,
} from '../../application/dtos/inventory-import-export.dto';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { IProductRepository } from '../../domain/interfaces/repositories/product.repository';
import type { IInventoryRepository } from '../../domain/interfaces/repositories/inventory.repository';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateStockUseCase: UpdateStockUseCase,
    @Inject(REPOSITORY_TOKENS.PRODUCT)
    private readonly productRepo: IProductRepository,
    @Inject(REPOSITORY_TOKENS.INVENTORY)
    private readonly inventoryRepo: IInventoryRepository,
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Get('products')
  async listProducts(@CurrentUser() user: AuthUser) {
    return this.productRepo.findByBusinessId(user.businessId);
  }

  @Get('products/barcode/:code')
  @ApiOperation({ summary: 'Lookup product by barcode or SKU' })
  async lookupByBarcode(@Param('code') code: string, @CurrentUser() user: AuthUser) {
    // Try barcode first (product level)
    let product = await this.prisma.product.findFirst({
      where: { businessId: user.businessId, barcode: code, isActive: true },
      include: {
        variants: { where: { isActive: true } },
        category: { select: { name: true } },
        priceTiers: { where: { isActive: true }, orderBy: { minQuantity: 'asc' } },
      },
    });

    if (product) return { found: true, type: 'product', product, variant: null };

    // Try SKU (product level)
    product = await this.prisma.product.findFirst({
      where: { businessId: user.businessId, sku: code, isActive: true },
      include: {
        variants: { where: { isActive: true } },
        category: { select: { name: true } },
        priceTiers: { where: { isActive: true }, orderBy: { minQuantity: 'asc' } },
      },
    });

    if (product) return { found: true, type: 'product', product, variant: null };

    // Try barcode on variant
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        barcode: code,
        isActive: true,
        product: { businessId: user.businessId, isActive: true },
      },
      include: {
        product: {
          include: {
            category: { select: { name: true } },
            priceTiers: { where: { isActive: true }, orderBy: { minQuantity: 'asc' } },
          },
        },
      },
    });

    if (variant) return { found: true, type: 'variant', product: variant.product, variant };

    // Try SKU on variant
    const variantBySku = await this.prisma.productVariant.findFirst({
      where: {
        sku: code,
        isActive: true,
        product: { businessId: user.businessId, isActive: true },
      },
      include: {
        product: {
          include: {
            category: { select: { name: true } },
            priceTiers: { where: { isActive: true }, orderBy: { minQuantity: 'asc' } },
          },
        },
      },
    });

    if (variantBySku)
      return { found: true, type: 'variant', product: variantBySku.product, variant: variantBySku };

    throw new NotFoundException(`No product found with barcode/SKU: ${code}`);
  }

  @Post('products')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  async createProduct(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.createProductUseCase.execute({
      businessId: user.businessId,
      categoryId: dto.categoryId,
      sku: dto.sku,
      name: dto.name,
      description: dto.description,
      imageUrl: dto.imageUrl,
      basePrice: dto.basePrice,
      costPrice: dto.costPrice,
      trackStock: dto.trackStock,
      variants: dto.variants,
      modifierGroupIds: dto.modifierGroupIds,
    });
  }

  @Get('products/:id')
  async getProduct(@Param('id') id: string) {
    const product = await this.productRepo.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  @Put('products/:id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  async updateProduct(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    const product = await this.productRepo.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return this.productRepo.update(id, {
      name: dto.name ?? product.name,
      description: dto.description,
      imageUrl: dto.imageUrl,
      basePrice: dto.basePrice ?? product.basePrice,
      costPrice: dto.costPrice,
    });
  }

  @Delete('products/:id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async deleteProduct(@Param('id') id: string) {
    await this.productRepo.delete(id);
    return { message: 'Product deactivated' };
  }

  @Get('categories')
  async listCategories(@CurrentUser() user: AuthUser) {
    return this.prisma.category.findMany({
      where: { businessId: user.businessId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Post('categories')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthUser) {
    return this.prisma.category.create({
      data: {
        businessId: user.businessId,
        name: dto.name,
        parentId: dto.parentId || null,
        description: dto.description || null,
        imageUrl: dto.imageUrl || null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  @Put('categories/:id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  @Delete('categories/:id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async deleteCategory(@Param('id') id: string) {
    await this.prisma.category.update({ where: { id }, data: { isActive: false } });
    return { message: 'Category deactivated' };
  }

  // ==================== Import/Export Endpoints ====================
  // These must be defined before parameterized routes like products/:id

  @Post('products/import')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  @ApiOperation({ summary: 'Batch import products from CSV or JSON' })
  async importProducts(@Body() dto: ImportProductsDto, @CurrentUser() user: AuthUser) {
    let rows;

    if (dto.format === 'csv') {
      rows = this.inventoryService.parseCsvToProductRows(dto.data);
    } else {
      try {
        rows = this.inventoryService.parseJsonToProductRows(dto.data);
      } catch {
        throw new BadRequestException('Invalid JSON data');
      }
    }

    if (rows.length === 0) {
      throw new BadRequestException('No valid data rows found');
    }

    return this.inventoryService.importProducts(user.businessId, rows);
  }

  @Get('products/export')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  @ApiOperation({ summary: 'Export products as CSV or JSON' })
  async exportProducts(
    @Query() query: ExportProductsQueryDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    if (query.format === 'csv') {
      const csv = await this.inventoryService.exportProductsCsv(user.businessId, query.categoryId);
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="products-${new Date().toISOString().split('T')[0]}.csv"`,
      });
      res.send(csv);
    } else {
      const json = await this.inventoryService.exportProductsJson(
        user.businessId,
        query.categoryId,
      );
      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="products-${new Date().toISOString().split('T')[0]}.json"`,
      });
      res.send(json);
    }
  }

  // ==================== Stock Discrepancy Endpoints ====================
  // These must be defined before parameterized routes like stock/:outletId

  @Get('stock/discrepancies')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  @ApiOperation({ summary: 'Get stock discrepancy report' })
  async getStockDiscrepancies(@Query() query: StockDiscrepancyQueryDto) {
    return this.inventoryService.getStockDiscrepancies(query.outletId);
  }

  @Post('stock/adjust')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  async adjustStock(@Body() dto: UpdateStockDto, @CurrentUser() user: AuthUser) {
    return this.updateStockUseCase.execute({
      outletId: dto.outletId,
      productId: dto.productId,
      variantId: dto.variantId,
      adjustmentType: dto.adjustmentType,
      quantity: dto.quantity,
      reason: dto.reason,
      employeeId: user.employeeId,
    });
  }

  @Post('stock/auto-request')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  @ApiOperation({ summary: 'Auto-create transfer request for low stock items' })
  async autoRequestTransfer(@Body() dto: AutoRequestTransferDto, @CurrentUser() user: AuthUser) {
    return this.inventoryService.autoRequestTransfer(
      user.businessId,
      dto.outletId,
      dto.sourceOutletId,
    );
  }

  @Get('stock/:outletId')
  async getStockLevels(@Param('outletId') outletId: string) {
    return this.inventoryRepo.findStockLevelsByOutlet(outletId);
  }

  @Get('stock/:outletId/low')
  async getLowStockItems(@Param('outletId') outletId: string) {
    return this.inventoryRepo.findLowStockItems(outletId);
  }
}
