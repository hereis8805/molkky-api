import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStaticContentDto {
  @ApiProperty({ description: '본문 (HTML)' })
  @IsString()
  @IsNotEmpty()
  body: string;
}
