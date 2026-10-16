import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { SettlementsService } from './settlements.service';
import {
  CreateSettlementDto,
  DisputeSettlementDto,
  ListSettlementsQueryDto,
  ReconciliationQueryDto,
  SettleSettlementDto,
} from './dto/settlement.dto';

@ApiTags('Settlements')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlements: SettlementsService) {}

  @Get()
  @ApiOperation({ summary: 'List settlements with filters (bounded by page/limit)' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListSettlementsQueryDto) {
    return this.settlements.list(user, query);
  }

  @Get('reconciliation')
  @ApiOperation({
    summary: 'Get payment reconciliation report',
    description:
      'Business-day (Asia/Jakarta) range: compares sales/refunds, payments by method and settlements.',
  })
  getReconciliationReport(@CurrentUser() user: AuthUser, @Query() query: ReconciliationQueryDto) {
    return this.settlements.reconciliation(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get settlement by ID' })
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.settlements.get(user, id);
  }

  @Post()
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Create a manual settlement' })
  create(@Body() dto: CreateSettlementDto, @CurrentUser() user: AuthUser) {
    return this.settlements.create(user, dto);
  }

  @Post(':id/settle')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Confirm a pending settlement (POST)' })
  settlePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SettleSettlementDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.settlements.settle(user, id, dto.notes);
  }

  @Put(':id/settle')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Confirm a pending settlement (PUT, legacy)' })
  settlePut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SettleSettlementDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.settlements.settle(user, id, dto.notes);
  }

  @Post(':id/dispute')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Dispute a pending settlement (POST)' })
  disputePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisputeSettlementDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.settlements.dispute(user, id, dto.reason);
  }

  @Put(':id/dispute')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Dispute a pending settlement (PUT, legacy)' })
  disputePut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisputeSettlementDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.settlements.dispute(user, id, dto.reason);
  }
}
