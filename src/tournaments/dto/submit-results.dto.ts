import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ResultItemDto {
  @ApiProperty({ description: '참가자 user_id' })
  @IsUUID('4')
  userId: string;

  @ApiProperty({ description: '점수' })
  @IsInt()
  @Min(0)
  score: number;

  @ApiProperty({ description: '순위' })
  @IsInt()
  @Min(1)
  rank: number;
}

export class SubmitResultsDto {
  @ApiProperty({ description: '결과 목록', type: [ResultItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ResultItemDto)
  results: ResultItemDto[];
}
