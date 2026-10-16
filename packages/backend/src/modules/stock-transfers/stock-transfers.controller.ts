import { Controller, Get, Post, Put, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { parseBusinessDate } from '../../shared/utils/business-time';
import { RequestTransferUseCase } from '../../application/use-cases/stock-transfers/request-transfer.use-case';
import { StockTransfersService } from './stock-transfers.service';
import {
  AutoTransferRequestDto,
  CreateStockTransferDto,
  DirectStockTransferDto,
  DiscrepancyQueryDto,
  ListStockTransfersQueryDto,
  ReceiveTransferDto,
} from '../../application/dtos/stock-transfer.dto';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

@ApiTags('Stock Transfers')
@ApiBearerAuth()
@Controller('stock-transfers')
export class StockTransfersController {
  constructor(
    private readonly requestTransferUseCase: RequestTransferUseCase,
    private readonly stockTransfersService: StockTransfersService,
  ) {}

  /** Returns an array (at most `limit`, default/max 100) — frontend contract. */
  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListStockTransfersQueryDto) {
    return this.stockTransfersService.list(user.businessId, query);
  }

  @Post()
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR, EmployeeRole.INVENTORY)
  async request(@Body() dto: CreateStockTransferDto, @CurrentUser() user: AuthUser) {
    // businessId / requestedBy always come from the JWT, never the body (R3).
    return this.requestTransferUseCase.execute({
      sourceOutletId: dto.sourceOutletId,
      destinationOutletId: dto.destinationOutletId,
      items: dto.items,
      notes: dto.notes,
      templateId: dto.templateId,
      businessId: user.businessId,
      requestedBy: user.employeeId,
    });
  }

  @Put(':id/approve')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.stockTransfersService.approve(user, id);
  }

  @Put(':id/ship')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.INVENTORY)
  async ship(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.stockTransfersService.ship(user, id);
  }

  @Put(':id/receive')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR, EmployeeRole.INVENTORY)
  async receive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiveTransferDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.stockTransfersService.receive(user, id, dto ?? {});
  }

  @Post('direct')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.INVENTORY)
  async directTransfer(@Body() dto: DirectStockTransferDto, @CurrentUser() user: AuthUser) {
    return this.stockTransfersService.directTransfer(user, dto);
  }

  @Get('discrepancies')
  async getDiscrepancies(@Query() query: DiscrepancyQueryDto, @CurrentUser() user: AuthUser) {
    // Date-only values are business days in Asia/Jakarta (R14).
    const from = DATE_ONLY.test(query.from)
      ? parseBusinessDate(query.from).start
      : new Date(query.from);
    const to = DATE_ONLY.test(query.to) ? parseBusinessDate(query.to).end : new Date(query.to);
    return this.stockTransfersService.getDiscrepancies(user.businessId, from, to);
  }

  @Post('auto-request')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.INVENTORY)
  async autoRequest(@Body() dto: AutoTransferRequestDto, @CurrentUser() user: AuthUser) {
    const result = await this.stockTransfersService.autoCreateTransferRequest(
      user,
      dto.destinationOutletId,
      dto.sourceOutletId,
    );

    if (!result) {
      return {
        message: 'No low stock items found or no available stock to transfer',
        transferId: null,
        itemCount: 0,
      };
    }

    return result;
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.stockTransfersService.get(user.businessId, id);
  }
}
