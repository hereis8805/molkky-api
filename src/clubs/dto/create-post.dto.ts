import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ enum: ['notice', 'free', 'photo'], description: '게시글 타입' })
  @IsEnum(['notice', 'free', 'photo'])
  type: 'notice' | 'free' | 'photo';

  @ApiPropertyOptional({ description: '제목 (선택)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ description: '본문' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ description: '이미지 URL 목록 (최대 5개)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}
