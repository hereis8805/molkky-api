import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTournamentDto {
  @ApiPropertyOptional({ description: '대회명 (2~20자)' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  name?: string;

  @ApiPropertyOptional({ description: '장소' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: '대회 일시 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  heldAt?: string;

  @ApiPropertyOptional({ description: '대회 소개 (최대 200자)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  intro?: string;

  @ApiPropertyOptional({ enum: ['upcoming', 'ongoing', 'completed'], description: '대회 상태' })
  @IsOptional()
  @IsEnum(['upcoming', 'ongoing', 'completed'])
  status?: 'upcoming' | 'ongoing' | 'completed';
}
