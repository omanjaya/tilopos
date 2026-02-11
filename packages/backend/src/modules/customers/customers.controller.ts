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
  UseInterceptors,
  UploadedFile,
  Inject,
  NotFoundException,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { AddLoyaltyPointsUseCase } from '../../application/use-cases/customers/add-loyalty-points.use-case';
import { EarnLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/earn-loyalty-points.use-case';
import { RedeemLoyaltyPointsUseCase } from '../../application/use-cases/loyalty/redeem-loyalty-points.use-case';
import { GetLoyaltyBalanceUseCase } from '../../application/use-cases/loyalty/get-loyalty-balance.use-case';
import { GetLoyaltyHistoryUseCase } from '../../application/use-cases/loyalty/get-loyalty-history.use-case';
import {
  CustomerImportDto,
  CustomerExportQueryDto,
  BirthdayQueryDto,
  BirthdayNotifyDto,
} from '../../application/dtos/customer-import-export.dto';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { ICustomerRepository } from '../../domain/interfaces/repositories/customer.repository';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ExcelParserService } from '../../infrastructure/import/excel-parser.service';
import { CustomersService } from './customers.service';
import { BusinessScoped } from '../../shared/guards/business-scope.guard';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly addLoyaltyPointsUseCase: AddLoyaltyPointsUseCase,
    private readonly earnLoyaltyPointsUseCase: EarnLoyaltyPointsUseCase,
    private readonly redeemLoyaltyPointsUseCase: RedeemLoyaltyPointsUseCase,
    private readonly getLoyaltyBalanceUseCase: GetLoyaltyBalanceUseCase,
    private readonly getLoyaltyHistoryUseCase: GetLoyaltyHistoryUseCase,
    @Inject(REPOSITORY_TOKENS.CUSTOMER)
    private readonly customerRepo: ICustomerRepository,
    private readonly prisma: PrismaService,
    private readonly excelParser: ExcelParserService,
    private readonly customersService: CustomersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all customers for business' })
  async list(@CurrentUser() user: AuthUser) {
    return this.customerRepo.findByBusinessId(user.businessId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  async create(
    @Body() dto: { name: string; email?: string; phone?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.customerRepo.save({
      id: '',
      businessId: user.businessId,
      name: dto.name,
      email: dto.email || null,
      phone: dto.phone || null,
      loyaltyPoints: 0,
      loyaltyTier: 'regular',
      totalSpent: 0,
      visitCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  @Get('segments')
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Get customer segments (new, returning, vip, at-risk, inactive)' })
  async getSegments(@CurrentUser() user: AuthUser) {
    return this.customersService.getSegmentsSummary(user.businessId);
  }

  @Get('segments/:segment')
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Get customers in a specific segment' })
  async getCustomersBySegment(@Param('segment') segment: string, @CurrentUser() user: AuthUser) {
    const validSegments = ['new', 'returning', 'vip', 'at-risk', 'inactive'];
    if (!validSegments.includes(segment)) {
      throw new BadRequestException(
        `Invalid segment "${segment}". Valid segments: ${validSegments.join(', ')}`,
      );
    }

    return this.customersService.getCustomersBySegment(
      user.businessId,
      segment as 'new' | 'returning' | 'vip' | 'at-risk' | 'inactive',
    );
  }

  @Get('export')
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Export customers as CSV or JSON' })
  async exportCustomers(
    @Query() query: CustomerExportQueryDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    if (query.format === 'csv') {
      const csv = await this.customersService.exportCustomersCsv(user.businessId, query.segment);
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.csv"`,
      });
      res.send(csv);
    } else {
      const json = await this.customersService.exportCustomersJson(user.businessId, query.segment);
      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.json"`,
      });
      res.send(json);
    }
  }

  // ==================== XLSX Import Endpoints ====================

  @Post('import-xlsx/preview')
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Preview XLSX file sheets and headers for customer import' })
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  async previewXlsxImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be under 10MB');
    }

    const sheets = await this.excelParser.getSheetNames(file.buffer);
    const previews = await Promise.all(
      sheets.map((name) => this.excelParser.previewSheet(file.buffer, name)),
    );
    return previews;
  }

  @Post('import-xlsx')
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import customers from XLSX file' })
  async importXlsx(
    @UploadedFile() file: Express.Multer.File,
    @Body('sheetName') sheetName: string,
    @Body('mappings') mappingsJson: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!sheetName) throw new BadRequestException('Sheet name is required');
    if (!mappingsJson) throw new BadRequestException('Column mappings are required');

    let mappings: { excelColumn: string; field: string }[];
    try {
      mappings = JSON.parse(mappingsJson);
    } catch {
      throw new BadRequestException('Invalid mappings JSON');
    }

    const rows = await this.excelParser.parseRows(file.buffer, sheetName, mappings);

    let imported = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const name = String(row.name || '').trim();
        if (!name) {
          errors.push(`Row ${imported + errors.length + 2}: Customer name is required`);
          continue;
        }

        await this.prisma.customer.create({
          data: {
            businessId: user.businessId,
            name,
            phone: row.phone ? String(row.phone) : undefined,
            email: row.email ? String(row.email) : undefined,
            address: row.address ? String(row.address) : undefined,
            notes: row.notes ? String(row.notes) : undefined,
          },
        });
        imported++;
      } catch (e) {
        errors.push(`Row ${imported + errors.length + 2}: ${(e as Error).message}`);
      }
    }

    return { imported, errors, total: rows.length };
  }

  @Post('import')
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Batch import customers from CSV or JSON' })
  async importCustomers(@Body() dto: CustomerImportDto, @CurrentUser() user: AuthUser) {
    let rows;

    if (dto.format === 'csv') {
      rows = this.customersService.parseCsvToCustomerRows(dto.data);
    } else {
      try {
        rows = this.customersService.parseJsonToCustomerRows(dto.data);
      } catch {
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
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Get customers with upcoming birthdays' })
  async getUpcomingBirthdays(@Query() query: BirthdayQueryDto, @CurrentUser() user: AuthUser) {
    const daysAhead = query.daysAhead ? parseInt(query.daysAhead, 10) : 7;
    return this.customersService.getUpcomingBirthdays(user.businessId, daysAhead);
  }

  @Post('birthdays/notify')
  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Send birthday notifications to selected customers' })
  async sendBirthdayNotifications(@Body() dto: BirthdayNotifyDto, @CurrentUser() user: AuthUser) {
    return this.customersService.sendBirthdayNotifications(user.businessId, dto.customerIds);
  }

  @Get(':id')
  @BusinessScoped({ resource: 'customer', param: 'id' })
  @ApiOperation({ summary: 'Get customer by ID' })
  async get(@Param('id') id: string) {
    const c = await this.customerRepo.findById(id);
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  @Put(':id')
  @BusinessScoped({ resource: 'customer', param: 'id' })
  @ApiOperation({ summary: 'Update customer' })
  async update(
    @Param('id') id: string,
    @Body() dto: { name?: string; email?: string; phone?: string },
  ) {
    return this.customerRepo.update(id, dto);
  }

  @Delete(':id')
  @BusinessScoped({ resource: 'customer', param: 'id' })
  @ApiOperation({ summary: 'Soft delete (deactivate) customer' })
  async remove(@Param('id') id: string) {
    await this.customerRepo.delete(id);
    return { message: 'Customer deactivated' };
  }

  @Get(':id/history')
  @BusinessScoped({ resource: 'customer', param: 'id' })
  @ApiOperation({ summary: 'Get customer purchase history' })
  async getPurchaseHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const customer = await this.customerRepo.findById(id);
    if (!customer) throw new NotFoundException('Customer not found');

    const take = limit ? parseInt(limit, 10) : 20;
    const skip = offset ? parseInt(offset, 10) : 0;

    return this.customersService.getPurchaseHistory(id, take, skip);
  }

  // ==================== Loyalty Endpoints ====================

  @Post(':id/loyalty/earn')
  @BusinessScoped({ resource: 'customer', param: 'id' })
  @ApiOperation({ summary: 'Earn loyalty points from transaction' })
  async earnLoyalty(
    @Param('id') id: string,
    @Body() dto: { transactionId: string; transactionTotal: number },
  ) {
    return this.earnLoyaltyPointsUseCase.execute({
      customerId: id,
      transactionId: dto.transactionId,
      transactionTotal: dto.transactionTotal,
    });
  }

  @Post(':id/loyalty/redeem')
  @BusinessScoped({ resource: 'customer', param: 'id' })
  @ApiOperation({ summary: 'Redeem loyalty points for discount' })
  async redeemLoyalty(
    @Param('id') id: string,
    @Body() dto: { transactionId: string; pointsToRedeem: number },
  ) {
    return this.redeemLoyaltyPointsUseCase.execute({
      customerId: id,
      transactionId: dto.transactionId,
      pointsToRedeem: dto.pointsToRedeem,
    });
  }

  @Get(':id/loyalty/balance')
  @BusinessScoped({ resource: 'customer', param: 'id' })
  @ApiOperation({ summary: 'Get customer loyalty balance' })
  async getLoyaltyBalance(@Param('id') id: string) {
    return this.getLoyaltyBalanceUseCase.execute({ customerId: id });
  }

  @Get(':id/loyalty/history')
  @BusinessScoped({ resource: 'customer', param: 'id' })
  @ApiOperation({ summary: 'Get customer loyalty transaction history' })
  async getLoyaltyHistory(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.getLoyaltyHistoryUseCase.execute({
      customerId: id,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // Legacy endpoint - kept for backward compatibility
  @Post(':id/loyalty/add')
  @BusinessScoped({ resource: 'customer', param: 'id' })
  @ApiOperation({ summary: 'Add loyalty points (legacy)' })
  async addLoyalty(
    @Param('id') id: string,
    @Body() dto: { transactionId: string; transactionTotal: number },
  ) {
    return this.addLoyaltyPointsUseCase.execute({ customerId: id, ...dto });
  }
}
