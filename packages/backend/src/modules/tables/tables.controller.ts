import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { EmployeeRole } from '../../shared/constants/roles';
import { TenantAccessService } from '@shared/tenant';
import { SplitBillUseCase } from '../../application/use-cases/tables/split-bill.use-case';
import { MergeBillUseCase } from '../../application/use-cases/tables/merge-bill.use-case';
import { CreateTableUseCase } from '../../application/use-cases/tables/create-table.use-case';
import { GetTablesUseCase } from '../../application/use-cases/tables/get-tables.use-case';
import { UpdateTableUseCase } from '../../application/use-cases/tables/update-table.use-case';
import { DeleteTableUseCase } from '../../application/use-cases/tables/delete-table.use-case';
import { MergeBillDto } from '../../application/dtos/merge-bill.dto';
import { SplitBillDto } from '../../application/dtos/split-bill.dto';
import {
  CreateTableDto,
  CreateTableReservationDto,
  GetTableReservationsQueryDto,
  GetTablesQueryDto,
  TableOutletQueryDto,
  UpdateTableDto,
  UpdateTableStatusDto,
} from '../../application/dtos/table.dto';
import {
  AddToWaitingListDto,
  SeatFromWaitingListDto,
} from '../../application/dtos/waiting-list.dto';
import { TablesService } from './tables.service';
import { WaitingListService } from '../waiting-list/waiting-list.service';

const FRONT_OF_HOUSE = [
  EmployeeRole.CASHIER,
  EmployeeRole.SUPERVISOR,
  EmployeeRole.MANAGER,
  EmployeeRole.OWNER,
];

@ApiTags('Tables')
@ApiBearerAuth()
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
    private readonly waitingListService: WaitingListService,
    private readonly tenant: TenantAccessService,
  ) {}

  // ==================== Table CRUD ====================

  @Get('sections')
  @ApiOperation({ summary: 'Get unique sections (one outlet, or all outlets of the business)' })
  async getSections(@Query() query: TableOutletQueryDto, @CurrentUser() user: AuthUser) {
    const outletIds = await this.tenant.resolveOutletIds(user, query.outletId);
    return this.tablesService.getSections(outletIds);
  }

  @Get()
  @ApiOperation({ summary: 'Get tables (one outlet, or all outlets of the business)' })
  async list(@Query() query: GetTablesQueryDto, @CurrentUser() user: AuthUser) {
    const outletIds = await this.tenant.resolveOutletIds(user, query.outletId);
    return this.getTablesUseCase.execute({
      outletIds,
      section: query.section,
      status: query.status,
      activeOnly: query.activeOnly === true,
    });
  }

  // ==================== Reservations ====================
  // (declared before ':id' so 'reservations' is never parsed as an id)

  @Post('reservations')
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Create a table reservation' })
  async createReservation(@Body() dto: CreateTableReservationDto, @CurrentUser() user: AuthUser) {
    return this.tablesService.createReservation(user.businessId, {
      tableId: dto.tableId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      partySize: dto.partySize,
      reservedAt: new Date(dto.reservedAt),
      notes: dto.notes,
    });
  }

  @Get('reservations')
  @ApiOperation({ summary: 'List reservations for an outlet on a given business date' })
  async getReservations(
    @Query() query: GetTableReservationsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    return this.tablesService.getReservations([outletId], query.date);
  }

  @Put('reservations/:id/cancel')
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Cancel a reservation' })
  async cancelReservation(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.tablesService.cancelReservation(id, user.businessId);
  }

  @Put('reservations/:id/check-in')
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Check in a reservation (mark table as occupied)' })
  async checkInReservation(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.tablesService.checkInReservation(id, user.businessId);
  }

  // ==================== Waiting List (delegates to WaitingListService) ====================

  @Get('waiting-list')
  @ApiOperation({ summary: 'Get open waiting list for an outlet' })
  async waitingList(@Query() query: TableOutletQueryDto, @CurrentUser() user: AuthUser) {
    const outletIds = await this.tenant.resolveOutletIds(user, query.outletId);
    const [waiting, notified] = await Promise.all([
      this.waitingListService.findByOutlet(outletIds, 'waiting'),
      this.waitingListService.findByOutlet(outletIds, 'notified'),
    ]);
    return [...waiting, ...notified].sort((a, b) => a.queuedAt.getTime() - b.queuedAt.getTime());
  }

  @Post('waiting-list')
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Add customer to waiting list' })
  async addToWaitingList(@Body() dto: AddToWaitingListDto, @CurrentUser() user: AuthUser) {
    const outletId = await this.tenant.assertOutlet(user, dto.outletId);
    return this.waitingListService.create({
      outletId,
      customerName: dto.customerName,
      partySize: dto.partySize,
      customerPhone: dto.phone,
      preferredSection: dto.preferredSection,
    });
  }

  @Put('waiting-list/:id/notify')
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Notify a customer from waiting list' })
  async notifyFromWaitingList(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.waitingListService.notify(id, user.businessId);
  }

  @Put('waiting-list/:id/seat')
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Seat a customer from waiting list at a table' })
  async seatFromWaitingList(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SeatFromWaitingListDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.waitingListService.seat(id, user.businessId, dto.tableId);
  }

  // ==================== Bill Operations ====================

  @Post('split-bill')
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Split bill into multiple transactions' })
  async splitBill(@Body() dto: SplitBillDto, @CurrentUser() user: AuthUser) {
    return this.splitBillUseCase.execute({
      transactionId: dto.transactionId,
      businessId: user.businessId,
      splitType: dto.splitType,
      splits: dto.splits.map((s) => ({
        customerName: s.customerName,
        itemIds: s.itemIds,
        amount: s.amount,
        paymentMethod: s.paymentMethod,
      })),
    });
  }

  @Post('merge-bill')
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Merge multiple transactions of one outlet into one' })
  async mergeBill(@Body() dto: MergeBillDto, @CurrentUser() user: AuthUser) {
    return this.mergeBillUseCase.execute({
      transactionIds: dto.transactionIds,
      employeeId: user.employeeId,
      businessId: user.businessId,
      paymentMethod: dto.paymentMethod,
    });
  }

  // ==================== Single table ====================

  @Get(':id')
  @ApiOperation({ summary: 'Get single table by ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.tablesService.findById(id, user.businessId);
  }

  @Post()
  @Roles(EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Create a new table' })
  async create(@Body() dto: CreateTableDto, @CurrentUser() user: AuthUser) {
    const outletId = await this.tenant.assertOutlet(user, dto.outletId);
    return this.createTableUseCase.execute({
      outletId,
      name: dto.name,
      capacity: dto.capacity,
      section: dto.section,
      positionX: dto.positionX,
      positionY: dto.positionY,
    });
  }

  @Put(':id')
  @Roles(EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Update table (status changes go through PUT :id/status)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTableDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.tenant.assertOwned('table', id, user.businessId);
    return this.updateTableUseCase.execute({
      id,
      businessId: user.businessId,
      name: dto.name,
      capacity: dto.capacity,
      section: dto.section,
      positionX: dto.positionX,
      positionY: dto.positionY,
      isActive: dto.isActive,
    });
  }

  @Delete(':id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Delete (deactivate) table' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.tenant.assertOwned('table', id, user.businessId);
    await this.deleteTableUseCase.execute(id, user.businessId);
    return { message: 'Table deactivated' };
  }

  @Put(':id/status')
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Update table status' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTableStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tablesService.updateStatus(id, user.businessId, dto.status, dto.currentOrderId);
  }
}
