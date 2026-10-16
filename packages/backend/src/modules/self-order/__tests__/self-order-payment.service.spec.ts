import { NotImplementedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SelfOrderPaymentService } from '../self-order-payment.service';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('SelfOrderPaymentService', () => {
  describe('calculateSessionTotal', () => {
    it('includes server-side modifier prices, tax and service charge in rupiah', async () => {
      const prisma = {
        selfOrderSession: {
          findUnique: jest.fn().mockResolvedValue({
            outlet: {
              businessId: 'biz-1',
              taxRate: new Prisma.Decimal(11),
              serviceCharge: new Prisma.Decimal(5),
            },
            items: [
              {
                productId: 'prod-1',
                quantity: 2,
                // client-looking junk price must be ignored; only the id counts
                modifiers: [{ id: 'mod-1', name: 'Extra Keju', price: '1' }],
                product: { basePrice: new Prisma.Decimal(20000) },
                variant: null,
              },
              {
                productId: 'prod-2',
                quantity: 1,
                modifiers: [],
                product: { basePrice: new Prisma.Decimal(10000) },
                variant: { price: new Prisma.Decimal(12500) },
              },
            ],
          }),
        },
        modifier: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'mod-1',
              name: 'Extra Keju',
              price: new Prisma.Decimal(5000),
              modifierGroup: { productModifierGroups: [{ productId: 'prod-1' }] },
            },
          ]),
        },
      };
      const service = new SelfOrderPaymentService(prisma as unknown as PrismaService);

      const totals = await service.calculateSessionTotal('CODE');
      // (20000 + 5000) * 2 + 12500 = 62500
      expect(totals.subtotal).toBe(62500);
      expect(totals.taxAmount).toBe(6875); // 11%
      expect(totals.serviceChargeAmount).toBe(3125); // 5%
      expect(totals.grandTotal).toBe(72500);
      expect(totals.itemCount).toBe(3);
    });
  });

  describe('handlePaymentCallback', () => {
    function makePrisma() {
      const session = { id: 'sess-1', status: 'submitted', paymentRef: 'SO-ref' };
      return {
        session,
        prisma: {
          selfOrderSession: {
            findFirst: jest.fn(async () => ({ id: session.id, status: session.status })),
            updateMany: jest.fn(async ({ where, data }) => {
              if (where.status === session.status && where.paymentRef === session.paymentRef) {
                Object.assign(session, data);
                return { count: 1 };
              }
              return { count: 0 };
            }),
          },
          order: { create: jest.fn() },
          orderItem: { create: jest.fn() },
        },
      };
    }

    it('marks the session paid once and never creates a kitchen order, even on replay', async () => {
      const { prisma, session } = makePrisma();
      const service = new SelfOrderPaymentService(prisma as unknown as PrismaService);

      const first = await service.handlePaymentCallback('SO-ref', 'success');
      const second = await service.handlePaymentCallback('SO-ref', 'success');

      expect(first.applied).toBe(true);
      expect(second.applied).toBe(false);
      expect(session.status).toBe('paid');
      expect(prisma.order.create).not.toHaveBeenCalled();
      expect(prisma.orderItem.create).not.toHaveBeenCalled();
    });

    it('matches the exact payment reference only', async () => {
      const { prisma } = makePrisma();
      prisma.selfOrderSession.findFirst.mockResolvedValueOnce(null as never);
      const service = new SelfOrderPaymentService(prisma as unknown as PrismaService);

      await expect(service.handlePaymentCallback('SO-other-123', 'success')).rejects.toThrow(
        'Unknown payment reference',
      );
      expect(prisma.selfOrderSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { paymentRef: 'SO-other-123' } }),
      );
    });
  });

  describe('createPayment', () => {
    it('fails honestly for digital methods instead of returning a placeholder QR', async () => {
      const prisma = { selfOrderSession: { findUnique: jest.fn(), updateMany: jest.fn() } };
      const service = new SelfOrderPaymentService(prisma as unknown as PrismaService);

      await expect(
        service.createPayment({ sessionCode: 'CODE', paymentMethod: 'qris', amount: 1000 }),
      ).rejects.toBeInstanceOf(NotImplementedException);
      await expect(service.initiateQRISPayment('CODE', 1000)).rejects.toBeInstanceOf(
        NotImplementedException,
      );
      expect(prisma.selfOrderSession.updateMany).not.toHaveBeenCalled();
    });
  });
});
