import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePollDto {
  @ApiProperty({ description: '투표 제목' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: '투표 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['schedule', 'location', 'rule', 'general'], description: '카테고리' })
  @IsEnum(['schedule', 'location', 'rule', 'general'])
  category: 'schedule' | 'location' | 'rule' | 'general';

  @ApiProperty({ description: '복수선택 허용 여부', default: false })
  @IsBoolean()
  multiSelect: boolean;

  @ApiProperty({ description: '선택지 레이블 목록 (2~6개)', type: [String] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  options: string[];

  @ApiPropertyOptional({ description: '투표 마감 일시 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
