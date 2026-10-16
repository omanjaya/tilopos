import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { TenantAccessService } from '../../shared/tenant';
import { OutletAccessGuard } from '../../shared/guards/outlet-access.guard';
import { toPrismaPage } from '../../shared/dtos/pagination-query.dto';
import { PrismaCreditSaleRepository } from '../../infrastructure/repositories/prisma-credit-sale.repository';
import { CreateCreditTransactionUseCase } from '../../application/use-cases/credit/create-credit-transaction.use-case';
import { RecordCreditPaymentUseCase } from '../../application/use-cases/credit/record-credit-payment.use-case';
import {
  CreateCreditTransactionDto,
  RecordCreditPaymentDto,
  CreditSaleFilterDto,
  CustomerCreditSalesQueryDto,
  CreditOutstandingQueryDto,
} from '../../application/dtos/credit-sale.dto';
import { PaginationQueryDto } from '../../shared/dtos/pagination-query.dto';

const ALL_POS_ROLES = [
  EmployeeRole.CASHIER,
  EmployeeRole.SUPERVISOR,
  EmployeeRole.MANAGER,
  EmployeeRole.OWNER,
] as const;

@ApiTags('Credit Sales')
@ApiBearerAuth()
@Controller('credit-sales')
export class CreditController {
  constructor(
    private readonly creditSaleRepo: PrismaCreditSaleRepository,
    private readonly createCreditTx: CreateCreditTransactionUseCase,
    private readonly recordPayment: RecordCreditPaymentUseCase,
    private readonly tenant: TenantAccessService,
  ) {}

  /**
   * Outlets the caller may read: staff assigned to an outlet see only that
   * outlet; owners and business-wide staff get the verified requested outlet
   * or every outlet of the business.
   */
  private async readableOutletIds(user: AuthUser, requested?: string): Promise<string[]> {
    if (user.outletId && !OutletAccessGuard.canAccessAllOutlets(user)) {
      return [await this.tenant.assertOutlet(user, user.outletId)];
    }
    return this.tenant.resolveOutletIds(user, requested);
  }

  /** Outlet a sale is booked into; non-owner staff can only sell at their own outlet. */
  private async writableOutletId(user: AuthUser, requested?: string): Promise<string> {
    if (user.outletId && !OutletAccessGuard.canAccessAllOutlets(user)) {
      if (requested && requested !== user.outletId) {
        throw new BadRequestException('Cannot create credit sales for other outlets');
      }
      return this.tenant.assertOutlet(user, user.outletId);
    }
    return this.tenant.assertOutlet(user, requested ?? user.outletId);
  }

  private async getAccessibleSale(id: string, user: AuthUser) {
    const sale = await this.creditSaleRepo.findById(id, user.businessId);
    if (!sale) throw new NotFoundException('Credit sale not found');
    OutletAccessGuard.enforceOutletAccess(user, sale.outletId, 'credit sale');
    return sale;
  }

  @Post()
  @Roles(...ALL_POS_ROLES)
  async createCreditTransaction(
    @Body() dto: CreateCreditTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    const outletId = await this.writableOutletId(user, dto.outletId);
    return this.createCreditTx.execute({
      businessId: user.businessId,
      outletId,
      employeeId: user.employeeId,
      role: user.role,
      customerId: dto.customerId,
      shiftId: dto.shiftId,
      orderType: dto.orderType,
      tableId: dto.tableId,
      items: dto.items.map((i) => ({
        productId: i.productId,
        bundleId: i.bundleId,
        variantId: i.variantId,
        quantity: i.quantity,
        modifierIds: i.modifierIds,
        notes: i.notes,
        unitPrice: i.unitPrice,
      })),
      payments: dto.payments?.map((p) => ({
        method: p.method,
        amount: p.amount,
        referenceNumber: p.referenceNumber,
      })),
      notes: dto.notes,
      dueDate: dto.dueDate,
      creditNotes: dto.creditNotes,
      discountAmount: dto.discountAmount,
      discountPercent: dto.discountPercent,
    });
  }

  @Get()
  @Roles(...ALL_POS_ROLES)
  async listCreditSales(@Query() filters: CreditSaleFilterDto, @CurrentUser() user: AuthUser) {
    const outletIds = await this.readableOutletIds(user, filters.outletId);
    const page = toPrismaPage(filters);
    return this.creditSaleRepo.findAll({
      businessId: user.businessId,
      outletIds,
      customerId: filters.customerId,
      status: filters.status,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      ...page,
    });
  }

  @Get('reports/outstanding')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async getOutstandingReport(
    @Query() query: CreditOutstandingQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const outletIds = await this.readableOutletIds(user, query.outletId);
    return this.creditSaleRepo.getCustomerOutstanding(user.businessId, outletIds);
  }

  @Get('customer/:customerId')
  @Roles(...ALL_POS_ROLES)
  async getCustomerCreditSales(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: CustomerCreditSalesQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.tenant.assertOwned('customer', customerId, user.businessId);
    const outletIds = await this.readableOutletIds(user);
    return this.creditSaleRepo.findByCustomerId(customerId, user.businessId, {
      status: query.status,
      outletIds,
      ...toPrismaPage(query),
    });
  }

  @Get(':id')
  @Roles(...ALL_POS_ROLES)
  async getCreditSaleDetail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.getAccessibleSale(id, user);
  }

  @Post(':id/payments')
  @Roles(...ALL_POS_ROLES)
  async recordCreditPayment(
    @Param('id', ParseUUIDPipe) creditSaleId: string,
    @Body() dto: RecordCreditPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.getAccessibleSale(creditSaleId, user);
    return this.recordPayment.execute({
      businessId: user.businessId,
      creditSaleId,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      referenceNumber: dto.referenceNumber,
      notes: dto.notes,
      receivedBy: user.employeeId,
    });
  }

  @Get(':id/payments')
  @Roles(...ALL_POS_ROLES)
  async getCreditPayments(
    @Param('id', ParseUUIDPipe) creditSaleId: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.getAccessibleSale(creditSaleId, user);
    return this.creditSaleRepo.getPayments(creditSaleId, user.businessId, toPrismaPage(query));
  }
}
