import { assertScopedWhere, UnscopedQueryError } from './strict-where';

describe('assertScopedWhere', () => {
  it('rejects id: undefined', () => {
    expect(() =>
      assertScopedWhere('Outlet', 'findFirst', { id: undefined, businessId: 'b1' }),
    ).toThrow(UnscopedQueryError);
  });

  it('rejects businessId: undefined', () => {
    expect(() => assertScopedWhere('Customer', 'findMany', { businessId: undefined })).toThrow(
      UnscopedQueryError,
    );
  });

  it('rejects an undefined outletId when nothing else scopes the query', () => {
    expect(() =>
      assertScopedWhere('Order', 'findMany', { outletId: undefined, status: 'pending' }),
    ).toThrow(UnscopedQueryError);
  });

  it('allows an optional outletId filter inside a business-scoped query', () => {
    expect(() =>
      assertScopedWhere('Transaction', 'findMany', {
        outletId: undefined,
        outlet: { businessId: 'b1' },
      }),
    ).not.toThrow();
  });

  it('allows scope provided through AND', () => {
    expect(() =>
      assertScopedWhere('Order', 'count', { outletId: undefined, AND: [{ businessId: 'b1' }] }),
    ).not.toThrow();
  });

  it('ignores actions without a where clause', () => {
    expect(() => assertScopedWhere('Order', 'create', { id: undefined })).not.toThrow();
  });
});
