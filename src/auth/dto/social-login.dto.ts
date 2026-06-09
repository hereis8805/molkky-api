import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SocialLoginDto {
  @ApiProperty({ enum: ['kakao', 'google', 'apple'] })
  @IsEnum(['kakao', 'google', 'apple'])
  provider: 'kakao' | 'google' | 'apple';

  @ApiProperty({ description: '소셜 SDK에서 받은 액세스 토큰' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  profileImage?: string;
}
