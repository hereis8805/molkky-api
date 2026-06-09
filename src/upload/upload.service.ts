import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export interface UploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class UploadService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: config.getOrThrow('CLOUDINARY_CLOUD_NAME'),
      api_key: config.getOrThrow('CLOUDINARY_API_KEY'),
      api_secret: config.getOrThrow('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * 이미지 파일을 Cloudinary에 업로드하고 URL을 반환합니다.
   * @param file - multer가 메모리에 저장한 파일 버퍼
   * @param folder - Cloudinary 폴더 (예: 'profiles', 'credentials', 'clubs')
   */
  async uploadImage(file: Express.Multer.File, folder = 'molkky'): Promise<UploadResult> {
    if (!file) throw new BadRequestException('파일이 없습니다.');

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('jpg, png, webp, gif 파일만 업로드 가능합니다.');
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('파일 크기는 5MB 이하여야 합니다.');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) return reject(new BadRequestException('이미지 업로드에 실패했습니다.'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );

      // Buffer → Readable stream → Cloudinary
      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  /** Cloudinary에서 이미지 삭제 */
  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
