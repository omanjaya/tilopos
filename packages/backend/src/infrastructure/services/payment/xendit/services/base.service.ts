/**
 * Base Xendit Service
 *
 * Provides common HTTP client functionality and error handling
 * for all Xendit service classes
 */

import { Logger } from '@nestjs/common';
import axios, { type AxiosError } from 'axios';
import type { XenditConfig } from '../types';

export abstract class XenditBaseService {
  protected readonly logger: Logger;

  constructor(
    protected readonly config: XenditConfig,
    loggerContext: string,
  ) {
    this.logger = new Logger(loggerContext);
  }

  /**
   * HTTP POST request to Xendit API
   */
  protected async post<T>(url: string, payload: unknown): Promise<T | null> {
    try {
      const response = await axios.post<T>(url, payload, {
        auth: { username: this.config.apiKey, password: '' },
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      this.handleError('POST', url, error);
      return null;
    }
  }

  /**
   * HTTP GET request to Xendit API
   */
  protected async get<T>(url: string): Promise<T | null> {
    try {
      const response = await axios.get<T>(url, {
        auth: { username: this.config.apiKey, password: '' },
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      this.handleError('GET', url, error);
      return null;
    }
  }

  /**
   * Handle HTTP errors from Xendit API
   */
  protected handleError(operation: string, url: string, error: unknown): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string; error_code?: string }>;
      const errorMessage = axiosError.response?.data?.message || axiosError.message;
      const errorCode = axiosError.response?.data?.error_code || '';
      const status = axiosError.response?.status || '';

      this.logger.error(
        `Xendit ${operation} failed [${status}${errorCode ? ` - ${errorCode}` : ''}]: ${errorMessage}`,
        {
          url,
          status,
          errorCode,
          message: errorMessage,
        },
      );
    } else {
      this.logger.error(
        `Xendit ${operation} failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          url,
        },
      );
    }
  }

  /**
   * Build full API URL
   */
  protected buildUrl(endpoint: string): string {
    return `${this.config.baseUrl}${endpoint}`;
  }
}
