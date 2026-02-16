import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { WebhookGuard } from '../../shared/guards/webhook.guard';
import { SubscriptionService } from './subscription.service';
import { CreateUpgradeDto, CancelSubscriptionDto } from './dto/create-subscription.dto';

@ApiTags('Subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Get current subscription info' })
  async getSubscription(@CurrentUser() user: AuthUser) {
    return this.subscriptionService.getSubscription(user.businessId);
  }

  @Post('upgrade')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Create upgrade invoice and get payment URL' })
  async createUpgrade(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateUpgradeDto,
  ) {
    return this.subscriptionService.createUpgrade(
      user.businessId,
      dto.billingCycle,
      dto.provider || 'xendit',
    );
  }

  @Post('cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(
    @CurrentUser() user: AuthUser,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionService.cancelSubscription(user.businessId, dto.reason);
  }

  @Get('invoices')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'List subscription invoices' })
  async getInvoices(@CurrentUser() user: AuthUser) {
    return this.subscriptionService.getInvoices(user.businessId);
  }

  @Post('webhook/midtrans')
  @UseGuards(WebhookGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Midtrans payment webhook for subscription' })
  async handleMidtransWebhook(@Body() payload: Record<string, unknown>) {
    return this.subscriptionService.handlePaymentCallback('midtrans', payload);
  }

  @Post('webhook/xendit')
  @UseGuards(WebhookGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Xendit payment webhook for subscription' })
  async handleXenditWebhook(@Body() payload: Record<string, unknown>) {
    return this.subscriptionService.handlePaymentCallback('xendit', payload);
  }
}
