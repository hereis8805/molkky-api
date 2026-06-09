import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClubDto {
  @ApiPropertyOptional({ description: '클럽 이름 (2~20자)' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  name?: string;

  @ApiPropertyOptional({ description: '지역' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: '클럽 소개 (최대 200자)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  intro?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'], description: '클럽 상태' })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
