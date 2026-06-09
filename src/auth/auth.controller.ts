import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { SocialLoginDto } from './dto/social-login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /auth/social-login
   * 카카오 / 구글 / 애플 소셜 로그인
   * 신규 회원이면 자동 가입 후 JWT 반환
   */
  @Public()
  @Post('social-login')
  @ApiOperation({ summary: '소셜 로그인 (카카오/구글/애플)' })
  socialLogin(@Body() dto: SocialLoginDto) {
    return this.authService.socialLogin(dto);
  }
}
