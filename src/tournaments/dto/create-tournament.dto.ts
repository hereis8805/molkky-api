import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTournamentDto {
  @ApiProperty({ description: '대회명 (2~20자)' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  name: string;

  @ApiProperty({ description: '장소' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ description: '대회 일시 (ISO 8601)', example: '2026-08-01T10:00:00+09:00' })
  @IsDateString()
  heldAt: string;

  @ApiPropertyOptional({ description: '대회 소개 (최대 200자)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  intro?: string;
}
