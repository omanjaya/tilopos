import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { ImageProcessorService } from '../../infrastructure/storage/image-processor.service';
import { randomUUID } from 'crypto';

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly storage: StorageService,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be under 5MB');
    }

    // Validate actual file content (magic bytes)
    const magicBytes = file.buffer.slice(0, 4);
    const isJpeg = magicBytes[0] === 0xFF && magicBytes[1] === 0xD8;
    const isPng = magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47;
    const isWebp = magicBytes[0] === 0x52 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46 && magicBytes[3] === 0x46;

    if (!isJpeg && !isPng && !isWebp) {
      throw new BadRequestException('Invalid image file content');
    }

    const id = randomUUID();
    const processed = await this.imageProcessor.process(file.buffer);

    const originalPath = await this.storage.upload(`images/${id}/original.jpg`, processed.original);
    const thumbnailPath = await this.storage.upload(`images/${id}/thumbnail.jpg`, processed.thumbnail);
    const mediumPath = await this.storage.upload(`images/${id}/medium.jpg`, processed.medium);

    return {
      id,
      original: this.storage.getUrl(originalPath),
      thumbnail: this.storage.getUrl(thumbnailPath),
      medium: this.storage.getUrl(mediumPath),
    };
  }
}
