/**
 * Base Xendit Service
 *
 * Common HTTP client and error handling for all Xendit service classes.
 * HTTP failures are thrown as XenditApiError (never swallowed into `null`), so
 * callers can tell a validation/auth error from a timeout whose outcome is unknown.
 */

import { Logger } from '@nestjs/common';
import axios, { type AxiosError } from 'axios';
import type { XenditConfig } from '../types';

export class XenditApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or null when no response was received. */
    public readonly status: number | null,
    public readonly errorCode: string | null,
    /**
     * True when the request may have reached Xendit but no answer arrived
     * (timeout / connection reset): the charge state is unknown and must be reconciled.
     */
    public readonly outcomeUnknown: boolean,
  ) {
    super(message);
    this.name = 'XenditApiError';
  }
}

export abstract class XenditBaseService {
  protected readonly logger: Logger;

  constructor(
    protected readonly config: XenditConfig,
    loggerContext: string,
  ) {
    this.logger = new Logger(loggerContext);
  }

  /** HTTP POST to the Xendit API. Throws XenditApiError on failure. */
  protected async post<T>(url: string, payload: unknown): Promise<T> {
    try {
      const response = await axios.post<T>(url, payload, {
        auth: { username: this.config.apiKey, password: '' },
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      throw this.toApiError('POST', url, error);
    }
  }

  /** HTTP GET to the Xendit API. Throws XenditApiError on failure. */
  protected async get<T>(url: string): Promise<T> {
    try {
      const response = await axios.get<T>(url, {
        auth: { username: this.config.apiKey, password: '' },
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      throw this.toApiError('GET', url, error);
    }
  }

  protected toApiError(operation: string, url: string, error: unknown): XenditApiError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string; error_code?: string }>;
      const status = axiosError.response?.status ?? null;
      const errorCode = axiosError.response?.data?.error_code ?? axiosError.code ?? null;
      const message = axiosError.response?.data?.message || axiosError.message;
      const outcomeUnknown = status === null || status >= 500;
      this.logger.error(
        `Xendit ${operation} ${url} failed [${status ?? 'no response'}${errorCode ? ` - ${errorCode}` : ''}]: ${message}`,
      );
      return new XenditApiError(message, status, errorCode, outcomeUnknown);
    }
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Xendit ${operation} ${url} failed: ${message}`);
    return new XenditApiError(message, null, null, true);
  }

  protected buildUrl(endpoint: string): string {
    return `${this.config.baseUrl}${endpoint}`;
  }
}
