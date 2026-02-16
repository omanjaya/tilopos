import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { AppModule } from '../../../src/app.module';
import { GlobalExceptionFilter } from '../../../src/shared/filters/global-exception.filter';

/**
 * No-op throttler storage that never records any hits.
 * This makes ThrottlerGuard always allow requests regardless of
 * endpoint-level @Throttle() decorators.
 */
class NoopThrottlerStorage {
  async increment(
    _key: string,
    _ttl: number,
    _limit: number,
    _blockDuration: number,
    _throttlerName: string,
  ) {
    return {
      totalHits: 0,
      timeToExpire: 0,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}

// Use global to share the NestJS app across test files.
// Jest isolates module scope per file, so a module-level `let app`
// would create a separate app (and Prisma pool) for each file.
declare global {
  // eslint-disable-next-line no-var
  var __TEST_APP__: INestApplication | null;
}

/**
 * Boots the full NestJS application once, reuses on subsequent calls.
 * Overrides ThrottlerStorage so tests are never rate-limited.
 */
export async function getTestApp(): Promise<INestApplication> {
  if (global.__TEST_APP__) {
    console.log('[test-app] Reusing existing app');
    return global.__TEST_APP__;
  }
  console.log('[test-app] Creating NEW app instance');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ThrottlerStorage)
    .useClass(NoopThrottlerStorage)
    .compile();

  const app = moduleFixture.createNestApplication();

  // Mirror main.ts bootstrap configuration
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.init();
  global.__TEST_APP__ = app;
  return app;
}

/**
 * Gracefully shuts down the test application.
 * Call in afterAll() of the last suite, or in each suite if running standalone.
 */
export async function closeTestApp(): Promise<void> {
  if (global.__TEST_APP__) {
    await global.__TEST_APP__.close();
    global.__TEST_APP__ = null;
  }
}
