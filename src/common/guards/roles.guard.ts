import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';

// 역할 계층: 오른쪽으로 갈수록 상위 권한
const ROLE_HIERARCHY: UserRole[] = ['user', 'instructor', 'referee', 'club_owner'];

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // @Roles() 없으면 로그인만 되면 통과
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const userRoleIndex = ROLE_HIERARCHY.indexOf(user.role);
    const hasRole = requiredRoles.some(
      (role) => userRoleIndex >= ROLE_HIERARCHY.indexOf(role),
    );

    if (!hasRole) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }
    return true;
  }
}
