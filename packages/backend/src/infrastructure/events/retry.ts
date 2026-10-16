import type { Logger } from '@nestjs/common';

/**
 * Runs an event handler with bounded retries (exponential backoff). Event-bus listeners are
 * fire-and-forget, so without this a transient DB error silently drops the side effect (R11).
 * The final failure is logged at error level with the event context.
 */
export async function withRetry(
  logger: Logger,
  label: string,
  fn: () => Promise<void>,
  attempts = 3,
  baseDelayMs = 200,
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await fn();
      return;
    } catch (error) {
      if (attempt === attempts) {
        logger.error(`${label} failed after ${attempts} attempts`, error);
        return;
      }
      logger.warn(`${label} failed (attempt ${attempt}/${attempts}), retrying`);
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)));
    }
  }
}
