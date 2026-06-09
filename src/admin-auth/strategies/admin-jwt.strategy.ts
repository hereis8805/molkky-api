import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SupabaseService } from '../../supabase/supabase.service';

/**
 * 어드민 전용 JWT 전략 (이름: 'jwt-admin')
 * 앱 사용자 JWT와 분리 — admin_users 테이블 검증
 * payload: { sub: adminId, role: 'admin' | 'super_admin', type: 'admin' }
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'jwt-admin') {
  constructor(
    config: ConfigService,
    private supabase: SupabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; role: string; type: string }) {
    if (payload.type !== 'admin') throw new UnauthorizedException('어드민 토큰이 아닙니다.');

    const { data: admin, error } = await this.supabase.db
      .from('admin_users')
      .select('id, email, role, status')
      .eq('id', payload.sub)
      .single();

    if (error || !admin) throw new UnauthorizedException('존재하지 않는 어드민 계정입니다.');
    if (admin.status !== 'active') throw new UnauthorizedException('비활성 어드민 계정입니다.');

    return admin; // req.user 에 주입
  }
}
