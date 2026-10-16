import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { TenantAccessService } from '../../shared/tenant';
import { CreateTransactionUseCase } from '../../application/use-cases/pos/create-transaction.use-case';
import { ProcessRefundUseCase } from '../../application/use-cases/pos/process-refund.use-case';
import { ProcessMultiPaymentUseCase } from '../../application/use-cases/billing/process-multi-payment.use-case';
import { VoidTransactionUseCase } from '../../application/use-cases/pos/void-transaction.use-case';
import { CashInUseCase } from '../../application/use-cases/pos/cash-in.use-case';
import { CashOutUseCase } from '../../application/use-cases/pos/cash-out.use-case';
import { HoldBillUseCase } from '../../application/use-cases/pos/hold-bill.use-case';
import { ListHeldBillsUseCase } from '../../application/use-cases/pos/list-held-bills.use-case';
import { ResumeBillUseCase } from '../../application/use-cases/pos/resume-bill.use-case';
import { ReprintReceiptUseCase } from '../../application/use-cases/pos/reprint-receipt.use-case';
import { TransactionQueriesUseCase } from '../../application/use-cases/pos/transaction-queries.use-case';
import {
  CreateTransactionDto,
  ListTransactionsQueryDto,
  MultiPaymentDto,
  OutletQueryDto,
  PreviewTransactionDto,
} from '../../application/dtos/transaction.dto';
import { ProcessRefundDto } from '../../application/dtos/refund.dto';
import { VoidTransactionDto } from '../../application/dtos/void-transaction.dto';
import { CashInDto, CashOutDto } from '../../application/dtos/cash-drawer.dto';
import {
  HoldBillDto,
  HeldBillsQueryDto,
  ResumeBillDto,
} from '../../application/dtos/hold-bill.dto';

const SELLERS = [
  EmployeeRole.CASHIER,
  EmployeeRole.SUPERVISOR,
  EmployeeRole.MANAGER,
  EmployeeRole.OWNER,
] as const;
const SUPERVISORS = [EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER] as const;

@ApiTags('POS')
@ApiBearerAuth()
@Controller('pos')
export class PosController {
  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly processRefundUseCase: ProcessRefundUseCase,
    private readonly processMultiPaymentUseCase: ProcessMultiPaymentUseCase,
    private readonly voidTransactionUseCase: VoidTransactionUseCase,
    private readonly cashInUseCase: CashInUseCase,
    private readonly cashOutUseCase: CashOutUseCase,
    private readonly holdBillUseCase: HoldBillUseCase,
    private readonly listHeldBillsUseCase: ListHeldBillsUseCase,
    private readonly resumeBillUseCase: ResumeBillUseCase,
    private readonly reprintReceiptUseCase: ReprintReceiptUseCase,
    private readonly queries: TransactionQueriesUseCase,
    private readonly tenant: TenantAccessService,
  ) {}

  /**
   * Outlet a caller may sell at: staff with an assigned outlet always use it
   * (a different dto outlet is rejected); owners/managers without one must name
   * an outlet of their business.
   */
  private async resolveSellingOutlet(user: AuthUser, requested?: string): Promise<string> {
    if (user.outletId) {
      if (requested && requested !== user.outletId) {
        throw new ForbiddenException('Cannot act for other outlets');
      }
      return user.outletId;
    }
    if (
      user.role !== EmployeeRole.OWNER &&
      user.role !== EmployeeRole.SUPER_ADMIN &&
      user.role !== EmployeeRole.MANAGER
    ) {
      throw new BadRequestException('Outlet not assigned');
    }
    return this.tenant.assertOutlet(user, requested);
  }

  @Post('transactions')
  @Roles(...SELLERS)
  async createTransaction(@Body() dto: CreateTransactionDto, @CurrentUser() user: AuthUser) {
    const outletId = await this.resolveSellingOutlet(user, dto.outletId);
    return this.createTransactionUseCase.execute({
      businessId: user.businessId,
      outletId,
      employeeId: user.employeeId,
      role: user.role,
      customerId: dto.customerId,
      shiftId: dto.shiftId,
      orderType: dto.orderType,
      tableId: dto.tableId,
      items: dto.items,
      payments: dto.payments,
      discounts: dto.discounts,
      notes: dto.notes,
      clientTransactionId: dto.clientTransactionId,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
    });
  }

  @Post('transactions/preview')
  @Roles(...SELLERS)
  @ApiOperation({ summary: 'Server-side totals for a cart (no side effects)' })
  async previewTransaction(@Body() dto: PreviewTransactionDto, @CurrentUser() user: AuthUser) {
    const outletId = await this.resolveSellingOutlet(user, dto.outletId);
    const priced = await this.createTransactionUseCase.preview({
      businessId: user.businessId,
      outletId,
      role: user.role,
      customerId: dto.customerId,
      orderType: dto.orderType,
      items: dto.items,
      discounts: dto.discounts,
      payments: dto.payments,
    });
    return {
      subtotal: priced.subtotal.toNumber(),
      discountAmount: priced.discountAmount.toNumber(),
      serviceCharge: priced.serviceCharge.toNumber(),
      taxAmount: priced.taxAmount.toNumber(),
      roundingAmount: priced.roundingAmount.toNumber(),
      grandTotal: priced.grandTotal.toNumber(),
      items: priced.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        bundleId: l.bundleId,
        productName: l.productName,
        unitPrice: l.unitPrice.toNumber(),
        quantity: l.quantity,
        subtotal: l.subtotal.toNumber(),
      })),
      discounts: priced.discounts.map((d) => ({
        source: d.source,
        promotionId: d.promotionId,
        voucherId: d.voucherId,
        amount: d.amount.toNumber(),
      })),
    };
  }

  @Get('transactions')
  @Roles(...SELLERS)
  async listTransactions(@Query() query: ListTransactionsQueryDto, @CurrentUser() user: AuthUser) {
    return this.queries.list(user, query);
  }

  @Get('transactions/:id')
  @Roles(...SELLERS)
  async getTransaction(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.queries.get(user, id);
  }

  @Post('refunds')
  @Roles(...SUPERVISORS)
  async processRefund(@Body() dto: ProcessRefundDto, @CurrentUser() user: AuthUser) {
    await this.queries.assertAccess(user, dto.transactionId);
    return this.processRefundUseCase.execute({
      transactionId: dto.transactionId,
      businessId: user.businessId,
      employeeId: user.employeeId,
      items: dto.items,
      refundMethod: dto.refundMethod,
      notes: dto.notes,
    });
  }

  @Post('transactions/:id/payments')
  @Roles(...SELLERS)
  async multiPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MultiPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.queries.assertAccess(user, id);
    return this.processMultiPaymentUseCase.execute({
      transactionId: id,
      businessId: user.businessId,
      payments: dto.payments,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  @Post('void')
  @Roles(...SUPERVISORS)
  async voidTransaction(@Body() dto: VoidTransactionDto, @CurrentUser() user: AuthUser) {
    // The outlet comes from the (tenant-verified) transaction, so owners and
    // managers without an assigned outlet can void from the back office.
    await this.queries.assertAccess(user, dto.transactionId);
    return this.voidTransactionUseCase.execute({
      transactionId: dto.transactionId,
      employeeId: user.employeeId,
      businessId: user.businessId,
      reason: dto.reason,
    });
  }

  @Post('cash-in')
  @Roles(...SELLERS)
  async cashIn(@Body() dto: CashInDto, @CurrentUser() user: AuthUser) {
    return this.cashInUseCase.execute({
      shiftId: dto.shiftId,
      employeeId: user.employeeId,
      businessId: user.businessId,
      outletId: user.outletId,
      amount: dto.amount,
      notes: dto.notes,
    });
  }

  @Post('cash-out')
  @Roles(...SELLERS)
  async cashOut(@Body() dto: CashOutDto, @CurrentUser() user: AuthUser) {
    return this.cashOutUseCase.execute({
      shiftId: dto.shiftId,
      employeeId: user.employeeId,
      businessId: user.businessId,
      outletId: user.outletId,
      amount: dto.amount,
      reason: dto.reason,
      notes: dto.notes,
    });
  }

  @Post('hold')
  @Roles(...SELLERS)
  async holdBill(@Body() dto: HoldBillDto, @CurrentUser() user: AuthUser) {
    const outletId = await this.resolveSellingOutlet(user, dto.outletId);
    return this.holdBillUseCase.execute({
      businessId: user.businessId,
      outletId,
      employeeId: user.employeeId,
      role: user.role,
      clientBillId: dto.clientBillId,
      customerId: dto.customerId,
      orderType: dto.orderType,
      discountAmount: dto.discountAmount,
      discountPercent: dto.discountPercent,
      tableId: dto.tableId,
      customerName: dto.customerName,
      items: dto.items,
      notes: dto.notes,
    });
  }

  @Get('held-bills')
  @Roles(...SELLERS)
  async listHeldBills(@Query() query: HeldBillsQueryDto, @CurrentUser() user: AuthUser) {
    const outletId = await this.resolveSellingOutlet(user, query.outletId);
    return this.listHeldBillsUseCase.execute(user.businessId, outletId, query.cursor);
  }

  @Post('resume/:billId')
  @Roles(...SELLERS)
  async resumeBill(
    @Body() dto: ResumeBillDto,
    @Param('billId', ParseUUIDPipe) billId: string,
    @Query() query: OutletQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const outletId = await this.resolveSellingOutlet(user, query.outletId);
    return this.resumeBillUseCase.execute({
      businessId: user.businessId,
      outletId,
      billId,
      requestId: dto.requestId,
      employeeId: user.employeeId,
    });
  }

  @Delete('held-bills/:billId')
  @Roles(...SELLERS)
  async discardHeldBill(
    @Param('billId', ParseUUIDPipe) billId: string,
    @Query() query: OutletQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const outletId = await this.resolveSellingOutlet(user, query.outletId);
    await this.listHeldBillsUseCase.discard(user.businessId, outletId, billId);
    return { success: true };
  }

  @Get('transactions/:id/reprint')
  @Roles(...SELLERS)
  async reprintReceipt(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.queries.assertAccess(user, id);
    return this.reprintReceiptUseCase.execute(id, user.businessId);
  }
}
