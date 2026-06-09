import { SetMetadata } from '@nestjs/common';

export type UserRole = 'user' | 'instructor' | 'referee' | 'club_owner';

export const ROLES_KEY = 'roles';

/**
 * 접근 가능한 최소 역할을 지정하는 데코레이터
 * @example @Roles('instructor')  // 지도사 이상만 접근 가능
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
