import { SetMetadata } from '@nestjs/common';

export const ADMIN_ROLES_KEY = 'adminRoles';
export type AdminRole = 'admin' | 'super_admin';

/** 어드민 역할 제한 데코레이터 — @AdminRoles('super_admin') */
export const AdminRoles = (...roles: AdminRole[]) => SetMetadata(ADMIN_ROLES_KEY, roles);
