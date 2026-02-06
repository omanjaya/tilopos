import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/roles.guard';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { getDateRange } from '../utils/date-range.util';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class ProductReportsController {
  private readonly logger = new Logger(ProductReportsController.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('products')
  @ApiOperation({ summary: 'Product sales report (top products by revenue and quantity)' })
  async productReport(
    @Query('outletId') outletId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Validation
    if (!outletId) {
      throw new BadRequestException('outletId is required');
    }

    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { id: true },
    });
    if (!outlet) {
      throw new NotFoundException(`Outlet with ID ${outletId} not found`);
    }

    const { start, end } = getDateRange(dateRange, startDate, endDate);

    // Check cache
    const cacheKey = `report:products:${outletId}:${dateRange}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for products report: ${cacheKey}`);
      return cached;
    }

    // Get all completed sale transactions with items
    const transactions = await this.prisma.transaction.findMany({
      where: {
        outletId,
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Aggregate product sales
    const productStats = new Map<
      string,
      {
        productId: string;
        name: string;
        category: string | null;
        quantitySold: number;
        revenue: number;
      }
    >();

    let totalQuantitySold = 0;

    for (const tx of transactions) {
      for (const item of tx.items) {
        if (!item.product || !item.productId) continue;

        const key = item.productId;
        const existing = productStats.get(key);
        const quantity = item.quantity.toNumber();
        const itemRevenue = item.unitPrice.toNumber() * quantity;

        totalQuantitySold += quantity;

        if (existing) {
          existing.quantitySold += quantity;
          existing.revenue += itemRevenue;
        } else {
          productStats.set(key, {
            productId: item.productId,
            name: item.product.name,
            category: item.product.category?.name || null,
            quantitySold: quantity,
            revenue: itemRevenue,
          });
        }
      }
    }

    // Convert to array and sort by revenue
    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((p) => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
      }));

    const result = {
      topProducts,
      totalProducts: productStats.size,
      totalQuantitySold,
    };

    // Cache result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    this.logger.debug(`Cached products report: ${cacheKey}`);

    return result;
  }
}
