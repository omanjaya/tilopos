import { type Page, request as playwrightRequest } from '@playwright/test';

/**
 * Seed user credentials from the database seeder.
 * These are the default users created by `npm run db:seed`.
 */
const SEED_CREDENTIALS = {
  owner: { email: 'budi@brewbites.id', pin: '1234' },
  manager: { email: 'siti@brewbites.id', pin: '1234' },
  supervisor: { email: 'agus@brewbites.id', pin: '1234' },
  cashier: { email: 'dewi@brewbites.id', pin: '1234' },
  kitchen: { email: 'joko@brewbites.id', pin: '1234' },
};

const API_BASE = 'http://localhost:3001';

/** Per-role auth cache to avoid repeated API calls */
const roleAuthCache: Record<string, Awaited<ReturnType<typeof loginViaApi>>> = {};

/**
 * Logs in via the backend API and returns auth data.
 * Retries once on failure. Falls back to mock token if backend is not available.
 */
async function loginViaApi(role: keyof typeof SEED_CREDENTIALS = 'owner') {
  const creds = SEED_CREDENTIALS[role];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const context = await playwrightRequest.newContext({ baseURL: API_BASE });
      const response = await context.post('/api/v1/auth/login', {
        data: { email: creds.email, pin: creds.pin },
      });

      if (response.ok()) {
        const data = await response.json();
        await context.dispose();
        return {
          token: data.accessToken as string,
          user: {
            id: data.employeeId as string,
            name: data.employeeName as string,
            email: creds.email,
            role: data.role as string,
            businessId: data.businessId as string,
            outletId: data.outletId as string,
            employeeId: data.employeeId as string,
            outletName: 'Outlet Pusat',
          },
        };
      }
      await context.dispose();
    } catch {
      // Retry after a short delay
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  // Fallback: mock token for when backend is not running
  return createMockAuth(role);
}

/**
 * Creates mock auth data (used when backend is not available).
 */
function createMockAuth(role: string) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: `emp-${role}`,
      role,
      businessId: 'biz-1',
      outletId: 'outlet-1',
      exp: 4102444800,
    }),
  );
  const token = `${header}.${payload}.mock-signature`;

  return {
    token,
    user: {
      id: `emp-${role}`,
      name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      email: `${role}@tilo.test`,
      role,
      businessId: 'biz-1',
      outletId: 'outlet-1',
      employeeId: `emp-${role}`,
      outletName: 'Outlet Utama',
    },
  };
}

/**
 * Sets authenticated state in localStorage before navigating.
 * Uses a real API token if backend is available, otherwise falls back to mock.
 */
export async function setAuthenticatedState(page: Page): Promise<void> {
  if (!roleAuthCache['owner']) {
    roleAuthCache['owner'] = await loginViaApi('owner');
  }

  const { user, token } = roleAuthCache['owner'];

  await page.addInitScript(
    ({ user, token }: { user: Record<string, string>; token: string }) => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      localStorage.setItem('tilo_onboarding_completed', 'true');
      localStorage.setItem('selectedOutletId', user.outletId);
    },
    { user, token },
  );
}

/** Export for tests that need direct access */
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

export const mockToken = createMockAuth('owner').token;

/**
 * Sets authenticated state for a specific role.
 * Caches tokens per role to avoid repeated API calls.
 */
export async function setAuthenticatedStateForRole(
  page: Page,
  role: keyof typeof SEED_CREDENTIALS,
): Promise<void> {
  if (!roleAuthCache[role]) {
    roleAuthCache[role] = await loginViaApi(role);
  }

  const auth = roleAuthCache[role];

  await page.addInitScript(
    ({ user, token }: { user: Record<string, string>; token: string }) => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      localStorage.setItem('tilo_onboarding_completed', 'true');
      localStorage.setItem('selectedOutletId', user.outletId);
    },
    { user: auth.user, token: auth.token },
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
