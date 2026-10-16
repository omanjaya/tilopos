import { StockEventListener } from './stock-event.listener';
import { StockLevelChangedEvent } from '../../domain/events/stock-level-changed.event';
import type { EventBusService } from './event-bus.service';
import type { PrismaService } from '../database/prisma.service';
import type { INotificationService } from '../../domain/interfaces/services/notification.service';

function build() {
  const prisma = {
    stockLevel: {
      findFirst: jest.fn().mockResolvedValue({
        lowStockAlert: 10,
        product: { name: 'Kopi', businessId: 'biz-1' },
        variant: null,
        outlet: { name: 'Outlet A' },
      }),
    },
    employee: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'm1', email: 'm1@example.com' },
        { id: 'm2', email: null },
      ]),
    },
    notificationLog: { create: jest.fn() },
  };
  const notifications = { send: jest.fn(), sendBulk: jest.fn() };
  const listener = new StockEventListener(
    {} as EventBusService,
    prisma as unknown as PrismaService,
    notifications as unknown as INotificationService,
  );
  return { listener, prisma, notifications };
}

const event = (prev: number, next: number) =>
  new StockLevelChangedEvent('outlet-1', 'product-1', null, prev, next);

describe('StockEventListener', () => {
  it('alerts once when the level crosses the threshold, with business scope for the log', async () => {
    const { listener, notifications, prisma } = build();
    await listener.handleStockLevelChanged(event(12, 9));

    expect(notifications.sendBulk).toHaveBeenCalledTimes(1);
    const sent = notifications.sendBulk.mock.calls[0][0];
    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({
      recipientId: 'm1',
      channel: 'email',
      metadata: { businessId: 'biz-1', notificationType: 'low_stock', email: 'm1@example.com' },
    });
    // no fake "sent" log row written by the listener itself
    expect(prisma.notificationLog.create).not.toHaveBeenCalled();
  });

  it('does not re-alert on every sale while already below the threshold', async () => {
    const { listener, notifications } = build();
    await listener.handleStockLevelChanged(event(9, 8));
    expect(notifications.sendBulk).not.toHaveBeenCalled();
  });
});
