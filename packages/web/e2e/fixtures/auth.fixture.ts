import { type Page } from '@playwright/test';

/**
 * A mock JWT token that decodes to a valid payload with a far-future expiry.
 * Structure: header.payload.signature
 * Payload: { sub: "emp-1", role: "owner", businessId: "biz-1", outletId: "outlet-1", exp: 4102444800 }
 * (exp = 2100-01-01T00:00:00Z)
 */
function createMockJWT(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: 'emp-1',
      role: 'owner',
      businessId: 'biz-1',
      outletId: 'outlet-1',
      exp: 4102444800,
    }),
  );
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

/**
 * Mock user object matching the AuthUser type used by the auth store.
 */
export const mockUser = {
  id: 'emp-1',
  name: 'John Owner',
  email: 'john@tilo.test',
  role: 'owner',
  businessId: 'biz-1',
  outletId: 'outlet-1',
  employeeId: 'emp-1',
  outletName: 'Outlet Utama',
};

export const mockToken = createMockJWT();

/**
 * Sets authenticated state in localStorage before navigating.
 * Must be called after page.goto() at least once so the origin is set,
 * or via page.addInitScript().
 */
export async function setAuthenticatedState(page: Page): Promise<void> {
  await page.addInitScript(
    ({ user, token }: { user: typeof mockUser; token: string }) => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
    },
    { user: mockUser, token: mockToken },
  );
}

/**
 * Clears auth state from localStorage.
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('tilo-pos-cart');
    localStorage.removeItem('selectedOutletId');
  });
}
