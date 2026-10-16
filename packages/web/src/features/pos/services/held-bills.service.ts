import { useCartStore, type HeldBillScope } from '@/stores/cart.store';
import { heldBillsApi, type ServerHeldBill } from '@/api/endpoints/held-bills.api';
import type { HeldBill } from '@/types/pos.types';
import { toItemRequests } from '../utils/cart-request';

export function fromServer(bill: ServerHeldBill): HeldBill {
  return {
    id: bill.id,
    businessId: bill.businessId,
    outletId: bill.outletId,
    employeeId: bill.employeeId,
    syncState: 'synced',
    customerId: bill.customerId,
    customerName: bill.customerName,
    tableId: bill.tableId,
    tableName: bill.tableName,
    orderType: bill.orderType,
    notes: bill.notes,
    createdAt: bill.heldAt,
    discountAmount: bill.discountAmount,
    discountPercent: bill.discountPercent,
    subtotal: bill.subtotal,
    discountTotal: bill.discountTotal,
    items: bill.items.map((item, index) => ({
      id: `${bill.id}:${index}`,
      productId: item.productId ?? '',
      bundleId: item.bundleId,
      variantId: item.variantId,
      name: item.productName ?? 'Produk',
      variantName: item.variantName,
      price: item.unitPrice ?? 0,
      originalPrice: item.originalPrice,
      quantity: item.quantity,
      modifiers:
        item.modifiers ??
        (item.modifierIds ?? []).map((id) => ({ id, name: 'Tambahan', price: 0 })),
      notes: item.notes,
    })),
  };
}

export class HeldBillsService {
  private running: Promise<unknown> = Promise.resolve();
  constructor(
    private readonly api: typeof heldBillsApi,
    private readonly getScope: () => HeldBillScope | null,
    private readonly isOnline: () => boolean,
  ) {}
  private scope(): HeldBillScope {
    const scope = this.getScope();
    if (!scope?.businessId || !scope.outletId || !scope.employeeId)
      throw new Error('Pilih outlet dan login terlebih dahulu');
    return { ...scope };
  }
  private assertCurrent(scope: HeldBillScope) {
    const current = this.getScope();
    if (
      current?.businessId !== scope.businessId ||
      current.outletId !== scope.outletId ||
      current.employeeId !== scope.employeeId
    ) {
      throw new Error(
        'Akun atau outlet berubah. Pesanan tetap tersimpan untuk dilanjutkan di outlet asal.',
      );
    }
  }
  private run<T>(work: () => Promise<T>): Promise<T> {
    const promise = this.running.then(work, work);
    this.running = promise;
    return promise;
  }
  localBills(): HeldBill[] {
    const scope = this.getScope();
    if (!scope) return [];
    return useCartStore
      .getState()
      .heldBills.filter(
        (b) => b.businessId === scope?.businessId && b.outletId === scope?.outletId,
      );
  }
  legacyCount(): number {
    const scope = this.getScope();
    if (!scope) return 0;
    return useCartStore
      .getState()
      .heldBills.filter((b) => b.businessId === scope?.businessId && !b.outletId).length;
  }
  adoptLegacy(): void {
    const scope = this.scope();
    useCartStore.setState((state) => ({
      heldBills: state.heldBills.map((bill) =>
        bill.businessId === scope.businessId && !bill.outletId
          ? { ...bill, ...scope, id: crypto.randomUUID(), syncState: 'pending' as const }
          : bill,
      ),
    }));
  }
  private patch(scope: HeldBillScope, id: string, values: Partial<HeldBill>) {
    useCartStore.setState((state) => ({
      heldBills: state.heldBills.map((bill) =>
        bill.id === id && bill.businessId === scope.businessId && bill.outletId === scope.outletId
          ? { ...bill, ...values }
          : bill,
      ),
    }));
  }
  private remove(scope: HeldBillScope, id: string) {
    useCartStore.setState((state) => ({
      heldBills: state.heldBills.filter(
        (bill) =>
          !(
            bill.id === id &&
            bill.businessId === scope.businessId &&
            bill.outletId === scope.outletId
          ),
      ),
    }));
  }
  private async upload(scope: HeldBillScope, bill: HeldBill) {
    this.assertCurrent(scope);
    this.patch(scope, bill.id, { syncState: 'uncertain' });
    await this.api.hold({
      outletId: scope.outletId,
      clientBillId: bill.id,
      customerId: bill.customerId,
      customerName: bill.customerName,
      tableId: bill.tableId,
      orderType: bill.orderType,
      discountAmount: bill.discountAmount,
      discountPercent: bill.discountPercent,
      items: toItemRequests(bill.items, true),
      notes: bill.notes,
    });
    this.patch(scope, bill.id, { syncState: 'synced' });
  }
  hold(): Promise<HeldBill> {
    const scope = this.scope();
    return this.run(async () => {
      this.assertCurrent(scope);
      if (!useCartStore.getState().items.length) throw new Error('Keranjang kosong');
      const bill = useCartStore.getState().holdCurrentBill(scope);
      if (this.isOnline()) await this.upload(scope, bill);
      this.assertCurrent(scope);
      return this.localBills().find((b) => b.id === bill.id)!;
    });
  }
  sync(): Promise<void> {
    const scope = this.scope();
    return this.run(async () => {
      if (!this.isOnline()) return;
      this.assertCurrent(scope);
      // Always reconcile the server first: an earlier upload response may have
      // been lost, or a different terminal may already have claimed that bill.
      let cursor = '0';
      const server = new Map<string, HeldBill>();
      do {
        const page = await this.api.list(scope.outletId, cursor);
        this.assertCurrent(scope);
        for (const raw of page.bills) {
          if (raw.businessId !== scope.businessId || raw.outletId !== scope.outletId)
            throw new Error('Respons pesanan tidak sesuai outlet');
          server.set(raw.id, fromServer(raw));
        }
        cursor = page.cursor;
      } while (cursor !== '0');
      useCartStore.setState((state) => {
        const others = state.heldBills.filter(
          (b) => b.businessId !== scope.businessId || b.outletId !== scope.outletId,
        );
        const local = state.heldBills.filter(
          (b) => b.businessId === scope.businessId && b.outletId === scope.outletId,
        );
        for (const bill of local) {
          if (bill.pendingAction || (!server.has(bill.id) && bill.syncState !== 'synced'))
            server.set(bill.id, bill);
        }
        return { heldBills: [...others, ...server.values()] };
      });
      for (const bill of this.localBills()) {
        this.assertCurrent(scope);
        if (bill.pendingAction) continue;
        if (bill.syncState !== 'synced') await this.upload(scope, bill);
      }
    });
  }
  resume(id: string): Promise<void> {
    const scope = this.scope();
    return this.run(async () => {
      this.assertCurrent(scope);
      let bill = this.localBills().find((b) => b.id === id);
      if (!bill) throw new Error('Pesanan tidak ditemukan di outlet ini');
      if (bill.syncState !== 'pending' || bill.pendingAction) {
        if (!this.isOnline()) throw new Error('Pesanan server hanya dapat dilanjutkan saat online');
        if (bill.syncState !== 'synced') await this.upload(scope, bill);
        const requestId = bill.requestId ?? crypto.randomUUID();
        if (bill.actionEmployeeId && bill.actionEmployeeId !== scope.employeeId)
          throw new Error('Login dengan akun yang sebelumnya melanjutkan pesanan ini');
        this.patch(scope, id, {
          pendingAction: 'resume',
          requestId,
          actionEmployeeId: scope.employeeId,
        });
        const raw = await this.api.resume(scope.outletId, id, requestId);
        if (raw.businessId !== scope.businessId || raw.outletId !== scope.outletId)
          throw new Error('Respons pesanan tidak sesuai outlet');
        bill = fromServer(raw);
        this.assertCurrent(scope);
      }
      // Park the live cart only after a successful claim. Edits made while the
      // request was running are included in this new local draft.
      if (useCartStore.getState().items.length) useCartStore.getState().holdCurrentBill(scope);
      useCartStore.getState().resumeBill(bill);
    });
  }
  discard(id: string): Promise<void> {
    const scope = this.scope();
    return this.run(async () => {
      this.assertCurrent(scope);
      const bill = this.localBills().find((b) => b.id === id);
      if (!bill) throw new Error('Pesanan tidak ditemukan di outlet ini');
      if (bill.pendingAction === 'resume')
        throw new Error('Lanjutkan pemulihan pesanan sebelum menghapusnya');
      if (bill.syncState !== 'pending') {
        if (!this.isOnline()) throw new Error('Pesanan server hanya dapat dihapus saat online');
        this.patch(scope, id, { pendingAction: 'delete' });
        await this.api.discard(scope.outletId, id);
      }
      this.remove(scope, id);
    });
  }
}
