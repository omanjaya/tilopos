import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/roles.guard';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { getDateRange } from '../../reports/utils/date-range.util';

/**
 * Supplier Analytics Controller
 * Purchase history and payment status.
 */
@ApiTags('Supplier Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN, EmployeeRole.MANAGER, EmployeeRole.INVENTORY)
@Controller('suppliers')
export class SupplierAnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id/purchase-history')
  @ApiOperation({ summary: 'Purchase history for a supplier' })
  async getPurchaseHistory(
    @Param('id') supplierId: string,
    @CurrentUser() user: AuthUser,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Verify supplier belongs to business
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { businessId: true, name: true },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (supplier.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied to this supplier');
    }

    const { start, end } = getDateRange(dateRange, startDate, endDate);

    // Get purchase orders
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        supplierId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        outlet: {
          select: {
            name: true,
          },
        },
        items: {
          select: {
            itemName: true,
            quantityOrdered: true,
            unitCost: true,
            subtotal: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate statistics
    const totalPurchases = purchaseOrders.reduce(
      (sum, po) => sum + po.totalAmount.toNumber(),
      0,
    );

    const totalOrders = purchaseOrders.length;

    const avgOrderValue = totalOrders > 0 ? totalPurchases / totalOrders : 0;

    const statusCounts = {
      draft: purchaseOrders.filter((po) => po.status === 'draft').length,
      ordered: purchaseOrders.filter((po) => po.status === 'ordered').length,
      received: purchaseOrders.filter((po) => po.status === 'received').length,
      partial: purchaseOrders.filter((po) => po.status === 'partial').length,
      cancelled: purchaseOrders.filter((po) => po.status === 'cancelled').length,
    };

    return {
      supplierName: supplier.name,
      summary: {
        totalPurchases,
        totalOrders,
        avgOrderValue,
        statusCounts,
      },
      orders: purchaseOrders.map((po) => ({
        id: po.id,
        orderNumber: po.poNumber,
        orderDate: po.orderedAt || po.createdAt,
        status: po.status,
        totalAmount: po.totalAmount.toNumber(),
        outletName: po.outlet.name,
        itemCount: po.items.length,
        items: po.items.map((item) => ({
          productName: item.itemName || 'Unknown',
          quantity: Number(item.quantityOrdered),
          unitPrice: item.unitCost.toNumber(),
          subtotal: item.subtotal.toNumber(),
        })),
      })),
    };
  }

  @Get(':id/payment-status')
  @ApiOperation({ summary: 'Payment status and outstanding balance for supplier' })
  async getPaymentStatus(
    @Param('id') supplierId: string,
    @CurrentUser() user: AuthUser,
  ) {
    // Verify supplier belongs to business
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { businessId: true, name: true },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (supplier.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied to this supplier');
    }

    // Get all purchase orders
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        supplierId,
      },
      select: {
        id: true,
        poNumber: true,
        totalAmount: true,
        status: true,
        orderedAt: true,
        createdAt: true,
      },
    });

    // Calculate payment status based on order status
    // Orders with status COMPLETED are considered "paid"
    // Orders with status PENDING/APPROVED are considered "unpaid/outstanding"
    let totalPaid = 0;
    let totalDebt = 0;
    let totalPurchases = 0;
    const unpaidOrders: any[] = [];

    for (const po of purchaseOrders) {
      const total = po.totalAmount.toNumber();
      totalPurchases += total;

      if (po.status === 'received') {
        totalPaid += total;
      } else if (po.status !== 'cancelled') {
        totalDebt += total;

        unpaidOrders.push({
          id: po.id,
          orderNumber: po.poNumber,
          totalAmount: total,
          status: po.status,
          orderDate: po.orderedAt || po.createdAt,
        });
      }
    }

    return {
      supplierName: supplier.name,
      summary: {
        totalDebt,
        totalPaid,
        totalPurchases,
        paymentRate: totalPurchases > 0 ? (totalPaid / totalPurchases) * 100 : 0,
        unpaidOrdersCount: unpaidOrders.length,
        overdueOrdersCount: 0,
      },
      unpaidOrders: unpaidOrders.sort((a, b) =>
        new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime()
      ),
      overdueOrders: [],
    };
  }
}
