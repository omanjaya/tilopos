import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { PaginationQueryDto } from '../../shared/dtos/pagination-query.dto';
import { SuppliersService } from './suppliers.service';
import { ReceivePurchaseOrderUseCase } from '../../application/use-cases/inventory/receive-purchase-order.use-case';
import {
  ApprovePurchaseOrderDto,
  AutoReorderDto,
  CreatePurchaseOrderDto,
  CreateSupplierDto,
  PurchaseOrderListQueryDto,
  ReceivePurchaseOrderDto,
  RejectPurchaseOrderDto,
  ReorderSuggestionsQueryDto,
  SupplierAnalyticsQueryDto,
  SupplierHistoryQueryDto,
  SupplierListQueryDto,
  UpdateSupplierDto,
} from '../../application/dtos/supplier.dto';

const INVENTORY_ROLES = [EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.INVENTORY];
const APPROVER_ROLES = [EmployeeRole.OWNER, EmployeeRole.MANAGER];

/**
 * Suppliers and purchase orders. Every query is scoped to the caller's business
 * inside SuppliersService / ReceivePurchaseOrderUseCase (R3); no Prisma here (R18).
 */
@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly receivePurchaseOrderUseCase: ReceivePurchaseOrderUseCase,
  ) {}

  @Get()
  async list(@Query() query: SupplierListQueryDto, @CurrentUser() user: AuthUser) {
    return this.suppliersService.listSuppliers(user.businessId, query);
  }

  @Post()
  @Roles(...INVENTORY_ROLES)
  async create(@Body() dto: CreateSupplierDto, @CurrentUser() user: AuthUser) {
    return this.suppliersService.createSupplier(user.businessId, dto);
  }

  @Put(':id')
  @Roles(...INVENTORY_ROLES)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.suppliersService.updateSupplier(user.businessId, id, dto);
  }

  @Delete(':id')
  @Roles(...APPROVER_ROLES)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.suppliersService.deactivateSupplier(user.businessId, id);
    return { message: 'Supplier deactivated' };
  }

  // ─── Analytics ───────────────────────────────────────────────────────

  @Get('analytics')
  async getAnalytics(@Query() query: SupplierAnalyticsQueryDto, @CurrentUser() user: AuthUser) {
    return this.suppliersService.getSupplierAnalytics(
      user.businessId,
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Get('analytics/:id')
  async getSupplierAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SupplierAnalyticsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.suppliersService.getSupplierDetailedAnalytics(
      user.businessId,
      id,
      new Date(query.from),
      new Date(query.to),
    );
  }

  // ─── Auto-Reorder ───────────────────────────────────────────────────

  @Get('reorder-suggestions')
  async getReorderSuggestions(
    @Query() query: ReorderSuggestionsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.suppliersService.getReorderSuggestions(user, query.outletId);
  }

  @Post('auto-reorder')
  @Roles(...INVENTORY_ROLES)
  async autoReorder(@Body() dto: AutoReorderDto, @CurrentUser() user: AuthUser) {
    return this.suppliersService.autoReorder(user, dto.outletId);
  }

  // ─── Purchase Orders ────────────────────────────────────────────────

  @Get('purchase-orders')
  async listPOs(@Query() query: PurchaseOrderListQueryDto, @CurrentUser() user: AuthUser) {
    return this.suppliersService.listPurchaseOrders(user, query);
  }

  @Get('purchase-orders/pending')
  async getPendingPOs(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthUser) {
    return this.suppliersService.getPendingPurchaseOrders(user.businessId, query);
  }

  @Post('purchase-orders')
  @Roles(...INVENTORY_ROLES)
  async createPO(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.suppliersService.createPurchaseOrder(user, dto);
  }

  @Get('purchase-orders/:id')
  async getPO(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.suppliersService.getPurchaseOrder(user.businessId, id);
  }

  @Put('purchase-orders/:id/approve')
  @Roles(...APPROVER_ROLES)
  async approvePO(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovePurchaseOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.suppliersService.approvePurchaseOrder(
      user.businessId,
      id,
      user.employeeId,
      dto.notes,
    );
  }

  @Put('purchase-orders/:id/reject')
  @Roles(...APPROVER_ROLES)
  async rejectPO(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectPurchaseOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.suppliersService.rejectPurchaseOrder(
      user.businessId,
      id,
      user.employeeId,
      dto.reason,
    );
  }

  @Put('purchase-orders/:id/receive')
  @Roles(...INVENTORY_ROLES)
  async receivePO(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.receivePurchaseOrderUseCase.execute({
      purchaseOrderId: id,
      businessId: user.businessId,
      employeeId: user.employeeId,
      items: dto.items,
    });
  }

  // ─── Supplier Detail Analytics ──────────────────────────────────────

  @Get('comparison')
  async getComparison(@CurrentUser() user: AuthUser) {
    return this.suppliersService.getSupplierComparison(user.businessId);
  }

  @Get('reorder-alerts')
  async getReorderAlerts(@CurrentUser() user: AuthUser) {
    return this.suppliersService.getReorderAlerts(user.businessId);
  }

  @Get(':id/purchase-history')
  @Roles(...INVENTORY_ROLES)
  @ApiOperation({ summary: 'Purchase history for a supplier (business-time date range)' })
  async getPurchaseHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SupplierHistoryQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.suppliersService.getPurchaseHistory(user.businessId, id, query);
  }

  @Get(':id/payment-status')
  @Roles(...INVENTORY_ROLES)
  @ApiOperation({
    summary: 'PO receipt status for a supplier (no payment ledger: paymentTracking=NOT_AVAILABLE)',
  })
  async getPaymentStatus(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.suppliersService.getPaymentStatus(user.businessId, id);
  }

  // ─── Get by ID (must be AFTER all static routes) ──────────────────────

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.suppliersService.getSupplier(user.businessId, id);
  }
}
