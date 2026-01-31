import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

export interface ProcessedImage {
  original: Buffer;
  thumbnail: Buffer;
  medium: Buffer;
}

@Injectable()
export class ImageProcessorService {
  async process(buffer: Buffer): Promise<ProcessedImage> {
    // Check dimensions to prevent decompression bombs
    const metadata = await sharp(buffer).metadata();
    const maxPixels = 4096 * 4096; // 16 megapixels max
    const pixels = (metadata.width || 0) * (metadata.height || 0);
    if (pixels > maxPixels) {
      throw new BadRequestException(
        `Image too large: ${metadata.width}x${metadata.height}. Max 4096x4096 pixels.`,
      );
    }
    if ((metadata.size || 0) > 20 * 1024 * 1024) { // 20MB max
      throw new BadRequestException('Image file too large. Max 20MB.');
    }

    const thumbnail = await sharp(buffer)
      .resize(150, 150, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();

    const medium = await sharp(buffer)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    return { original: buffer, thumbnail, medium };
  }
}
