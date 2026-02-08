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
} from '@nestjs/common';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@infrastructure/auth/current-user.decorator';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { WorkOrdersService } from './work-orders.service';
import type { WorkOrderStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get('outlet/:outletId')
  async list(
    @Param('outletId') outletId: string,
    @Query('status') status?: WorkOrderStatus,
    @Query('search') search?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.workOrdersService.list(outletId, user!.businessId, { status, search });
  }

  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.workOrdersService.findById(id, user.businessId);
  }

  @Post()
  async create(
    @Body()
    body: {
      outletId: string;
      customerId?: string;
      employeeId?: string;
      title: string;
      description?: string;
      itemDescription?: string;
      itemBrand?: string;
      itemModel?: string;
      itemSerial?: string;
      diagnosis?: string;
      priority?: string;
      estimatedCost?: number;
      estimatedDate?: string;
      customerName?: string;
      customerPhone?: string;
      notes?: string;
      items?: {
        description: string;
        type: string;
        quantity: number;
        unitPrice: number;
      }[];
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.workOrdersService.create(user.businessId, body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      customerId?: string;
      employeeId?: string;
      title?: string;
      description?: string;
      itemDescription?: string;
      itemBrand?: string;
      itemModel?: string;
      itemSerial?: string;
      diagnosis?: string;
      priority?: string;
      estimatedCost?: number;
      finalCost?: number;
      estimatedDate?: string;
      customerName?: string;
      customerPhone?: string;
      notes?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.workOrdersService.update(id, user.businessId, body);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: WorkOrderStatus },
    @CurrentUser() user: AuthUser,
  ) {
    return this.workOrdersService.updateStatus(id, user.businessId, body.status);
  }

  @Post(':id/items')
  async addItem(
    @Param('id') id: string,
    @Body()
    body: {
      description: string;
      type: string;
      quantity: number;
      unitPrice: number;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.workOrdersService.addItem(id, user.businessId, body);
  }

  @Delete('items/:itemId')
  async removeItem(@Param('itemId') itemId: string, @CurrentUser() user: AuthUser) {
    return this.workOrdersService.removeItem(itemId, user.businessId);
  }

  @Get(':id/total')
  async calculateTotal(@Param('id') id: string) {
    return this.workOrdersService.calculateTotal(id);
  }
}
