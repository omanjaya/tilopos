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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { SplitBillUseCase } from '../../application/use-cases/tables/split-bill.use-case';
import { MergeBillUseCase } from '../../application/use-cases/tables/merge-bill.use-case';
import { CreateTableUseCase } from '../../application/use-cases/tables/create-table.use-case';
import { GetTablesUseCase } from '../../application/use-cases/tables/get-tables.use-case';
import { UpdateTableUseCase } from '../../application/use-cases/tables/update-table.use-case';
import { DeleteTableUseCase } from '../../application/use-cases/tables/delete-table.use-case';
import { MergeBillDto } from '../../application/dtos/merge-bill.dto';
import { TablesService } from './tables.service';

@ApiTags('Tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tables')
export class TablesController {
  constructor(
    private readonly createTableUseCase: CreateTableUseCase,
    private readonly getTablesUseCase: GetTablesUseCase,
    private readonly updateTableUseCase: UpdateTableUseCase,
    private readonly deleteTableUseCase: DeleteTableUseCase,
    private readonly splitBillUseCase: SplitBillUseCase,
    private readonly mergeBillUseCase: MergeBillUseCase,
    private readonly tablesService: TablesService,
  ) {}

  // ==================== Table CRUD ====================

  @Get('sections')
  @ApiOperation({ summary: 'Get unique sections for an outlet' })
  async getSections(@Query('outletId') outletId: string) {
    return this.tablesService.getSections(outletId);
  }

  @Get()
  @ApiOperation({ summary: 'Get tables by outlet' })
  async list(
    @Query('outletId') outletId: string,
    @Query('section') section?: string,
    @Query('status') status?: 'available' | 'occupied' | 'reserved' | 'cleaning',
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.getTablesUseCase.execute({
      outletId,
      section,
      status,
      activeOnly: activeOnly === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single table by ID' })
  async getById(@Param('id') id: string) {
    return this.tablesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new table' })
  async create(
    @Body() dto: {
      outletId: string;
      name: string;
      capacity?: number;
      section?: string;
      positionX?: number;
      positionY?: number;
    },
  ) {
    return this.createTableUseCase.execute(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update table' })
  async update(
    @Param('id') id: string,
    @Body() dto: {
      name?: string;
      capacity?: number;
      section?: string;
      positionX?: number;
      positionY?: number;
      status?: 'available' | 'occupied' | 'reserved' | 'cleaning';
      isActive?: boolean;
    },
  ) {
    return this.updateTableUseCase.execute({ id, ...dto });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete (deactivate) table' })
  async remove(@Param('id') id: string) {
    await this.deleteTableUseCase.execute(id);
    return { message: 'Table deactivated' };
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update table status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: {
      status: 'available' | 'occupied' | 'reserved' | 'cleaning';
      currentOrderId?: string;
    },
  ) {
    return this.tablesService.updateStatus(id, dto.status, dto.currentOrderId);
  }

  // ==================== Bill Operations ====================

  @Post('split-bill')
  @ApiOperation({ summary: 'Split bill into multiple transactions' })
  async splitBill(@Body() dto: {
    transactionId: string;
    splitType: 'equal' | 'by_item' | 'by_amount';
    splits: {
      customerName?: string;
      itemIds?: string[];
      amount?: number;
      paymentMethod: string;
    }[];
  }) {
    return this.splitBillUseCase.execute(dto);
  }

  @Post('merge-bill')
  @ApiOperation({ summary: 'Merge multiple transactions into one' })
  async mergeBill(@Body() dto: MergeBillDto, @CurrentUser() user: AuthUser) {
    if (!user.outletId) throw new BadRequestException('Outlet not assigned');
    return this.mergeBillUseCase.execute({
      transactionIds: dto.transactionIds,
      employeeId: user.employeeId,
      businessId: user.businessId,
      outletId: user.outletId,
      paymentMethod: dto.paymentMethod,
    });
  }

  // ==================== Reservations ====================

  @Post('reservations')
  @ApiOperation({ summary: 'Create a table reservation' })
  async createReservation(@Body() dto: {
    tableId: string;
    customerName: string;
    customerPhone: string;
    partySize: number;
    reservedAt: string;
    notes?: string;
  }) {
    return this.tablesService.createReservation({
      tableId: dto.tableId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      partySize: dto.partySize,
      reservedAt: new Date(dto.reservedAt),
      notes: dto.notes,
    });
  }

  @Get('reservations')
  @ApiOperation({ summary: 'List reservations for an outlet on a given date' })
  async getReservations(
    @Query('outletId') outletId: string,
    @Query('date') date: string,
  ) {
    return this.tablesService.getReservations(outletId, new Date(date));
  }

  @Put('reservations/:id/cancel')
  @ApiOperation({ summary: 'Cancel a reservation' })
  async cancelReservation(@Param('id') id: string) {
    return this.tablesService.cancelReservation(id);
  }

  @Put('reservations/:id/check-in')
  @ApiOperation({ summary: 'Check in a reservation (mark table as occupied)' })
  async checkInReservation(@Param('id') id: string) {
    return this.tablesService.checkInReservation(id);
  }

  // ==================== Waiting List ====================

  @Get('waiting-list')
  @ApiOperation({ summary: 'Get waiting list for outlet' })
  async waitingList(@Query('outletId') outletId: string) {
    return this.tablesService.getWaitingList(outletId);
  }

  @Post('waiting-list')
  @ApiOperation({ summary: 'Add customer to waiting list' })
  async addToWaitingList(@Body() dto: {
    outletId: string;
    customerName: string;
    partySize: number;
    phone?: string;
    preferredSection?: string;
  }) {
    return this.tablesService.addToWaitingList({
      outletId: dto.outletId,
      customerName: dto.customerName,
      partySize: dto.partySize,
      phone: dto.phone,
      preferredSection: dto.preferredSection,
    });
  }

  @Put('waiting-list/:id/notify')
  @ApiOperation({ summary: 'Notify a customer from waiting list' })
  async notifyFromWaitingList(@Param('id') id: string) {
    return this.tablesService.notifyFromWaitingList(id);
  }

  @Put('waiting-list/:id/seat')
  @ApiOperation({ summary: 'Seat a customer from waiting list at a table' })
  async seatFromWaitingList(
    @Param('id') id: string,
    @Body() dto: { tableId: string },
  ) {
    return this.tablesService.seatFromWaitingList(id, dto.tableId);
  }
}
