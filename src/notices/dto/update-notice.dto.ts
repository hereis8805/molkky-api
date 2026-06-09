import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNoticeDto {
  @ApiPropertyOptional({ description: '제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '본문' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'scheduled', 'ended'] })
  @IsOptional()
  @IsEnum(['draft', 'published', 'scheduled', 'ended'])
  status?: 'draft' | 'published' | 'scheduled' | 'ended';

  @ApiPropertyOptional({ description: '상단 고정 여부' })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({ description: '예약 발행 일시 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
