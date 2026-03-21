import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { getTestApp } from './test-app';
import { testContext, saveContext, RoleAuth } from './test-context';

/** Seed credentials — all employees have PIN '1234' */
const TEST_CREDENTIALS = {
  superAdmin: { email: 'superadmin@tilopos.id', pin: '1234' },
  owner: { email: 'budi@brewbites.id', pin: '1234' },
  manager: { email: 'siti@brewbites.id', pin: '1234' },
  supervisor: { email: 'agus@brewbites.id', pin: '1234' },
  cashier: { email: 'dewi@brewbites.id', pin: '1234' },
  kitchen: { email: 'joko@brewbites.id', pin: '1234' },
  inventory: { email: 'hendra@brewbites.id', pin: '1234' },
} as const;

export type RoleKey = keyof typeof TEST_CREDENTIALS;

/**
 * Logs in as the specified role, stores the result in testContext,
 * and returns the auth data.
 */
export async function loginAs(role: RoleKey): Promise<RoleAuth> {
  const app = await getTestApp();
  const creds = TEST_CREDENTIALS[role];

  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: creds.email, pin: creds.pin })
    .expect(200);

  const auth: RoleAuth = {
    accessToken: res.body.accessToken,
    employeeId: res.body.employeeId,
    employeeName: res.body.employeeName,
    role: res.body.role,
    businessId: res.body.businessId,
    outletId: res.body.outletId,
  };

  // Store in shared context
  testContext.auth[role] = auth;

  // Store primary business/outlet on first login
  if (!testContext.businessId) {
    testContext.businessId = auth.businessId;
  }
  if (!testContext.outletId && auth.outletId) {
    testContext.outletId = auth.outletId;
  }

  // Persist to disk for cross-file sharing
  saveContext();

  return auth;
}

/**
 * Returns a supertest request builder with Bearer token pre-set
 * for the given role. The role must have been logged in first via loginAs().
 */
export function authRequest(app: INestApplication, role: RoleKey) {
  const auth = testContext.auth[role];
  if (!auth) {
    throw new Error(`No auth token for role "${role}". Call loginAs("${role}") first.`);
  }

  return {
    get: (url: string) =>
      request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${auth.accessToken}`),
    post: (url: string) =>
      request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${auth.accessToken}`),
    put: (url: string) =>
      request(app.getHttpServer()).put(url).set('Authorization', `Bearer ${auth.accessToken}`),
    patch: (url: string) =>
      request(app.getHttpServer()).patch(url).set('Authorization', `Bearer ${auth.accessToken}`),
    delete: (url: string) =>
      request(app.getHttpServer()).delete(url).set('Authorization', `Bearer ${auth.accessToken}`),
  };
}
