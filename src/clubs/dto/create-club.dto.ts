import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClubDto {
  @ApiProperty({ description: '클럽 이름 (2~20자)', minLength: 2, maxLength: 20 })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  name: string;

  @ApiProperty({ description: '지역 (예: 서울, 경기, 부산 …)' })
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiPropertyOptional({ description: '클럽 소개 (최대 200자)', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  intro?: string;
}
