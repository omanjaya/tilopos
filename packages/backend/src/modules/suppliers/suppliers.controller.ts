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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { ISupplierRepository } from '../../domain/interfaces/repositories/supplier.repository';
import { SuppliersService } from './suppliers.service';
import {
  SupplierAnalyticsQueryDto,
  AutoReorderDto,
  ReorderSuggestionsQueryDto,
  ApprovePurchaseOrderDto,
  RejectPurchaseOrderDto,
} from '../../application/dtos/supplier.dto';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(
    @Inject(REPOSITORY_TOKENS.SUPPLIER)
    private readonly supplierRepo: ISupplierRepository,
    private readonly suppliersService: SuppliersService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.supplierRepo.findByBusinessId(user.businessId);
  }

  @Post()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  async create(
    @Body()
    dto: {
      name: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.supplierRepo.save({
      businessId: user.businessId,
      name: dto.name,
      contactPerson: dto.contactPerson || null,
      phone: dto.phone || null,
      email: dto.email || null,
      address: dto.address || null,
    });
  }

  @Put(':id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  async update(
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.supplierRepo.update(id, dto);
  }

  @Delete(':id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async remove(@Param('id') id: string) {
    await this.supplierRepo.deactivate(id);
    return { message: 'Supplier deactivated' };
  }

  // ─── Analytics ───────────────────────────────────────────────────────

  @Get('analytics')
  async getAnalytics(@Query() query: SupplierAnalyticsQueryDto) {
    return this.suppliersService.getSupplierAnalytics(
      query.businessId,
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Get('analytics/:id')
  async getSupplierAnalytics(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException('from and to query parameters are required');
    }

    const analytics = await this.suppliersService.getSupplierDetailedAnalytics(
      id,
      new Date(from),
      new Date(to),
    );

    if (!analytics) {
      throw new NotFoundException('Supplier not found');
    }

    return analytics;
  }

  // ─── Auto-Reorder ───────────────────────────────────────────────────

  @Get('reorder-suggestions')
  async getReorderSuggestions(@Query() query: ReorderSuggestionsQueryDto) {
    return this.suppliersService.getReorderSuggestions(query.outletId);
  }

  @Post('auto-reorder')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  async autoReorder(
    @Body() dto: AutoReorderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.suppliersService.autoReorder(dto.outletId, user.employeeId);
  }

  // ─── Purchase Orders ────────────────────────────────────────────────

  @Get('purchase-orders')
  async listPOs(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId?: string,
    @Query('status') status?: string,
  ) {
    // If outletId is provided, filter by outlet; otherwise get all for the business
    if (outletId) {
      return this.supplierRepo.findPurchaseOrdersByOutlet(outletId);
    }

    return this.suppliersService.findPurchaseOrdersByBusiness(user.businessId, status);
  }

  @Get('purchase-orders/pending')
  async getPendingPOs(@CurrentUser() user: AuthUser) {
    return this.suppliersService.getPendingPurchaseOrders(user.businessId);
  }

  @Post('purchase-orders')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  async createPO(
    @Body()
    dto: {
      outletId: string;
      supplierId: string;
      items: {
        itemName: string;
        quantityOrdered: number;
        unitCost: number;
        productId?: string;
        variantId?: string;
        ingredientId?: string;
      }[];
    },
    @CurrentUser() user: AuthUser,
  ) {
    const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
    const totalAmount = dto.items.reduce(
      (sum, i) => sum + i.quantityOrdered * i.unitCost,
      0,
    );
    return this.supplierRepo.createPurchaseOrder({
      outletId: dto.outletId,
      supplierId: dto.supplierId,
      poNumber,
      totalAmount,
      createdBy: user.employeeId,
      items: dto.items.map((i) => ({
        itemName: i.itemName,
        quantityOrdered: i.quantityOrdered,
        unitCost: i.unitCost,
        subtotal: i.quantityOrdered * i.unitCost,
        productId: i.productId || null,
        variantId: i.variantId || null,
        ingredientId: i.ingredientId || null,
      })),
    });
  }

  @Get('purchase-orders/:id')
  async getPO(@Param('id') id: string) {
    const po = await this.supplierRepo.findPurchaseOrderById(id);
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  @Put('purchase-orders/:id/approve')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async approvePO(
    @Param('id') id: string,
    @Body() dto: ApprovePurchaseOrderDto,
  ) {
    return this.suppliersService.approvePurchaseOrder(
      id,
      dto.approvedBy,
      dto.notes,
    );
  }

  @Put('purchase-orders/:id/reject')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async rejectPO(
    @Param('id') id: string,
    @Body() dto: RejectPurchaseOrderDto,
  ) {
    return this.suppliersService.rejectPurchaseOrder(
      id,
      dto.rejectedBy,
      dto.reason,
    );
  }

  @Put('purchase-orders/:id/receive')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  async receivePO(@Param('id') id: string) {
    return this.supplierRepo.receivePurchaseOrder(id);
  }
}
