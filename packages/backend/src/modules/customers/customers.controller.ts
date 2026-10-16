import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  ParseUUIDPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { businessDateKey } from '../../shared/utils/business-time';
import { EarnLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/earn-loyalty-points.use-case';
import { RedeemLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/redeem-loyalty-points.use-case';
import { GetLoyaltyBalanceUseCase } from '../../application/use-cases/loyalty/get-loyalty-balance.use-case';
import { GetLoyaltyHistoryUseCase } from '../../application/use-cases/loyalty/get-loyalty-history.use-case';
import {
  CustomerImportDto,
  CustomerExportQueryDto,
  BirthdayQueryDto,
  BirthdayNotifyDto,
  type CustomerImportRow,
} from '../../application/dtos/customer-import-export.dto';
import {
  CreateCustomerDto,
  CustomerHistoryQueryDto,
  CustomerListQueryDto,
  CustomerXlsxImportDto,
  SegmentCustomersQueryDto,
  UpdateCustomerDto,
} from '../../application/dtos/customer.dto';
import {
  EarnCustomerLoyaltyDto,
  LoyaltyHistoryQueryDto,
  RedeemCustomerLoyaltyDto,
} from '../../application/dtos/loyalty.dto';
import {
  ExcelParserService,
  MAX_XLSX_FILE_BYTES,
  type ColumnMapping,
} from '../../infrastructure/import/excel-parser.service';
import { CustomersService } from './customers.service';
import type { SegmentName } from './customers.types';

const SEGMENTS = ['new', 'returning', 'vip', 'at-risk', 'inactive'] as const;
const IMPORT_FIELDS = new Set(['name', 'email', 'phone', 'birthday', 'address', 'notes']);
const XLSX_UPLOAD = FileInterceptor('file', {
  limits: { fileSize: MAX_XLSX_FILE_BYTES, files: 1 },
});

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly earnLoyaltyPointsUseCase: EarnLoyaltyPointsUseCase,
    private readonly redeemLoyaltyPointsUseCase: RedeemLoyaltyPointsUseCase,
    private readonly getLoyaltyBalanceUseCase: GetLoyaltyBalanceUseCase,
    private readonly getLoyaltyHistoryUseCase: GetLoyaltyHistoryUseCase,
    private readonly excelParser: ExcelParserService,
    private readonly customersService: CustomersService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List customers',
    description:
      'Without page/limit returns an array (max 1000, legacy). With page or limit returns { data, meta }.',
  })
  async list(@CurrentUser() user: AuthUser, @Query() query: CustomerListQueryDto) {
    return this.customersService.list(user.businessId, query);
  }

  @Post()
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR, EmployeeRole.CASHIER)
  @ApiOperation({ summary: 'Create a new customer' })
  async create(@Body() dto: CreateCustomerDto, @CurrentUser() user: AuthUser) {
    return this.customersService.create(user.businessId, dto);
  }

  @Get('segments')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Get customer segments (new, returning, vip, at-risk, inactive)' })
  async getSegments(@CurrentUser() user: AuthUser) {
    return this.customersService.getSegmentsSummary(user.businessId);
  }

  @Get('segments/:segment')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Get customers in a specific segment (paginated, default 100)' })
  async getCustomersBySegment(
    @Param('segment', new ParseEnumPipe(SEGMENTS)) segment: SegmentName,
    @Query() query: SegmentCustomersQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customersService.getCustomersBySegment(user.businessId, segment, query);
  }

  @Get('export')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Export customers as CSV or JSON' })
  async exportCustomers(
    @Query() query: CustomerExportQueryDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const dateKey = businessDateKey();
    if (query.format === 'csv') {
      const csv = await this.customersService.exportCustomersCsv(user.businessId, query.segment);
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="customers-${dateKey}.csv"`,
      });
      res.send(csv);
    } else {
      const json = await this.customersService.exportCustomersJson(user.businessId, query.segment);
      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="customers-${dateKey}.json"`,
      });
      res.send(json);
    }
  }

  // ==================== XLSX Import Endpoints ====================

  @Post('import-xlsx/preview')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @UseInterceptors(XLSX_UPLOAD)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Preview XLSX file sheets and headers for customer import' })
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  async previewXlsxImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    return this.excelParser.previewAllSheets(file.buffer);
  }

  @Post('import-xlsx')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @UseInterceptors(XLSX_UPLOAD)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import customers from XLSX file' })
  async importXlsx(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CustomerXlsxImportDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const mappings = parseMappings(dto.mappings);
    const parsed = await this.excelParser.parseRows(file.buffer, dto.sheetName, mappings);

    const str = (v: unknown): string | undefined =>
      v === null || v === undefined || v === '' ? undefined : String(v);
    const rows: CustomerImportRow[] = parsed.map((row) => ({
      name: str(row.name) ?? '',
      email: str(row.email),
      phone: str(row.phone),
      birthday: str(row.birthday),
      address: str(row.address),
      notes: str(row.notes),
    }));

    const result = await this.customersService.importCustomers(user.businessId, rows);
    // Legacy response shape of this endpoint: { imported, errors: string[], total }.
    return {
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors.map((e) => `Row ${e.row + 1}: ${e.message}`),
      total: rows.length,
    };
  }

  @Post('import')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Batch import customers from CSV or JSON' })
  async importCustomers(@Body() dto: CustomerImportDto, @CurrentUser() user: AuthUser) {
    let rows: CustomerImportRow[];
    if (dto.format === 'csv') {
      rows = this.customersService.parseCsvToCustomerRows(dto.data);
    } else {
      try {
        rows = this.customersService.parseJsonToCustomerRows(dto.data);
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        throw new BadRequestException('Invalid JSON data');
      }
    }

    if (rows.length === 0) {
      throw new BadRequestException('No valid data rows found');
    }
    return this.customersService.importCustomers(user.businessId, rows);
  }

  // ==================== Birthday Endpoints ====================

  @Get('birthdays')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Get customers with upcoming birthdays' })
  async getUpcomingBirthdays(@Query() query: BirthdayQueryDto, @CurrentUser() user: AuthUser) {
    return this.customersService.getUpcomingBirthdays(user.businessId, query.daysAhead ?? 7);
  }

  @Post('birthdays/notify')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Send birthday notifications (501 until a customer channel exists)' })
  async sendBirthdayNotifications(@Body() dto: BirthdayNotifyDto, @CurrentUser() user: AuthUser) {
    return this.customersService.sendBirthdayNotifications(user.businessId, dto.customerIds);
  }

  // ==================== Single customer ====================

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  async get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.customersService.findOne(user.businessId, id);
  }

  @Put(':id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Update customer contact details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customersService.update(user.businessId, id, dto);
  }

  @Delete(':id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Soft delete (deactivate) customer' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.customersService.deactivate(user.businessId, id);
    return { message: 'Customer deactivated' };
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get customer purchase history' })
  async getPurchaseHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CustomerHistoryQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customersService.getPurchaseHistory(
      user.businessId,
      id,
      query.limit ?? 20,
      query.offset ?? 0,
    );
  }

  // ==================== Loyalty Endpoints ====================

  @Post(':id/loyalty/earn')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Earn loyalty points for a completed sale (amount read server-side)' })
  async earnLoyalty(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EarnCustomerLoyaltyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.earnLoyaltyPointsUseCase.execute({
      businessId: user.businessId,
      customerId: id,
      transactionId: dto.transactionId,
      employeeId: user.employeeId,
    });
  }

  @Post(':id/loyalty/redeem')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Redeem loyalty points for discount' })
  async redeemLoyalty(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RedeemCustomerLoyaltyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.redeemLoyaltyPointsUseCase.execute({
      businessId: user.businessId,
      customerId: id,
      transactionId: dto.transactionId,
      pointsToRedeem: dto.pointsToRedeem,
      employeeId: user.employeeId,
    });
  }

  @Get(':id/loyalty/balance')
  @ApiOperation({ summary: 'Get customer loyalty balance' })
  async getLoyaltyBalance(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.getLoyaltyBalanceUseCase.execute({ businessId: user.businessId, customerId: id });
  }

  @Get(':id/loyalty/history')
  @ApiOperation({ summary: 'Get customer loyalty transaction history' })
  async getLoyaltyHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: LoyaltyHistoryQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.getLoyaltyHistoryUseCase.execute({
      businessId: user.businessId,
      customerId: id,
      limit: query.limit,
    });
  }
}

function parseMappings(json: string): ColumnMapping[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new BadRequestException('Invalid mappings JSON');
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 50) {
    throw new BadRequestException('mappings must be a non-empty array (max 50)');
  }
  return parsed.map((m: unknown) => {
    const item = (m ?? {}) as Record<string, unknown>;
    const excelColumn = item['excelColumn'];
    const field = item['field'];
    if (
      typeof excelColumn !== 'string' ||
      excelColumn.length === 0 ||
      excelColumn.length > 200 ||
      typeof field !== 'string' ||
      !IMPORT_FIELDS.has(field)
    ) {
      throw new BadRequestException(
        `Each mapping needs excelColumn and a field in: ${[...IMPORT_FIELDS].join(', ')}`,
      );
    }
    return { excelColumn, field };
  });
}
