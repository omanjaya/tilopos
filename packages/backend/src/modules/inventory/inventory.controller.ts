import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { TenantAccessService } from '../../shared/tenant';
import { businessDateKey } from '../../shared/utils/business-time';
import { CreateProductUseCase } from '../../application/use-cases/inventory/create-product.use-case';
import { UpdateStockUseCase } from '../../application/use-cases/inventory/update-stock.use-case';
import {
  CreateProductDto,
  UpdateProductDto,
  VariantDto,
  UpdateVariantDto,
} from '../../application/dtos/product.dto';
import {
  ProductListQueryDto,
  StockListQueryDto,
  CategoryListQueryDto,
  CostHistoryQueryDto,
  OutletProductIdsDto,
  ImportXlsxDto,
} from '../../application/dtos/product-query.dto';
import { UpdateStockDto } from '../../application/dtos/stock.dto';
import { CreateCategoryDto, UpdateCategoryDto } from '../../application/dtos/category.dto';
import {
  ImportProductsDto,
  ExportProductsQueryDto,
  StockDiscrepancyQueryDto,
  AutoRequestTransferDto,
} from '../../application/dtos/inventory-import-export.dto';
import {
  BulkUpdateProductsDto,
  BulkDeleteProductsDto,
} from '../../application/dtos/bulk-product.dto';
import {
  MAX_XLSX_FILE_BYTES,
  XLSX_MIME_TYPES,
} from '../../infrastructure/import/excel-parser.service';
import { InventoryService } from './inventory.service';
import { OutletProductService } from './outlet-product.service';
import { ProductCatalogService } from './product-catalog.service';

/** Multer options for XLSX uploads: size is enforced while streaming, not after buffering. */
const XLSX_UPLOAD = FileInterceptor('file', {
  limits: { fileSize: MAX_XLSX_FILE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const okType = XLSX_MIME_TYPES.includes(file.mimetype);
    const okName = /\.xlsx$/i.test(file.originalname);
    if (okType && okName) cb(null, true);
    else cb(new BadRequestException('Only .xlsx files are accepted'), false);
  },
});

const INVENTORY_WRITERS = [EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.INVENTORY];

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateStockUseCase: UpdateStockUseCase,
    private readonly tenant: TenantAccessService,
    private readonly inventoryService: InventoryService,
    private readonly outletProductService: OutletProductService,
    private readonly catalog: ProductCatalogService,
  ) {}

  @Get('products')
  @ApiOperation({ summary: 'List products (array, or paginated when page/limit is sent)' })
  async listProducts(@Query() query: ProductListQueryDto, @CurrentUser() user: AuthUser) {
    return this.catalog.listProducts(user, query);
  }

  @Get('products/barcode/:code')
  @ApiOperation({ summary: 'Lookup product by barcode or SKU' })
  async lookupByBarcode(@Param('code') code: string, @CurrentUser() user: AuthUser) {
    if (!code || code.length > 100) throw new BadRequestException('Invalid barcode');
    return this.catalog.lookupByBarcode(user, code);
  }

  @Post('products')
  @Roles(...INVENTORY_WRITERS)
  async createProduct(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    const result = await this.createProductUseCase.execute({
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

    // Return the full product (Decimals as numbers) so the frontend has name, basePrice, etc.
    return this.catalog.getProduct(user, result.productId);
  }

  // ==================== Bulk / import / export ====================
  // Static paths must be declared before products/:id.

  @Patch('products/bulk')
  @Roles(...INVENTORY_WRITERS)
  @ApiOperation({ summary: 'Bulk update products (category, price, status, etc.)' })
  async bulkUpdateProducts(@Body() dto: BulkUpdateProductsDto, @CurrentUser() user: AuthUser) {
    return this.inventoryService.bulkUpdateProducts(user.businessId, dto);
  }

  @Delete('products/bulk')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Bulk delete products (soft or hard delete)' })
  async bulkDeleteProducts(@Body() dto: BulkDeleteProductsDto, @CurrentUser() user: AuthUser) {
    return this.inventoryService.bulkDeleteProducts(user.businessId, dto);
  }

  @Post('products/import-xlsx/preview')
  @Roles(...INVENTORY_WRITERS)
  @UseInterceptors(XLSX_UPLOAD)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Preview XLSX file sheets and headers for product import' })
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  async previewXlsxImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    return this.catalog.previewXlsx(file.buffer);
  }

  @Post('products/import-xlsx')
  @Roles(...INVENTORY_WRITERS)
  @UseInterceptors(XLSX_UPLOAD)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import products from XLSX file' })
  async importXlsx(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportXlsxDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.catalog.importXlsx(user, file.buffer, dto);
  }

  @Post('products/import')
  @Roles(...INVENTORY_WRITERS)
  @ApiOperation({ summary: 'Batch import products from CSV or JSON' })
  async importProducts(@Body() dto: ImportProductsDto, @CurrentUser() user: AuthUser) {
    let rows;
    if (dto.format === 'csv') {
      rows = this.inventoryService.parseCsvToProductRows(dto.data);
    } else {
      try {
        rows = this.inventoryService.parseJsonToProductRows(dto.data);
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        throw new BadRequestException('Invalid JSON data');
      }
    }

    if (rows.length === 0) {
      throw new BadRequestException('No valid data rows found');
    }

    return this.inventoryService.importProducts(user.businessId, rows);
  }

  @Get('products/export')
  @Roles(...INVENTORY_WRITERS)
  @ApiOperation({ summary: 'Export products as CSV or JSON' })
  async exportProducts(
    @Query() query: ExportProductsQueryDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const day = businessDateKey();
    if (query.format === 'csv') {
      const csv = await this.inventoryService.exportProductsCsv(user.businessId, query.categoryId);
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="products-${day}.csv"`,
      });
      res.send(csv);
    } else {
      const json = await this.inventoryService.exportProductsJson(
        user.businessId,
        query.categoryId,
      );
      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="products-${day}.json"`,
      });
      res.send(json);
    }
  }

  // ==================== Single product ====================

  @Get('products/:id')
  async getProduct(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.catalog.getProduct(user, id);
  }

  @Put('products/:id')
  @Roles(...INVENTORY_WRITERS)
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalog.updateProduct(user, id, dto);
  }

  @Delete('products/:id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async deleteProduct(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.catalog.deactivateProduct(user, id);
    return { message: 'Product deactivated' };
  }

  // ==================== Variant Endpoints ====================

  @Post('products/:id/variants')
  @Roles(...INVENTORY_WRITERS)
  @ApiOperation({ summary: 'Add a variant to an existing product' })
  async addVariant(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: VariantDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalog.addVariant(user, productId, dto);
  }

  @Put('products/:id/variants/:variantId')
  @Roles(...INVENTORY_WRITERS)
  @ApiOperation({ summary: 'Update a product variant' })
  async updateVariant(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateVariantDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalog.updateVariant(user, productId, variantId, dto);
  }

  @Delete('products/:id/variants/:variantId')
  @Roles(...INVENTORY_WRITERS)
  @ApiOperation({ summary: 'Soft delete (deactivate) a product variant' })
  async deleteVariant(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalog.deactivateVariant(user, productId, variantId);
  }

  // ==================== Categories ====================

  @Get('categories')
  async listCategories(@Query() query: CategoryListQueryDto, @CurrentUser() user: AuthUser) {
    return this.catalog.listCategories(user, query);
  }

  @Get('categories/:id')
  async getCategory(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.catalog.getCategory(user, id);
  }

  @Post('categories')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthUser) {
    return this.catalog.createCategory(user, dto);
  }

  @Put('categories/:id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalog.updateCategory(user, id, dto);
  }

  @Delete('categories/:id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async deleteCategory(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.catalog.deactivateCategory(user, id);
    return { message: 'Category deactivated' };
  }

  // ==================== Outlet Product Assignment Endpoints ====================

  @Get('outlets/:outletId/products')
  @ApiOperation({ summary: 'Products assigned to an outlet (array, or paginated with page/limit)' })
  async getOutletProducts(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Query() query: ProductListQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.tenant.assertOutlet(user, outletId);
    return this.catalog.listProducts(user, query, outletId);
  }

  @Get('outlets/:outletId/products/unassigned')
  @ApiOperation({ summary: 'Get products NOT assigned to an outlet' })
  async getUnassignedProducts(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.tenant.assertOutlet(user, outletId);
    return this.outletProductService.getUnassignedProducts(outletId, user.businessId, user.role);
  }

  @Post('outlets/:outletId/products/assign')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Assign products to an outlet' })
  async assignProducts(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Body() dto: OutletProductIdsDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.tenant.assertOutlet(user, outletId);
    return this.outletProductService.bulkAssign(outletId, user.businessId, dto.productIds);
  }

  @Delete('outlets/:outletId/products')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Remove several products from an outlet' })
  async bulkRemoveOutletProducts(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Body() dto: OutletProductIdsDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.tenant.assertOutlet(user, outletId);
    return this.outletProductService.bulkRemove(outletId, user.businessId, dto.productIds);
  }

  @Delete('outlets/:outletId/products/:productId')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Remove a product from an outlet' })
  async removeOutletProduct(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.tenant.assertOutlet(user, outletId);
    await this.tenant.assertOwned('product', productId, user.businessId);
    await this.outletProductService.removeProduct(outletId, productId);
    return { message: 'Product removed from outlet' };
  }

  // ==================== Stock ====================
  // Static paths must be declared before stock/:outletId.

  @Get('stock/discrepancies')
  @Roles(...INVENTORY_WRITERS)
  @ApiOperation({ summary: 'Get stock discrepancy report' })
  async getStockDiscrepancies(
    @Query() query: StockDiscrepancyQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.tenant.assertOutlet(user, query.outletId);
    return this.inventoryService.getStockDiscrepancies(query.outletId);
  }

  @Post('stock/adjust')
  @Roles(...INVENTORY_WRITERS)
  async adjustStock(@Body() dto: UpdateStockDto, @CurrentUser() user: AuthUser) {
    await this.tenant.assertOutlet(user, dto.outletId);
    return this.updateStockUseCase.execute({
      businessId: user.businessId,
      outletId: dto.outletId,
      productId: dto.productId,
      variantId: dto.variantId,
      adjustmentType: dto.adjustmentType,
      quantity: dto.quantity,
      reason: dto.reason,
      employeeId: user.employeeId,
      unitCost: dto.unitCost,
    });
  }

  @Post('stock/auto-request')
  @Roles(...INVENTORY_WRITERS)
  @ApiOperation({ summary: 'Auto-create transfer request for low stock items' })
  async autoRequestTransfer(@Body() dto: AutoRequestTransferDto, @CurrentUser() user: AuthUser) {
    await this.tenant.assertOutlet(user, dto.outletId);
    await this.tenant.assertOutlet(user, dto.sourceOutletId);
    return this.inventoryService.autoRequestTransfer(
      user.businessId,
      dto.outletId,
      dto.sourceOutletId,
    );
  }

  @Get('stock/:outletId')
  async getStockLevels(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Query() query: StockListQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.tenant.assertOutlet(user, outletId);
    return this.inventoryService.listStockLevels(outletId, user.businessId, query);
  }

  @Get('stock/:outletId/low')
  async getLowStockItems(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.tenant.assertOutlet(user, outletId);
    return this.inventoryService.listLowStock(outletId, user.businessId);
  }

  // ==================== Cost Price History ====================

  @Get('cost-history/:productId')
  @Roles(...INVENTORY_WRITERS)
  @ApiOperation({ summary: 'Get cost price history for a product' })
  async getCostHistory(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: CostHistoryQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalog.getCostHistory(user, productId, query.variantId);
  }
}
