import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { ItemTrackingService } from './item-tracking.service';
import { ServiceItemStatus } from '@prisma/client';

interface AuthenticatedRequest {
  user: { businessId: string };
}

interface ReceiveBody {
  outletId: string;
  customerId?: string;
  itemName: string;
  itemDescription?: string;
  quantity?: number;
  serviceName: string;
  servicePrice: number;
  estimatedReady?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

interface UpdateBody {
  itemName?: string;
  itemDescription?: string;
  quantity?: number;
  serviceName?: string;
  servicePrice?: number;
  estimatedReady?: string | null;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

@Controller('api/v1/item-tracking')
@UseGuards(JwtAuthGuard)
export class ItemTrackingController {
  constructor(private readonly itemTrackingService: ItemTrackingService) {}

  @Get('outlet/:outletId')
  async listByOutlet(
    @Param('outletId') outletId: string,
    @Query('status') status: ServiceItemStatus | undefined,
    @Query('search') search: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const businessId = req.user.businessId;
    return this.itemTrackingService.listByOutlet(outletId, businessId, { status, search });
  }

  @Get('active/:outletId')
  async getActive(@Param('outletId') outletId: string, @Req() req: AuthenticatedRequest) {
    const businessId = req.user.businessId;
    return this.itemTrackingService.getActive(outletId, businessId);
  }

  @Get('customer/:customerId')
  async listByCustomer(@Param('customerId') customerId: string, @Req() req: AuthenticatedRequest) {
    const businessId = req.user.businessId;
    return this.itemTrackingService.listByCustomer(customerId, businessId);
  }

  @Get('ticket/:ticketNumber')
  async findByTicket(
    @Param('ticketNumber') ticketNumber: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const businessId = req.user.businessId;
    return this.itemTrackingService.findByTicket(ticketNumber, businessId);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const businessId = req.user.businessId;
    return this.itemTrackingService.findById(id, businessId);
  }

  @Post()
  async receive(@Body() dto: ReceiveBody, @Req() req: AuthenticatedRequest) {
    const businessId = req.user.businessId;
    return this.itemTrackingService.receive(businessId, dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBody, @Req() req: AuthenticatedRequest) {
    const businessId = req.user.businessId;
    return this.itemTrackingService.update(id, businessId, dto);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: ServiceItemStatus },
    @Req() req: AuthenticatedRequest,
  ) {
    const businessId = req.user.businessId;
    return this.itemTrackingService.updateStatus(id, businessId, dto.status);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const businessId = req.user.businessId;
    await this.itemTrackingService.delete(id, businessId);
    return { message: 'Service item deleted' };
  }
}
