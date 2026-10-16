import { Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import type { StorageAdapter } from './storage.service';
import type { S3Settings } from './storage.config';

/** Constructed by StorageModule with validated settings (see storage.config.ts). */
export class S3StorageAdapter implements StorageAdapter {
  private readonly logger = new Logger(S3StorageAdapter.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly settings: S3Settings) {
    this.bucket = settings.bucket;
    this.client = new S3Client({
      region: settings.region,
      credentials: {
        accessKeyId: settings.accessKeyId,
        secretAccessKey: settings.secretAccessKey,
      },
      endpoint: settings.endpoint,
      forcePathStyle: !!settings.endpoint,
    });
  }

  async upload(filename: string, buffer: Buffer): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: filename,
      Body: buffer,
      ContentType: this.getContentType(filename),
    });

    await this.client.send(command);
    this.logger.log(`File uploaded to S3: ${filename}`);
    return filename;
  }

  async uploadStream(key: string, body: Buffer | Readable, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(command);
    this.logger.log(`File uploaded to S3: ${key}`);
    return key;
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });
    return url;
  }

  async delete(filepath: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: filepath,
    });

    // Errors propagate: callers must know when an object was not removed.
    await this.client.send(command);
    this.logger.log(`File deleted from S3: ${filepath}`);
  }

  async exists(key: string): Promise<boolean> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.client.send(command);
      return true;
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      if (status === 404 || (error as { name?: string }).name === 'NotFound') return false;
      throw error;
    }
  }

  getUrl(filepath: string): string {
    if (this.settings.endpoint) {
      return `${this.settings.endpoint}/${this.bucket}/${filepath}`;
    }
    return `https://${this.bucket}.s3.${this.settings.region}.amazonaws.com/${filepath}`;
  }

  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
