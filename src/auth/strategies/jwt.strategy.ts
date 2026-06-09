import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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

  async validate(payload: { sub: string; role: string }) {
    // DB에서 회원 상태 실시간 확인
    const { data: user, error } = await this.supabase.db
      .from('users')
      .select('id, nickname, role, status')
      .eq('id', payload.sub)
      .single();

    if (error || !user) throw new UnauthorizedException('존재하지 않는 회원입니다.');
    if (user.status === 'suspended') throw new UnauthorizedException('정지된 계정입니다.');
    if (user.status === 'deleted') throw new UnauthorizedException('탈퇴한 계정입니다.');

    return user; // req.user 에 주입됨
  }
}
