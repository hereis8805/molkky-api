import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectCredentialDto {
  @ApiProperty({ description: '거절 사유 (필수)' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
