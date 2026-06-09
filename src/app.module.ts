import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClubsModule } from './clubs/clubs.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { NoticesModule } from './notices/notices.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { UploadModule } from './upload/upload.module';
import { FirebaseModule } from './firebase/firebase.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    // 환경변수 전역 로드
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    AdminAuthModule,
    UsersModule,
    ClubsModule,
    TournamentsModule,
    NoticesModule,
    UploadModule,
    FirebaseModule,
    NotificationsModule,
  ],
  providers: [
    // JWT 인증을 전역 Guard로 적용 (@Public() 데코레이터로 해제 가능)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // 역할 기반 접근 제어를 전역 Guard로 적용
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
