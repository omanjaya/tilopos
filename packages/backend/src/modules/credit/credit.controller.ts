import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { ICreditSaleRepository } from '../../domain/interfaces/repositories/credit-sale.repository';
import { CreateCreditTransactionUseCase } from '../../application/use-cases/credit/create-credit-transaction.use-case';
import { RecordCreditPaymentUseCase } from '../../application/use-cases/credit/record-credit-payment.use-case';
import {
  CreateCreditTransactionDto,
  RecordCreditPaymentDto,
  CreditSaleFilterDto,
} from '../../application/dtos/credit-sale.dto';

@ApiTags('Credit Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('credit-sales')
export class CreditController {
  constructor(
    @Inject(REPOSITORY_TOKENS.CREDIT_SALE)
    private readonly creditSaleRepo: ICreditSaleRepository,
    private readonly createCreditTx: CreateCreditTransactionUseCase,
    private readonly recordPayment: RecordCreditPaymentUseCase,
    private readonly prisma: PrismaService,
  ) {}

  private async verifyCreditSaleAccess(creditSaleId: string, businessId: string): Promise<void> {
    const creditSale = await this.prisma.creditSale.findFirst({
      where: { id: creditSaleId },
      include: { outlet: { select: { businessId: true } } },
    });
    if (!creditSale || creditSale.outlet.businessId !== businessId) {
      throw new ForbiddenException('Access denied to this credit sale');
    }
  }

  @Post()
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async createCreditTransaction(
    @Body() dto: CreateCreditTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.createCreditTx.execute({
      outletId: user.outletId || dto.outletId,
      employeeId: user.employeeId,
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
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async listCreditSales(@Query() filters: CreditSaleFilterDto, @CurrentUser() user: AuthUser) {
    return this.creditSaleRepo.findAll({
      businessId: user.businessId,
      outletId: filters.outletId,
      customerId: filters.customerId,
      status: filters.status,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });
  }

  @Get('reports/outstanding')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async getOutstandingReport(@Query('outletId') outletId: string, @CurrentUser() user: AuthUser) {
    return this.creditSaleRepo.getCustomerOutstanding(user.businessId, outletId);
  }

  @Get('customer/:customerId')
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async getCustomerCreditSales(
    @Param('customerId') customerId: string,
    @Query('status') status: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.creditSaleRepo.findByCustomerId(customerId, status, user.businessId);
  }

  @Get(':id')
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async getCreditSaleDetail(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.verifyCreditSaleAccess(id, user.businessId);
    return this.creditSaleRepo.findById(id);
  }

  @Post(':id/payments')
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async recordCreditPayment(
    @Param('id') creditSaleId: string,
    @Body() dto: RecordCreditPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.verifyCreditSaleAccess(creditSaleId, user.businessId);
    return this.recordPayment.execute({
      creditSaleId,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      referenceNumber: dto.referenceNumber,
      notes: dto.notes,
      receivedBy: user.employeeId,
    });
  }

  @Get(':id/payments')
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async getCreditPayments(@Param('id') creditSaleId: string, @CurrentUser() user: AuthUser) {
    await this.verifyCreditSaleAccess(creditSaleId, user.businessId);
    return this.creditSaleRepo.getPayments(creditSaleId);
  }
}
