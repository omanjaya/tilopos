import { Inject, Injectable } from '@nestjs/common';

export interface StorageAdapter {
  upload(filename: string, buffer: Buffer): Promise<string>;
  delete(filepath: string): Promise<void>;
  getUrl(filepath: string): string;
}

@Injectable()
export class StorageService {
  constructor(
    @Inject('STORAGE_ADAPTER')
    private readonly adapter: StorageAdapter,
  ) {}

  async upload(filename: string, buffer: Buffer): Promise<string> {
    return this.adapter.upload(filename, buffer);
  }

  async delete(filepath: string): Promise<void> {
    return this.adapter.delete(filepath);
  }

  getUrl(filepath: string): string {
    return this.adapter.getUrl(filepath);
  }
}
