import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { RequestTransferUseCase } from '../../application/use-cases/stock-transfers/request-transfer.use-case';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StockTransfersService } from './stock-transfers.service';
import {
  DiscrepancyQueryDto,
  AutoTransferRequestDto,
} from '../../application/dtos/stock-transfer.dto';

@ApiTags('Stock Transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock-transfers')
export class StockTransfersController {
  constructor(
    private readonly requestTransferUseCase: RequestTransferUseCase,
    private readonly prisma: PrismaService,
    private readonly stockTransfersService: StockTransfersService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('businessId') businessId?: string,
  ) {
    const resolvedBusinessId = businessId || user.businessId;
    const where: Record<string, unknown> = { businessId: resolvedBusinessId };
    if (status) {
      where.status = status;
    }

    return this.prisma.stockTransfer.findMany({
      where,
      include: {
        items: true,
        sourceOutlet: true,
        destinationOutlet: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  async request(
    @Body()
    dto: {
      sourceOutletId: string;
      destinationOutletId: string;
      items: {
        productId?: string;
        variantId?: string;
        ingredientId?: string;
        itemName: string;
        quantity: number;
      }[];
      notes?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.requestTransferUseCase.execute({
      businessId: user.businessId,
      ...dto,
      requestedBy: user.employeeId,
    });
  }

  @Put(':id/approve')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  async approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: user.employeeId,
        approvedAt: new Date(),
      },
    });
  }

  @Put(':id/ship')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  async ship(@Param('id') id: string) {
    return this.prisma.stockTransfer.update({
      where: { id },
      data: { status: 'in_transit', shippedAt: new Date() },
    });
  }

  @Put(':id/receive')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  async receive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'received',
        receivedBy: user.employeeId,
        receivedAt: new Date(),
      },
    });
  }

  @Get('discrepancies')
  async getDiscrepancies(@Query() query: DiscrepancyQueryDto, @CurrentUser() user: AuthUser) {
    if (!query.from || !query.to) {
      throw new BadRequestException('from and to query parameters are required');
    }

    return this.stockTransfersService.getDiscrepancies(
      user.businessId,
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Post('auto-request')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  async autoRequest(@Body() dto: AutoTransferRequestDto, @CurrentUser() user: AuthUser) {
    const result = await this.stockTransfersService.autoCreateTransferRequest(
      user.businessId,
      dto.destinationOutletId,
      dto.sourceOutletId,
      user.employeeId,
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
  async get(@Param('id') id: string) {
    return this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        items: true,
        sourceOutlet: true,
        destinationOutlet: true,
      },
    });
  }
}
