import { EventEmitter } from 'events';
import { MarketplaceService } from './marketplace.service';
import { GoFoodGateway } from './gofood.gateway';
import { GrabFoodGateway } from './grabfood.gateway';
import { ShopeeFoodGateway } from './shopeefood.gateway';
import type { MarketplaceCredentials } from './marketplace.types';
import type { DistributedLockService } from '../../../shared/locks/distributed-lock.service';

const OUTLET_A = '11111111-2222-3333-4444-555555555555';
const OUTLET_B = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function credsFor(merchantId: string): MarketplaceCredentials {
  return { merchantId, apiKey: 'k', apiSecret: 's' };
}

function build(configured = { gofood: false, grabfood: false, shopeefood: false }) {
  const gofood = new GoFoodGateway();
  const grabfood = new GrabFoodGateway();
  const shopeefood = new ShopeeFoodGateway();
  Object.defineProperty(gofood, 'isConfigured', { value: configured.gofood });
  Object.defineProperty(grabfood, 'isConfigured', { value: configured.grabfood });
  Object.defineProperty(shopeefood, 'isConfigured', { value: configured.shopeefood });

  const lock = {
    runExclusive: jest.fn((_k: string, _t: number, fn: () => Promise<unknown>) => fn()),
  } as unknown as DistributedLockService;
  const emitter = new EventEmitter();
  const service = new MarketplaceService(emitter, lock, gofood, grabfood, shopeefood);
  return { service, gofood, grabfood, shopeefood, lock, emitter };
}

describe('MarketplaceService', () => {
  it('refuses to connect an unconfigured (stub) gateway with 501', async () => {
    const { service } = build();
    await expect(service.connect(OUTLET_A, 'gofood', credsFor('m1'))).rejects.toMatchObject({
      status: 501,
    });
    expect(service.getConnectedPlatforms(OUTLET_A)).toEqual([]);
  });

  it('does not poll (nor take the lock) while every gateway is a stub', async () => {
    const { service, lock } = build();
    await service.pollOrders();
    expect(lock.runExclusive).not.toHaveBeenCalled();
  });

  it('keys connections by full outlet UUID and passes each outlet its own credentials', async () => {
    const { service, gofood, lock, emitter } = build({
      gofood: true,
      grabfood: false,
      shopeefood: false,
    });
    jest.spyOn(gofood, 'authenticate').mockImplementation(async (c) => c);
    const fetchSpy = jest
      .spyOn(gofood, 'fetchNewOrders')
      .mockImplementation(async (c) => [{ externalId: c.merchantId } as never]);

    await service.connect(OUTLET_A, 'gofood', credsFor('merchant-a'));
    await service.connect(OUTLET_B, 'gofood', credsFor('merchant-b'));

    expect(service.getConnectedPlatforms(OUTLET_A)).toEqual(['gofood']);
    expect(service.getConnectedPlatforms(OUTLET_B)).toEqual(['gofood']);

    const events: Array<{ outletId: string; order: { externalId: string } }> = [];
    emitter.on('marketplace.order.new', (e) => events.push(e));

    await service.pollOrders();

    expect(lock.runExclusive).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(events).toEqual([
      { outletId: OUTLET_A, order: { externalId: 'merchant-a' } },
      { outletId: OUTLET_B, order: { externalId: 'merchant-b' } },
    ]);

    await service.disconnect(OUTLET_A, 'gofood');
    expect(service.getConnectedPlatforms(OUTLET_A)).toEqual([]);
    expect(service.getConnectedPlatforms(OUTLET_B)).toEqual(['gofood']);
  });

  it('reports per-platform failures instead of swallowing them', async () => {
    const { service, gofood } = build({ gofood: true, grabfood: false, shopeefood: false });
    jest.spyOn(gofood, 'authenticate').mockImplementation(async (c) => c);
    jest.spyOn(gofood, 'syncMenu').mockRejectedValue(new Error('boom'));

    await service.connect(OUTLET_A, 'gofood', credsFor('m'));
    const results = await service.syncMenu(OUTLET_A, []);
    expect(results).toEqual([{ platform: 'gofood', success: false, error: 'boom' }]);
  });

  it('rejects order actions for an outlet that is not connected', async () => {
    const { service } = build({ gofood: true, grabfood: false, shopeefood: false });
    await expect(service.acceptOrder(OUTLET_A, 'gofood', 'o1')).rejects.toMatchObject({
      status: 400,
    });
  });
});
