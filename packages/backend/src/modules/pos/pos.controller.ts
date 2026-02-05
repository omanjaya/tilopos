import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
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
import { CreateTransactionDto, PaymentDto } from '../../application/dtos/transaction.dto';
import { ProcessRefundDto } from '../../application/dtos/refund.dto';
import { VoidTransactionDto } from '../../application/dtos/void-transaction.dto';
import { CashInDto, CashOutDto } from '../../application/dtos/cash-drawer.dto';
import { HoldBillDto } from '../../application/dtos/hold-bill.dto';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { ITransactionRepository } from '../../domain/interfaces/repositories/transaction.repository';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { decimalToNumberRequired } from '../../infrastructure/repositories/decimal.helper';

@ApiTags('POS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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
    @Inject(REPOSITORY_TOKENS.TRANSACTION)
    private readonly transactionRepo: ITransactionRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Post('transactions')
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async createTransaction(@Body() dto: CreateTransactionDto, @CurrentUser() user: AuthUser) {
    const outletId = user.outletId || dto.outletId;
    if (!outletId) {
      throw new BadRequestException('Outlet ID is required');
    }
    // For non-owner roles, always use user's outlet
    if (user.role !== EmployeeRole.OWNER && user.role !== EmployeeRole.SUPER_ADMIN) {
      if (dto.outletId && dto.outletId !== user.outletId) {
        throw new ForbiddenException('Cannot create transaction for other outlets');
      }
    }
    return this.createTransactionUseCase.execute({
      outletId,
      employeeId: user.employeeId,
      customerId: dto.customerId,
      shiftId: dto.shiftId,
      orderType: dto.orderType,
      tableId: dto.tableId,
      items: dto.items,
      payments: dto.payments,
      notes: dto.notes,
    });
  }

  @Get('transactions')
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async listTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('outletId') outletId?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const businessId = user!.businessId;
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const skip = (pageNum - 1) * take;

    const where: Record<string, unknown> = {
      outlet: { businessId },
    };

    if (outletId) {
      where.outletId = outletId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) {
        createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        createdAt.lte = new Date(endDate);
      }
      where.createdAt = createdAt;
    }

    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
        payments: true,
        employee: { select: { name: true } },
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return transactions.map((tx) => {
      const paidAmount = tx.payments.reduce((sum, p) => sum + decimalToNumberRequired(p.amount), 0);
      const totalAmount = decimalToNumberRequired(tx.grandTotal);

      return {
        id: tx.id,
        transactionNumber: tx.receiptNumber,
        status: tx.status,
        subtotal: decimalToNumberRequired(tx.subtotal),
        discountAmount: decimalToNumberRequired(tx.discountAmount),
        taxAmount: decimalToNumberRequired(tx.taxAmount),
        serviceCharge: decimalToNumberRequired(tx.serviceCharge),
        totalAmount,
        paidAmount,
        changeAmount: Math.max(paidAmount - totalAmount, 0),
        customerName: tx.customer?.name ?? null,
        employeeName: tx.employee?.name ?? '',
        outletId: tx.outletId,
        items: tx.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity.toNumber(),
          unitPrice: decimalToNumberRequired(item.unitPrice),
          totalPrice: decimalToNumberRequired(item.subtotal),
          modifiers: item.modifiers.map((m) => m.modifierName),
          notes: item.notes,
        })),
        payments: tx.payments.map((p) => ({
          id: p.id,
          method: p.paymentMethod,
          amount: decimalToNumberRequired(p.amount),
          reference: p.referenceNumber,
          createdAt: p.createdAt.toISOString(),
        })),
        createdAt: tx.createdAt.toISOString(),
        updatedAt: tx.updatedAt.toISOString(),
      };
    });
  }

  @Get('transactions/:id')
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async getTransaction(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const tx = await this.transactionRepo.findById(id);
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied');
    }
    return tx;
  }

  @Post('refunds')
  @Roles(EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async processRefund(@Body() dto: ProcessRefundDto, @CurrentUser() user: AuthUser) {
    return this.processRefundUseCase.execute({
      transactionId: dto.transactionId,
      employeeId: user.employeeId,
      items: dto.items,
      refundMethod: dto.refundMethod,
      notes: dto.notes,
    });
  }

  @Post('transactions/:id/payments')
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async multiPayment(
    @Param('id') id: string,
    @Body() dto: { payments: PaymentDto[] },
    @CurrentUser() user: AuthUser,
  ) {
    // Verify transaction belongs to user's business
    const tx = await this.transactionRepo.findById(id);
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied');
    }
    return this.processMultiPaymentUseCase.execute({
      transactionId: id,
      payments: dto.payments,
    });
  }

  @Post('void')
  @Roles(EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async voidTransaction(@Body() dto: VoidTransactionDto, @CurrentUser() user: AuthUser) {
    if (!user.outletId) throw new BadRequestException('Outlet not assigned');
    return this.voidTransactionUseCase.execute({
      transactionId: dto.transactionId,
      employeeId: user.employeeId,
      businessId: user.businessId,
      outletId: user.outletId,
      reason: dto.reason,
    });
  }

  @Post('cash-in')
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async cashIn(@Body() dto: CashInDto, @CurrentUser() user: AuthUser) {
    if (!user.outletId) throw new BadRequestException('Outlet not assigned');
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
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async cashOut(@Body() dto: CashOutDto, @CurrentUser() user: AuthUser) {
    if (!user.outletId) throw new BadRequestException('Outlet not assigned');
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
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async holdBill(@Body() dto: HoldBillDto, @CurrentUser() user: AuthUser) {
    return this.holdBillUseCase.execute({
      outletId: user.outletId || dto.outletId,
      employeeId: user.employeeId,
      tableId: dto.tableId,
      customerName: dto.customerName,
      items: dto.items,
      notes: dto.notes,
    });
  }

  @Get('held-bills')
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async listHeldBills(@Query('outletId') outletId: string, @CurrentUser() user: AuthUser) {
    const resolvedOutletId = outletId || user.outletId;
    if (!resolvedOutletId) throw new BadRequestException('Outlet not assigned');
    return this.listHeldBillsUseCase.execute(resolvedOutletId);
  }

  @Post('resume/:billId')
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async resumeBill(@Param('billId') billId: string, @CurrentUser() user: AuthUser) {
    if (!user.outletId) throw new BadRequestException('Outlet not assigned');
    return this.resumeBillUseCase.execute({
      outletId: user.outletId,
      billId,
    });
  }

  @Get('transactions/:id/reprint')
  @Roles(EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async reprintReceipt(@Param('id') id: string) {
    return this.reprintReceiptUseCase.execute(id);
  }
}
