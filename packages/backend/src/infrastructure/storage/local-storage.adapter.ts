import { Injectable, Logger } from '@nestjs/common';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import type { StorageAdapter } from './storage.service';
import { AppError, ErrorCode } from '../../shared/errors/app-error';

@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly uploadDir = join(process.cwd(), 'uploads');

  async upload(filename: string, buffer: Buffer): Promise<string> {
    // Prevent path traversal
    const safePath = resolve(this.uploadDir, filename);
    if (!safePath.startsWith(resolve(this.uploadDir))) {
      throw new AppError(
        'Invalid file path: path traversal detected',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    await mkdir(dirname(safePath), { recursive: true });
    await writeFile(safePath, buffer);
    this.logger.log(`File uploaded: ${filename}`);
    return filename;
  }

  async delete(filepath: string): Promise<void> {
    // Prevent path traversal
    const safePath = resolve(this.uploadDir, filepath);
    if (!safePath.startsWith(resolve(this.uploadDir))) {
      throw new AppError(
        'Invalid file path: path traversal detected',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    try {
      await unlink(safePath);
    } catch (error) {
      this.logger.warn(`File not found for deletion: ${filepath}`);
    }
  }

  getUrl(filepath: string): string {
    return `/uploads/${filepath}`;
  }
}
