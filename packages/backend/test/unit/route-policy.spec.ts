/**
 * Route policy (Docs/ENGINEERING-RULES.md R1 + R5).
 *
 * Authentication is global; this test keeps the security surface explicit:
 *  - every @Public() route must be listed in PUBLIC_ROUTES below;
 *  - every non-public POST/PUT/PATCH/DELETE must declare @Roles(...) or @AllowAnyRole().
 */
import 'reflect-metadata';
import { globSync } from 'glob';
import { join, relative } from 'path';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '@shared/decorators/public.decorator';
import { ANY_ROLE_KEY, ROLES_KEY } from '@infrastructure/auth/roles.decorator';

const PUBLIC_ROUTES = new Set<string>([
  // health probes
  'HealthController.check',
  'HealthController.readiness',
  'HealthController.liveness',
  // Prometheus scrape (404 unless METRICS_ENABLED; bearer METRICS_TOKEN when set)
  'MetricsController.scrape',
  // authentication entry points
  'AuthController.login',
  'AuthController.refresh',
  'AuthController.logout',
  'AuthController.register',
  'AuthController.getBusinessTypePresets',
  'AuthController.googleAuth',
  'AuthController.googleAuthCallback',
  'AuthController.googleTokenLogin',
  'AuthController.verifyEmail',
  'MfaController.verify',
  // payment provider webhooks (verified by WebhookGuard / callback token)
  'PaymentsWebhookController.midtransWebhook',
  'PaymentsWebhookController.xenditWebhook',
  'PaymentsWebhookController.xenditCallback',
  'PaymentsWebhookController.xenditInvoiceWebhook',
  'PaymentsWebhookController.xenditQrisWebhook',
  'PaymentsWebhookController.xenditVAWebhook',
  'PaymentsWebhookController.xenditEwalletWebhook',
  'PaymentsWebhookController.xenditRetailWebhook',
  'SubscriptionController.handleMidtransWebhook',
  'SubscriptionController.handleXenditWebhook',
  // customer-facing storefront
  'OnlineStoreController.getStorefront',
  'OnlineStoreController.createStoreOrder',
  'OnlineStoreController.checkStock',
  'OnlineStoreController.calculateShipping',
  'OnlineStoreController.calculateStoreShipping',
  'OnlineStoreController.getDeliveryZones',
  'OnlineStoreController.getStorefrontData',
  'OnlineStoreController.getStorefrontProduct',
  'OnlineStoreController.storefrontCheckout',
  // customer-facing self-order (table QR)
  'SelfOrderController.createSession',
  'SelfOrderController.getSession',
  'SelfOrderController.getMenu',
  'SelfOrderController.addItem',
  'SelfOrderController.submitSession',
  'SelfOrderController.getSessionTotal',
  'SelfOrderController.createPayment',
  'SelfOrderController.getPaymentStatus',
  'SelfOrderController.paymentCallback',
  'SelfOrderController.getMenuWithLanguage',
  'SelfOrderController.extendSession',
  'SelfOrderController.initiateQrisPayment',
  'SelfOrderController.paymentCallbackAlt',
  'SelfOrderController.getTranslationsEndpoint',
  // customer-facing queue position
  'WaitingListController.publicGetPosition',
]);

const MUTATING = new Set([
  RequestMethod.POST,
  RequestMethod.PUT,
  RequestMethod.PATCH,
  RequestMethod.DELETE,
]);

interface RouteInfo {
  key: string;
  file: string;
  method: RequestMethod;
  isPublic: boolean;
  hasRoles: boolean;
}

function collectRoutes(): RouteInfo[] {
  const srcDir = join(__dirname, '../../src');
  const files = globSync('**/*.controller.ts', { cwd: srcDir, absolute: true });
  const routes: RouteInfo[] = [];

  for (const file of files) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(file) as Record<string, unknown>;
    for (const exported of Object.values(mod)) {
      if (typeof exported !== 'function') continue;
      const ctrl = exported as { prototype: Record<string, unknown>; name: string };
      if (Reflect.getMetadata(PATH_METADATA, ctrl) === undefined) continue;

      for (const name of Object.getOwnPropertyNames(ctrl.prototype)) {
        if (name === 'constructor') continue;
        const handler = ctrl.prototype[name];
        if (typeof handler !== 'function') continue;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
        if (method === undefined) continue;

        const meta = (key: string) =>
          Reflect.getMetadata(key, handler) ?? Reflect.getMetadata(key, ctrl);
        const roles = meta(ROLES_KEY) as string[] | undefined;
        routes.push({
          key: `${ctrl.name}.${name}`,
          file: relative(srcDir, file),
          method,
          isPublic: meta(IS_PUBLIC_KEY) === true,
          hasRoles: (Array.isArray(roles) && roles.length > 0) || meta(ANY_ROLE_KEY) === true,
        });
      }
    }
  }
  return routes;
}

describe('Route policy', () => {
  const routes = collectRoutes();

  it('discovers controller routes', () => {
    expect(routes.length).toBeGreaterThan(400);
  });

  it('only allow-listed routes are @Public()', () => {
    const unexpected = routes
      .filter((r) => r.isPublic && !PUBLIC_ROUTES.has(r.key))
      .map((r) => `${r.key} (${r.file})`);
    expect(unexpected).toEqual([]);
  });

  it('every allow-listed public route exists and is @Public()', () => {
    const publicKeys = new Set(routes.filter((r) => r.isPublic).map((r) => r.key));
    const missing = [...PUBLIC_ROUTES].filter((k) => !publicKeys.has(k));
    expect(missing).toEqual([]);
  });

  it('every non-public mutation declares @Roles() or @AllowAnyRole()', () => {
    const offenders = routes
      .filter((r) => MUTATING.has(r.method) && !r.isPublic && !r.hasRoles)
      .map((r) => `${r.key} (${r.file})`);
    expect(offenders).toEqual([]);
  });
});
