import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 어드민 JWT 인증 가드
 * @UseGuards(AdminJwtGuard) 로 어드민 컨트롤러에 적용
 * — 전역 JwtAuthGuard 와 별도로 동작
 */
@Injectable()
export class AdminJwtGuard extends AuthGuard('jwt-admin') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
