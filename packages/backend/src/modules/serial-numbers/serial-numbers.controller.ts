import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { CurrentUser } from '@infrastructure/auth/current-user.decorator';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '@shared/constants/roles';
import {
  RegisterSerialNumberDto,
  BulkRegisterSerialNumbersDto,
  UpdateSerialNumberDto,
  MarkSerialSoldDto,
  SerialStatusNoteDto,
  SerialListQueryDto,
  WarrantyExpiringQueryDto,
} from '@application/dtos/serial-number.dto';
import { SerialNumbersService } from './serial-numbers.service';

const SERIAL_WRITERS = [EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.INVENTORY];
/** Status changes happen at the counter (sale, return, warranty intake). */
const SERIAL_OPERATORS = [...SERIAL_WRITERS, EmployeeRole.SUPERVISOR, EmployeeRole.CASHIER];
const COST_ROLES = new Set<string>([
  EmployeeRole.SUPER_ADMIN,
  EmployeeRole.OWNER,
  EmployeeRole.MANAGER,
  EmployeeRole.INVENTORY,
]);

/** Hides serial cost prices from roles that must not see them (R12). */
function forRole<T extends { costPrice?: unknown }>(user: AuthUser, row: T): T {
  return COST_ROLES.has(user.role) ? row : { ...row, costPrice: null };
}

@Controller('serial-numbers')
export class SerialNumbersController {
  constructor(private readonly service: SerialNumbersService) {}

  @Get('product/:productId/:outletId')
  async listByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Query() query: SerialListQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const serials = await this.service.listByProduct(
      productId,
      outletId,
      user.businessId,
      query.status,
    );
    return { serials: serials.map((s) => forRole(user, s)) };
  }

  @Get('customer/:customerId')
  async listByCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const serials = await this.service.listByCustomer(customerId, user.businessId);
    return { serials: serials.map((s) => forRole(user, s)) };
  }

  @Get('warranty-expiring')
  async getWarrantyExpiring(
    @Query() query: WarrantyExpiringQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const daysAhead = query.days ?? 30;
    const serials = await this.service.getWarrantyExpiring(user.businessId, daysAhead);
    return { serials: serials.map((s) => forRole(user, s)), days: daysAhead };
  }

  @Get('lookup/:serialNumber')
  async lookupBySerial(@Param('serialNumber') serialNumber: string, @CurrentUser() user: AuthUser) {
    return forRole(
      user,
      await this.service.findBySerial(serialNumber.slice(0, 100), user.businessId),
    );
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return forRole(user, await this.service.findById(id, user.businessId));
  }

  @Post()
  @Roles(...SERIAL_WRITERS)
  async register(@Body() dto: RegisterSerialNumberDto, @CurrentUser() user: AuthUser) {
    const serial = await this.service.register(user.businessId, dto);
    return { serial };
  }

  @Post('bulk')
  @Roles(...SERIAL_WRITERS)
  async bulkRegister(@Body() dto: BulkRegisterSerialNumbersDto, @CurrentUser() user: AuthUser) {
    const serials = await this.service.bulkRegister(user.businessId, dto.items);
    return { serials, count: serials.length };
  }

  @Put(':id')
  @Roles(...SERIAL_WRITERS)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSerialNumberDto,
    @CurrentUser() user: AuthUser,
  ) {
    const serial = await this.service.update(id, user.businessId, dto);
    return { serial };
  }

  @Put(':id/sold')
  @Roles(...SERIAL_OPERATORS)
  async markSold(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkSerialSoldDto,
    @CurrentUser() user: AuthUser,
  ) {
    const serial = await this.service.markSold(
      id,
      user.businessId,
      dto.customerId,
      dto.transactionId,
    );
    return { serial: forRole(user, serial) };
  }

  @Put(':id/returned')
  @Roles(...SERIAL_OPERATORS)
  async markReturned(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SerialStatusNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    const serial = await this.service.markReturned(id, user.businessId, dto.notes);
    return { serial: forRole(user, serial) };
  }

  @Put(':id/warranty')
  @Roles(...SERIAL_OPERATORS)
  async markWarranty(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SerialStatusNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    const serial = await this.service.markWarranty(id, user.businessId, dto.notes);
    return { serial: forRole(user, serial) };
  }

  @Put(':id/defective')
  @Roles(...SERIAL_WRITERS, EmployeeRole.SUPERVISOR)
  async markDefective(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SerialStatusNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    const serial = await this.service.markDefective(id, user.businessId, dto.notes);
    return { serial: forRole(user, serial) };
  }

  @Delete(':id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.service.delete(id, user.businessId);
  }
}
