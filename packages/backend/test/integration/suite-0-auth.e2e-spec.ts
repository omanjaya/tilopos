import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getTestApp } from './helpers/test-app';
import { testContext } from './helpers/test-context';
import { loginAs, authRequest } from './helpers/auth.helper';

describe('Suite 0: Auth', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    // Don't close app here — subsequent suites reuse it.
    // App is closed in global-teardown.e2e-spec.ts
  });

  // ----------------------------------------------------------------
  // Test 0.1: Login as Owner
  // ----------------------------------------------------------------
  describe('0.1 - Login as Owner', () => {
    it('should return 200 with valid JWT and owner role', async () => {
      const auth = await loginAs('owner');

      expect(auth.accessToken).toBeDefined();
      expect(auth.accessToken.split('.')).toHaveLength(3); // valid JWT format
      expect(auth.role).toBe('owner');
      expect(auth.employeeName).toBe('Budi Santoso');
      expect(auth.businessId).toBeDefined();
      expect(auth.outletId).toBeDefined();

      // Verify stored in shared context
      expect(testContext.auth.owner).toBeDefined();
      expect(testContext.businessId).toBe(auth.businessId);
    });
  });

  // ----------------------------------------------------------------
  // Test 0.2: Login as Manager
  // ----------------------------------------------------------------
  describe('0.2 - Login as Manager', () => {
    it('should return 200 with valid JWT and manager role', async () => {
      const auth = await loginAs('manager');

      expect(auth.accessToken).toBeDefined();
      expect(auth.accessToken.split('.')).toHaveLength(3);
      expect(auth.role).toBe('manager');
      expect(auth.employeeName).toBe('Siti Rahayu');
      // Same business as owner
      expect(auth.businessId).toBe(testContext.auth.owner!.businessId);
    });
  });

  // ----------------------------------------------------------------
  // Test 0.3: Login as Cashier
  // ----------------------------------------------------------------
  describe('0.3 - Login as Cashier', () => {
    it('should return 200 with valid JWT and cashier role', async () => {
      const auth = await loginAs('cashier');

      expect(auth.accessToken).toBeDefined();
      expect(auth.accessToken.split('.')).toHaveLength(3);
      expect(auth.role).toBe('cashier');
      expect(auth.employeeName).toBe('Dewi Lestari');
      expect(auth.businessId).toBe(testContext.auth.owner!.businessId);
    });
  });

  // ----------------------------------------------------------------
  // Test 0.4: Login with wrong PIN
  // ----------------------------------------------------------------
  describe('0.4 - Login with wrong PIN', () => {
    it('should return 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'budi@brewbites.id', pin: '9999' })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
      expect(res.body).not.toHaveProperty('accessToken');
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', pin: '1234' })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });
  });

  // ----------------------------------------------------------------
  // Test 0.5: GET /auth/me with valid token
  // ----------------------------------------------------------------
  describe('0.5 - Get profile with valid token', () => {
    it('should return 200 with owner profile', async () => {
      const res = await authRequest(app, 'owner').get('/api/v1/auth/me').expect(200);

      expect(res.body.id).toBe(testContext.auth.owner!.employeeId);
      expect(res.body.email).toBe('budi@brewbites.id');
      expect(res.body.name).toBe('Budi Santoso');
      expect(res.body.role).toBe('owner');
      expect(res.body.businessId).toBe(testContext.auth.owner!.businessId);
      expect(res.body.isActive).toBe(true);
      expect(res.body).toHaveProperty('mfaEnabled');
      expect(res.body).toHaveProperty('onboardingCompleted');
      // Sensitive fields should NOT be exposed
      expect(res.body).not.toHaveProperty('pin');
      expect(res.body).not.toHaveProperty('mfaSecret');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  // ----------------------------------------------------------------
  // Bootstrap remaining roles for future suites
  // ----------------------------------------------------------------
  describe('Bootstrap remaining roles', () => {
    it('should login all remaining roles for future suites', async () => {
      const superAdminAuth = await loginAs('superAdmin');
      expect(superAdminAuth.role).toBe('super_admin');

      const supervisorAuth = await loginAs('supervisor');
      expect(supervisorAuth.role).toBe('supervisor');

      const kitchenAuth = await loginAs('kitchen');
      expect(kitchenAuth.role).toBe('kitchen');

      const inventoryAuth = await loginAs('inventory');
      expect(inventoryAuth.role).toBe('inventory');

      // All 7 roles should now be in context
      expect(testContext.auth.superAdmin).toBeDefined();
      expect(testContext.auth.owner).toBeDefined();
      expect(testContext.auth.manager).toBeDefined();
      expect(testContext.auth.supervisor).toBeDefined();
      expect(testContext.auth.cashier).toBeDefined();
      expect(testContext.auth.kitchen).toBeDefined();
      expect(testContext.auth.inventory).toBeDefined();
    });
  });
});
