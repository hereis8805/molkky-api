import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '닉네임 (최대 20자)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nickname?: string;

  @ApiPropertyOptional({ description: '프로필 이미지 URL (Cloudinary)' })
  @IsOptional()
  @IsString()
  profileImage?: string;

  @ApiPropertyOptional({ description: 'FCM 토큰 (푸시 알림용)' })
  @IsOptional()
  @IsString()
  fcmToken?: string;
}
