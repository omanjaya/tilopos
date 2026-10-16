import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { ImageProcessorService } from '../../infrastructure/storage/image-processor.service';
import { randomUUID } from 'crypto';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly storage: StorageService,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

  /** Product/outlet images are managed by back-office roles; uploads are rate limited. */
  @Post('image')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR, EmployeeRole.INVENTORY)
  @Throttle({ medium: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  async uploadImage(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    if (!file) throw new BadRequestException('No file uploaded');

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be under 5MB');
    }

    // Validate actual file content (magic bytes)
    const magicBytes = file.buffer.slice(0, 12);
    const isJpeg = magicBytes[0] === 0xff && magicBytes[1] === 0xd8;
    const isPng =
      magicBytes[0] === 0x89 &&
      magicBytes[1] === 0x50 &&
      magicBytes[2] === 0x4e &&
      magicBytes[3] === 0x47;
    const isWebp =
      magicBytes.length >= 12 &&
      magicBytes[0] === 0x52 &&
      magicBytes[1] === 0x49 &&
      magicBytes[2] === 0x46 &&
      magicBytes[3] === 0x46 &&
      magicBytes[8] === 0x57 &&
      magicBytes[9] === 0x45 &&
      magicBytes[10] === 0x42 &&
      magicBytes[11] === 0x50;

    if (!isJpeg && !isPng && !isWebp) {
      throw new BadRequestException('Invalid image file content');
    }

    const id = randomUUID();
    // Namespaced per tenant so storage can be audited/cleaned per business.
    const base = `images/${user.businessId}/${id}`;
    const processed = await this.imageProcessor.process(file.buffer);

    const originalPath = await this.storage.upload(`${base}/original.jpg`, processed.original);
    const thumbnailPath = await this.storage.upload(`${base}/thumbnail.jpg`, processed.thumbnail);
    const mediumPath = await this.storage.upload(`${base}/medium.jpg`, processed.medium);

    const mediumUrl = this.storage.getUrl(mediumPath);
    return {
      id,
      url: mediumUrl,
      original: this.storage.getUrl(originalPath),
      thumbnail: this.storage.getUrl(thumbnailPath),
      medium: mediumUrl,
    };
  }
}
