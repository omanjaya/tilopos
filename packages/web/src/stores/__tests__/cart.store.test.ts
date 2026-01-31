import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../cart.store';
import type { CartItem } from '@/types/pos.types';

// Helper to create a cart item (without 'id' — the store generates it)
function createCartItemInput(overrides: Partial<Omit<CartItem, 'id'>> = {}): Omit<CartItem, 'id'> {
  return {
    productId: 'prod-1',
    name: 'Nasi Goreng',
    price: 25000,
    quantity: 1,
    modifiers: [],
    ...overrides,
  };
}

describe('cart.store', () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.getState().clearCart();
  });

  describe('addItem', () => {
    it('adds a new product to the cart', () => {
      useCartStore.getState().addItem(createCartItemInput());

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0]?.name).toBe('Nasi Goreng');
      expect(state.items[0]?.price).toBe(25000);
      expect(state.items[0]?.quantity).toBe(1);
    });

    it('generates a unique id for the cart item', () => {
      useCartStore.getState().addItem(createCartItemInput());

      const item = useCartStore.getState().items[0];
      expect(item?.id).toBeDefined();
      expect(item?.id).toMatch(/^cart-/);
    });

    it('increments quantity when adding the same product', () => {
      useCartStore.getState().addItem(createCartItemInput());
      useCartStore.getState().addItem(createCartItemInput());

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0]?.quantity).toBe(2);
    });

    it('adds as separate items when modifiers differ', () => {
      useCartStore.getState().addItem(createCartItemInput());
      useCartStore.getState().addItem(
        createCartItemInput({
          modifiers: [{ id: 'mod-1', name: 'Extra Pedas', price: 3000 }],
        }),
      );

      expect(useCartStore.getState().items).toHaveLength(2);
    });

    it('adds as separate items when variant differs', () => {
      useCartStore.getState().addItem(createCartItemInput({ variantId: 'var-1' }));
      useCartStore.getState().addItem(createCartItemInput({ variantId: 'var-2' }));

      expect(useCartStore.getState().items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('removes an item from the cart by id', () => {
      useCartStore.getState().addItem(createCartItemInput());
      const itemId = useCartStore.getState().items[0]?.id;

      expect(itemId).toBeDefined();
      useCartStore.getState().removeItem(itemId!);

      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('does not affect other items', () => {
      useCartStore.getState().addItem(createCartItemInput({ productId: 'prod-1', name: 'Item A' }));
      useCartStore.getState().addItem(createCartItemInput({ productId: 'prod-2', name: 'Item B' }));

      const firstItemId = useCartStore.getState().items[0]?.id;
      expect(firstItemId).toBeDefined();
      useCartStore.getState().removeItem(firstItemId!);

      const remaining = useCartStore.getState().items;
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.name).toBe('Item B');
    });
  });

  describe('updateItemQuantity', () => {
    it('changes the quantity of an item', () => {
      useCartStore.getState().addItem(createCartItemInput());
      const itemId = useCartStore.getState().items[0]?.id;

      expect(itemId).toBeDefined();
      useCartStore.getState().updateItemQuantity(itemId!, 5);

      expect(useCartStore.getState().items[0]?.quantity).toBe(5);
    });

    it('removes the item when quantity is set to 0', () => {
      useCartStore.getState().addItem(createCartItemInput());
      const itemId = useCartStore.getState().items[0]?.id;

      expect(itemId).toBeDefined();
      useCartStore.getState().updateItemQuantity(itemId!, 0);

      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('removes the item when quantity is negative', () => {
      useCartStore.getState().addItem(createCartItemInput());
      const itemId = useCartStore.getState().items[0]?.id;

      expect(itemId).toBeDefined();
      useCartStore.getState().updateItemQuantity(itemId!, -1);

      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('empties all items from the cart', () => {
      useCartStore.getState().addItem(createCartItemInput({ productId: 'prod-1' }));
      useCartStore.getState().addItem(createCartItemInput({ productId: 'prod-2' }));

      useCartStore.getState().clearCart();

      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('resets all computed values to zero', () => {
      useCartStore.getState().addItem(createCartItemInput());
      useCartStore.getState().clearCart();

      const state = useCartStore.getState();
      expect(state.subtotal).toBe(0);
      expect(state.discountTotal).toBe(0);
      expect(state.taxAmount).toBe(0);
      expect(state.serviceCharge).toBe(0);
      expect(state.total).toBe(0);
    });

    it('resets customer and table info', () => {
      useCartStore.getState().setCustomer('cust-1', 'Customer A');
      useCartStore.getState().setTable('table-1', 'Table 1');
      useCartStore.getState().clearCart();

      const state = useCartStore.getState();
      expect(state.customerId).toBeUndefined();
      expect(state.customerName).toBeUndefined();
      expect(state.tableId).toBeUndefined();
      expect(state.tableName).toBeUndefined();
    });

    it('resets order type to dine_in', () => {
      useCartStore.getState().setOrderType('takeaway');
      useCartStore.getState().clearCart();

      expect(useCartStore.getState().orderType).toBe('dine_in');
    });
  });

  describe('cartTotal (recalculate)', () => {
    it('calculates subtotal from item prices and quantities', () => {
      useCartStore.getState().addItem(createCartItemInput({ price: 10000, quantity: 2 }));

      expect(useCartStore.getState().subtotal).toBe(20000);
    });

    it('includes modifier prices in subtotal', () => {
      useCartStore.getState().addItem(
        createCartItemInput({
          price: 10000,
          quantity: 1,
          modifiers: [{ id: 'mod-1', name: 'Extra', price: 5000 }],
        }),
      );

      // subtotal = (10000 + 5000) * 1 = 15000
      expect(useCartStore.getState().subtotal).toBe(15000);
    });

    it('calculates tax (11% PPN) for dine-in orders', () => {
      useCartStore.getState().addItem(createCartItemInput({ price: 100000, quantity: 1 }));

      const state = useCartStore.getState();
      // subtotal = 100000
      // service charge (dine-in) = 100000 * 0.05 = 5000
      // tax = (100000 + 5000) * 0.11 = 11550
      expect(state.serviceCharge).toBe(5000);
      expect(state.taxAmount).toBe(11550);
    });

    it('omits service charge for takeaway orders', () => {
      useCartStore.getState().setOrderType('takeaway');
      useCartStore.getState().addItem(createCartItemInput({ price: 100000, quantity: 1 }));

      const state = useCartStore.getState();
      expect(state.serviceCharge).toBe(0);
      // tax = 100000 * 0.11 = 11000
      expect(state.taxAmount).toBe(11000);
    });

    it('calculates total as subtotal - discount + service charge + tax', () => {
      useCartStore.getState().addItem(createCartItemInput({ price: 100000, quantity: 1 }));

      const state = useCartStore.getState();
      const expectedTotal = state.subtotal - state.discountTotal + state.serviceCharge + state.taxAmount;
      expect(state.total).toBe(expectedTotal);
    });
  });

  describe('cartItemCount', () => {
    it('counts individual item quantities', () => {
      useCartStore.getState().addItem(createCartItemInput({ productId: 'prod-1', quantity: 3 }));
      useCartStore.getState().addItem(createCartItemInput({ productId: 'prod-2', quantity: 2 }));

      const items = useCartStore.getState().items;
      const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
      expect(totalCount).toBe(5);
    });

    it('returns zero for an empty cart', () => {
      const items = useCartStore.getState().items;
      const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
      expect(totalCount).toBe(0);
    });
  });

  describe('discount', () => {
    it('applies a percentage discount', () => {
      useCartStore.getState().addItem(createCartItemInput({ price: 100000, quantity: 1 }));
      useCartStore.getState().setDiscountPercent(10);

      const state = useCartStore.getState();
      expect(state.discountTotal).toBe(10000);
    });

    it('applies a fixed amount discount', () => {
      useCartStore.getState().addItem(createCartItemInput({ price: 100000, quantity: 1 }));
      useCartStore.getState().setDiscountAmount(15000);

      expect(useCartStore.getState().discountTotal).toBe(15000);
    });
  });
});
