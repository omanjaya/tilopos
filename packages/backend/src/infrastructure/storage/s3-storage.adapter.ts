import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

@Injectable()
export class S3StorageAdapter implements StorageAdapter {
  private readonly logger = new Logger(S3StorageAdapter.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET', 'tilopos-uploads');
    this.client = new S3Client({
      region: this.configService.get<string>('S3_REGION', 'ap-southeast-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('S3_SECRET_ACCESS_KEY', ''),
      },
      endpoint: this.configService.get<string>('S3_ENDPOINT'),
      forcePathStyle: !!this.configService.get<string>('S3_ENDPOINT'),
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

  async uploadStream(
    key: string,
    body: Buffer | Readable,
    contentType: string,
  ): Promise<string> {
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

    try {
      await this.client.send(command);
      this.logger.log(`File deleted from S3: ${filepath}`);
    } catch (error) {
      this.logger.warn(`Failed to delete file from S3: ${filepath}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(filepath: string): string {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    if (endpoint) {
      return `${endpoint}/${this.bucket}/${filepath}`;
    }
    const region = this.configService.get<string>('S3_REGION', 'ap-southeast-1');
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${filepath}`;
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
