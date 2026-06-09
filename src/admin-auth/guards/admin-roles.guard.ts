import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_ROLES_KEY, AdminRole } from '../../common/decorators/admin-roles.decorator';

/**
 * 어드민 역할 가드
 * @AdminRoles('super_admin') 으로 슈퍼어드민 전용 엔드포인트 제한
 * — @AdminRoles 없으면 모든 어드민 역할 허용
 */
@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(ADMIN_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // @AdminRoles 데코레이터 없으면 어드민 로그인만 확인
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('슈퍼관리자 권한이 필요합니다.');
    }
    return true;
  }
}
