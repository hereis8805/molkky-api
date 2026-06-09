import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterTokenDto {
  @ApiProperty({ description: 'Firebase FCM 디바이스 토큰' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
