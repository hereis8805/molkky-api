import { Module } from '@nestjs/common';
import { AdminAuthController, AdminAccountsController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AuthModule } from '../auth/auth.module'; // JwtModule 재사용

@Module({
  imports: [AuthModule], // JwtService 공유
  controllers: [AdminAuthController, AdminAccountsController],
  providers: [AdminAuthService, AdminJwtStrategy, AdminJwtGuard, AdminRolesGuard],
  exports: [AdminAuthService, AdminJwtGuard, AdminRolesGuard],
})
export class AdminAuthModule {}
