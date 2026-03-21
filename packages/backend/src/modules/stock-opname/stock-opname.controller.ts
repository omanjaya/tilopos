import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  CreateStockOpnameDto,
  UpdateOpnameItemsDto,
} from '../../application/dtos/stock-opname.dto';
import { CreateStockOpnameUseCase } from '../../application/use-cases/stock-opname/create-stock-opname.use-case';
import { UpdateOpnameItemsUseCase } from '../../application/use-cases/stock-opname/update-opname-items.use-case';
import { CompleteStockOpnameUseCase } from '../../application/use-cases/stock-opname/complete-stock-opname.use-case';
import { CancelStockOpnameUseCase } from '../../application/use-cases/stock-opname/cancel-stock-opname.use-case';

@ApiTags('Stock Opname')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory/stock-opname')
export class StockOpnameController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createOpname: CreateStockOpnameUseCase,
    private readonly updateItems: UpdateOpnameItemsUseCase,
    private readonly completeOpname: CompleteStockOpnameUseCase,
    private readonly cancelOpname: CancelStockOpnameUseCase,
  ) {}

  @Get()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  @ApiOperation({ summary: 'List stock opname sessions' })
  async list(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId?: string,
    @Query('status') status?: string,
  ) {
    const where: Record<string, unknown> = {};

    // Filter by outlet (verify business access)
    if (outletId) {
      await this.verifyOutletAccess(outletId, user.businessId);
      where.outletId = outletId;
    } else {
      // Only show opnames for outlets in this business
      where.outlet = { businessId: user.businessId };
    }

    if (status) {
      where.status = status;
    }

    const opnames = await this.prisma.stockOpname.findMany({
      where,
      include: {
        outlet: { select: { name: true } },
        createdByEmployee: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add computed fields
    return Promise.all(
      opnames.map(async (o) => {
        const items = await this.prisma.stockOpnameItem.findMany({
          where: { opnameId: o.id },
          select: { actualQuantity: true, difference: true },
        });

        const countedCount = items.filter((i) => i.actualQuantity !== null).length;
        const discrepancyCount = items.filter(
          (i) => i.difference !== null && i.difference.toNumber() !== 0,
        ).length;

        return {
          ...o,
          itemCount: o._count.items,
          countedCount,
          discrepancyCount,
          _count: undefined,
        };
      }),
    );
  }

  @Get(':id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Get stock opname detail with items' })
  async getById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const opname = await this.prisma.stockOpname.findUnique({
      where: { id },
      include: {
        outlet: { select: { name: true } },
        createdByEmployee: { select: { name: true } },
        approvedByEmployee: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true } },
            variant: { select: { name: true, sku: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!opname) throw new NotFoundException('Stock opname not found');

    // Verify business access
    await this.verifyOutletAccess(opname.outletId, user.businessId);

    return opname;
  }

  @Post()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  @ApiOperation({ summary: 'Create a new stock opname session' })
  async create(@Body() dto: CreateStockOpnameDto, @CurrentUser() user: AuthUser) {
    await this.verifyOutletAccess(dto.outletId, user.businessId);
    return this.createOpname.execute({
      outletId: dto.outletId,
      employeeId: user.employeeId,
      productIds: dto.productIds,
      notes: dto.notes,
    });
  }

  @Patch(':id/items')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Update actual counts for opname items' })
  async updateOpnameItems(
    @Param('id') id: string,
    @Body() dto: UpdateOpnameItemsDto,
    @CurrentUser() user: AuthUser,
  ) {
    const opname = await this.prisma.stockOpname.findUnique({ where: { id } });
    if (!opname) throw new ForbiddenException('Stock opname not found');
    await this.verifyOutletAccess(opname.outletId, user.businessId);

    return this.updateItems.execute({
      opnameId: id,
      items: dto.items,
    });
  }

  @Post(':id/complete')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Complete opname and apply stock adjustments' })
  async complete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const opname = await this.prisma.stockOpname.findUnique({ where: { id } });
    if (!opname) throw new ForbiddenException('Stock opname not found');
    await this.verifyOutletAccess(opname.outletId, user.businessId);

    return this.completeOpname.execute({
      opnameId: id,
      employeeId: user.employeeId,
    });
  }

  @Post(':id/cancel')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Cancel a stock opname session' })
  async cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const opname = await this.prisma.stockOpname.findUnique({ where: { id } });
    if (!opname) throw new ForbiddenException('Stock opname not found');
    await this.verifyOutletAccess(opname.outletId, user.businessId);

    return this.cancelOpname.execute({ opnameId: id });
  }

  private async verifyOutletAccess(outletId: string, businessId: string): Promise<void> {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, businessId },
    });
    if (!outlet) {
      throw new ForbiddenException('Access denied to this outlet');
    }
  }
}
