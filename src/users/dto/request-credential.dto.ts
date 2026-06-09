import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestCredentialDto {
  @ApiProperty({ enum: ['instructor', 'referee'], description: '자격증 종류' })
  @IsEnum(['instructor', 'referee'])
  type: 'instructor' | 'referee';

  @ApiProperty({ description: '자격증 번호' })
  @IsString()
  @IsNotEmpty()
  certNumber: string;

  @ApiProperty({ description: '자격증 이미지 URL (Cloudinary)' })
  @IsString()
  @IsNotEmpty()
  certImage: string;
}
