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
  NotFoundException,
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
import { EventBusService } from '../../infrastructure/events/event-bus.service';
import { StockTransferStatusChangedEvent } from '../../domain/events/stock-transfer-status-changed.event';
import type { StockTransferStatus } from '../../domain/events/stock-transfer-status-changed.event';
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
    private readonly eventBus: EventBusService,
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
    // Get current transfer to emit event with correct data
    const currentTransfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      select: {
        status: true,
        sourceOutletId: true,
        destinationOutletId: true,
        businessId: true,
      },
    });

    if (!currentTransfer) {
      throw new BadRequestException('Transfer not found');
    }

    const updatedTransfer = await this.prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: user.employeeId,
        approvedAt: new Date(),
      },
    });

    // Emit event for real-time updates
    this.eventBus.publish(
      new StockTransferStatusChangedEvent(
        id,
        currentTransfer.sourceOutletId,
        currentTransfer.destinationOutletId,
        currentTransfer.businessId,
        currentTransfer.status as StockTransferStatus,
        'approved',
        user.employeeId,
      ),
    );

    return updatedTransfer;
  }

  @Put(':id/ship')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  async ship(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    // Get current transfer to emit event with correct data
    const currentTransfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      select: {
        status: true,
        sourceOutletId: true,
        destinationOutletId: true,
        businessId: true,
      },
    });

    if (!currentTransfer) {
      throw new BadRequestException('Transfer not found');
    }

    const updatedTransfer = await this.prisma.stockTransfer.update({
      where: { id },
      data: { status: 'in_transit', shippedAt: new Date() },
    });

    // Emit event for real-time updates
    this.eventBus.publish(
      new StockTransferStatusChangedEvent(
        id,
        currentTransfer.sourceOutletId,
        currentTransfer.destinationOutletId,
        currentTransfer.businessId,
        currentTransfer.status as StockTransferStatus,
        'shipped',
        user.employeeId,
      ),
    );

    return updatedTransfer;
  }

  @Put(':id/receive')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  async receive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    // Get current transfer to emit event with correct data
    const currentTransfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      select: {
        status: true,
        sourceOutletId: true,
        destinationOutletId: true,
        businessId: true,
      },
    });

    if (!currentTransfer) {
      throw new BadRequestException('Transfer not found');
    }

    const updatedTransfer = await this.prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'received',
        receivedBy: user.employeeId,
        receivedAt: new Date(),
      },
    });

    // Emit event for real-time updates
    this.eventBus.publish(
      new StockTransferStatusChangedEvent(
        id,
        currentTransfer.sourceOutletId,
        currentTransfer.destinationOutletId,
        currentTransfer.businessId,
        currentTransfer.status as StockTransferStatus,
        'received',
        user.employeeId,
      ),
    );

    return updatedTransfer;
  }

  @Post('direct')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  async directTransfer(
    @Body()
    dto: {
      sourceOutletId: string;
      destinationOutletId: string;
      items: {
        productId?: string;
        variantId?: string;
        itemName: string;
        quantity: number;
      }[];
      notes?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    if (dto.sourceOutletId === dto.destinationOutletId) {
      throw new BadRequestException('Outlet asal dan tujuan tidak boleh sama');
    }
    if (!dto.items?.length) {
      throw new BadRequestException('Minimal 1 item diperlukan');
    }

    const transferNumber = `TRF-D-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate stock availability at source
      for (const item of dto.items) {
        const stockLevel = await tx.stockLevel.findFirst({
          where: {
            outletId: dto.sourceOutletId,
            productId: item.productId || null,
            variantId: item.variantId || null,
          },
        });

        const available = stockLevel ? Number(stockLevel.quantity) : 0;
        if (available < item.quantity) {
          throw new BadRequestException(
            `Stok "${item.itemName}" tidak cukup (tersedia: ${available}, diminta: ${item.quantity})`,
          );
        }
      }

      // 2. Create transfer record (status = received directly)
      const transfer = await tx.stockTransfer.create({
        data: {
          businessId: user.businessId,
          transferNumber,
          sourceOutletId: dto.sourceOutletId,
          destinationOutletId: dto.destinationOutletId,
          status: 'received',
          notes: dto.notes || null,
          requestedBy: user.employeeId,
          approvedBy: user.employeeId,
          receivedBy: user.employeeId,
          approvedAt: now,
          shippedAt: now,
          receivedAt: now,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId || null,
              variantId: item.variantId || null,
              itemName: item.itemName,
              quantitySent: item.quantity,
              quantityReceived: item.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // 3. Update stock levels + create audit movements
      for (const item of dto.items) {
        // Decrement source
        await tx.stockLevel.updateMany({
          where: {
            outletId: dto.sourceOutletId,
            productId: item.productId || null,
            variantId: item.variantId || null,
          },
          data: { quantity: { decrement: item.quantity } },
        });

        // Increment destination (upsert)
        await tx.stockLevel.upsert({
          where: {
            outletId_productId_variantId: {
              outletId: dto.destinationOutletId,
              productId: item.productId || '',
              variantId: item.variantId || '',
            },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            outletId: dto.destinationOutletId,
            productId: item.productId || null,
            variantId: item.variantId || null,
            quantity: item.quantity,
          },
        });

        // Audit trail: transfer_out from source
        await tx.stockMovement.create({
          data: {
            outletId: dto.sourceOutletId,
            productId: item.productId || null,
            variantId: item.variantId || null,
            movementType: 'transfer_out',
            quantity: -item.quantity,
            referenceId: transfer.id,
            referenceType: 'direct_transfer',
            notes: `Transfer langsung ke outlet tujuan: ${transferNumber}`,
            createdBy: user.employeeId,
          },
        });

        // Audit trail: transfer_in to destination
        await tx.stockMovement.create({
          data: {
            outletId: dto.destinationOutletId,
            productId: item.productId || null,
            variantId: item.variantId || null,
            movementType: 'transfer_in',
            quantity: item.quantity,
            referenceId: transfer.id,
            referenceType: 'direct_transfer',
            notes: `Transfer langsung dari outlet asal: ${transferNumber}`,
            createdBy: user.employeeId,
          },
        });
      }

      // 4. Emit event
      this.eventBus.publish(
        new StockTransferStatusChangedEvent(
          transfer.id,
          dto.sourceOutletId,
          dto.destinationOutletId,
          user.businessId,
          'requested',
          'received',
          user.employeeId,
        ),
      );

      return {
        transferId: transfer.id,
        transferNumber,
        status: 'received',
        itemCount: dto.items.length,
      };
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
    const transfer = await this.prisma.stockTransfer
      .findUnique({
        where: { id },
        include: {
          items: true,
          sourceOutlet: true,
          destinationOutlet: true,
        },
      })
      .catch(() => null);

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return transfer;
  }
}
