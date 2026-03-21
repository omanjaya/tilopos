import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface CancelStockOpnameInput {
  opnameId: string;
}

@Injectable()
export class CancelStockOpnameUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CancelStockOpnameInput) {
    const opname = await this.prisma.stockOpname.findUnique({
      where: { id: input.opnameId },
    });

    if (!opname) throw new NotFoundException('Stock opname not found');
    if (opname.status === 'completed' || opname.status === 'cancelled') {
      throw new BadRequestException(`Cannot cancel opname with status "${opname.status}"`);
    }

    return this.prisma.stockOpname.update({
      where: { id: input.opnameId },
      data: { status: 'cancelled' },
    });
  }
}
