import { closeTestApp } from './helpers/test-app';
import { cleanupContext } from './helpers/test-context';

/**
 * Global teardown — runs last (alphabetically after all suites).
 * Closes the shared NestJS application instance and cleans up temp files.
 */
describe('Global Teardown', () => {
  afterAll(async () => {
    await closeTestApp();
    cleanupContext();
  });

  it('should close the test app', () => {
    expect(true).toBe(true);
  });
});
