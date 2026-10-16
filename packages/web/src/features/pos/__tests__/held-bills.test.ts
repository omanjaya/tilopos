import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from '@/stores/cart.store';
import { HeldBillsService } from '../services/held-bills.service';

const scope = { businessId: 'business-a', outletId: 'outlet-a', employeeId: 'employee-a' };
const item = { productId: 'p', name: 'Coffee', price: 12000, quantity: 1, modifiers: [] };
function setup(online = true) {
  const api = {
    hold: vi.fn().mockResolvedValue({ billId: 'id' }),
    list: vi.fn().mockResolvedValue({ bills: [], cursor: '0' }),
    resume: vi.fn(),
    discard: vi.fn(),
  };
  let current = scope;
  const service = new HeldBillsService(
    api,
    () => current,
    () => online,
  );
  return {
    service,
    api,
    switchScope: (next: typeof scope) => {
      current = next;
    },
  };
}
beforeEach(() => {
  localStorage.clear();
  useCartStore.getState().clearCart();
  useCartStore.setState({ heldBills: [], heldBillsBusinessId: null });
  useCartStore.getState().addItem(item);
});
describe('held bill persistence', () => {
  it('saves online through the backend and keeps its business/outlet scope', async () => {
    const { service, api } = setup();
    await service.hold();
    expect(api.hold).toHaveBeenCalledWith(
      expect.objectContaining({ outletId: scope.outletId, clientBillId: expect.any(String) }),
    );
    expect(useCartStore.getState().items).toEqual([]);
    expect(service.localBills()[0]).toMatchObject({
      businessId: scope.businessId,
      outletId: scope.outletId,
      syncState: 'synced',
    });
  });
  it('keeps an offline bill and uploads the same id after reconnect', async () => {
    const offline = setup(false);
    const bill = await offline.service.hold();
    expect(offline.api.hold).not.toHaveBeenCalled();
    expect(bill.syncState).toBe('pending');
    const online = setup();
    await online.service.sync();
    expect(online.api.hold).toHaveBeenCalledWith(
      expect.objectContaining({ clientBillId: bill.id }),
    );
  });
  it('retains the pending snapshot if upload fails', async () => {
    const { service, api } = setup();
    api.hold.mockRejectedValue(new Error('connection lost'));
    await expect(service.hold()).rejects.toThrow('connection lost');
    expect(service.localBills()).toHaveLength(1);
    expect(service.localBills()[0]?.syncState).toBe('uncertain');
  });
  it('does not show or upload another business or outlet draft', async () => {
    const { service, api, switchScope } = setup(false);
    await service.hold();
    switchScope({ ...scope, outletId: 'outlet-b' });
    expect(service.localBills()).toEqual([]);
    switchScope({ ...scope, businessId: 'business-b' });
    expect(service.localBills()).toEqual([]);
    await service.sync();
    expect(api.hold).not.toHaveBeenCalled();
    expect(useCartStore.getState().heldBills).toHaveLength(1);
  });
  it('does not resume a server copy while offline', async () => {
    const { service } = setup(false);
    const bill = await service.hold();
    useCartStore.setState({ heldBills: [{ ...bill, syncState: 'synced' }] });
    await expect(service.resume(bill.id)).rejects.toThrow(/online/i);
    expect(useCartStore.getState().items).toEqual([]);
  });
  it('can resume a never-uploaded offline draft without losing the active cart', async () => {
    const { service } = setup(false);
    const held = await service.hold();
    useCartStore.getState().addItem({ ...item, productId: 'other' });
    await service.resume(held.id);
    expect(useCartStore.getState().items[0]?.productId).toBe('p');
    expect(service.localBills()[0]?.items[0]?.productId).toBe('other');
  });
});

describe('held bill retries and account changes', () => {
  it('reuses the claim id after a lost resume response', async () => {
    const { service, api } = setup();
    const bill = await service.hold();
    api.resume
      .mockRejectedValueOnce(new Error('response lost'))
      .mockResolvedValueOnce({
        ...scope,
        id: bill.id,
        heldAt: bill.createdAt,
        items: [{ productId: 'p', productName: 'Coffee', unitPrice: 12000, quantity: 1 }],
      });
    await expect(service.resume(bill.id)).rejects.toThrow('response lost');
    expect(useCartStore.getState().items).toEqual([]);
    await service.resume(bill.id);
    expect(api.resume.mock.calls[0]?.[2]).toBe(api.resume.mock.calls[1]?.[2]);
    expect(useCartStore.getState().items[0]?.name).toBe('Coffee');
  });
  it('does not put an old outlet response into the new outlet cart', async () => {
    const { service, api, switchScope } = setup();
    const bill = await service.hold();
    api.resume.mockImplementation(async () => {
      switchScope({ ...scope, outletId: 'other-outlet' });
      useCartStore.getState().addItem({ ...item, productId: 'other-cart' });
      return {
        ...scope,
        id: bill.id,
        heldAt: bill.createdAt,
        items: [{ productId: 'p', quantity: 1 }],
      };
    });
    await expect(service.resume(bill.id)).rejects.toThrow(/outlet berubah/);
    expect(useCartStore.getState().items[0]?.productId).toBe('other-cart');
    expect(useCartStore.getState().heldBills[0]?.pendingAction).toBe('resume');
  });
  it('does not delete the local copy until the server confirms deletion', async () => {
    const { service, api } = setup();
    const bill = await service.hold();
    api.discard.mockRejectedValueOnce(new Error('connection lost'));
    await expect(service.discard(bill.id)).rejects.toThrow();
    expect(service.localBills()[0]?.pendingAction).toBe('delete');
    api.discard.mockResolvedValueOnce({ success: true });
    await service.discard(bill.id);
    expect(service.localBills()).toEqual([]);
  });
  it('does not replace local bills when listing fails', async () => {
    const { service, api } = setup(false);
    await service.hold();
    const online = setup();
    online.api.list.mockRejectedValue(new Error('forbidden'));
    await expect(online.service.sync()).rejects.toThrow('forbidden');
    expect(service.localBills()).toHaveLength(1);
    expect(api.list).not.toHaveBeenCalled();
  });
  it('requires explicit outlet assignment for known legacy bills and never adopts unknown tenants', () => {
    useCartStore.setState({
      heldBillsBusinessId: 'business-a',
      heldBills: [{ id: 'old', items: [], createdAt: '' }],
    });
    useCartStore.getState().scopeHeldBillsToBusiness('business-b');
    const { service } = setup(false);
    expect(service.localBills()).toEqual([]);
    expect(service.legacyCount()).toBe(1);
    service.adoptLegacy();
    expect(service.localBills()[0]?.outletId).toBe('outlet-a');
    useCartStore.setState({
      heldBillsBusinessId: null,
      heldBills: [{ id: 'unknown', items: [], createdAt: '' }],
    });
    useCartStore.getState().scopeHeldBillsToBusiness('business-a');
    useCartStore.getState().scopeHeldBillsToBusiness('business-b');
    expect(useCartStore.getState().heldBills[0]?.businessId).toBeUndefined();
  });
});
