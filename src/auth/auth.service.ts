import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as appleSignin from 'apple-signin-auth';
import { SupabaseService } from '../supabase/supabase.service';
import { SocialLoginDto } from './dto/social-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private supabase: SupabaseService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  /**
   * 소셜 로그인 처리
   * - 앱에서 소셜 SDK로 받은 accessToken + provider를 전달
   * - 신규 회원이면 자동 가입, 기존 회원이면 로그인
   */
  async socialLogin(dto: SocialLoginDto) {
    // 소셜 provider별 사용자 정보 검증
    const socialUser = await this.verifySocialToken(dto.provider, dto.accessToken);

    // DB에서 회원 조회
    const { data: existing } = await this.supabase.db
      .from('users')
      .select('*')
      .eq('social_provider', dto.provider)
      .eq('social_id', socialUser.id)
      .single();

    let user = existing;
    let isNew = false;

    if (!user) {
      // 신규 회원 가입
      const { data: created, error } = await this.supabase.db
        .from('users')
        .insert({
          social_provider: dto.provider,
          social_id: socialUser.id,
          nickname: dto.nickname ?? socialUser.nickname ?? `user_${Date.now()}`,
          profile_image: dto.profileImage ?? socialUser.profileImage ?? null,
        })
        .select()
        .single();

      if (error) throw new UnauthorizedException('회원 가입에 실패했습니다.');
      user = created;
      isNew = true;
    }

    if (user.status === 'suspended') throw new UnauthorizedException('정지된 계정입니다.');

    const token = this.issueToken(user);
    return { accessToken: token, user, isNew };
  }

  /** JWT 발급 */
  issueToken(user: { id: string; role: string }) {
    return this.jwt.sign({ sub: user.id, role: user.role });
  }

  /**
   * 소셜 토큰 검증 (provider별 구현 필요)
   * TODO: 각 소셜 SDK 서버사이드 검증 로직 추가
   */
  private async verifySocialToken(
    provider: 'kakao' | 'google' | 'apple',
    accessToken: string,
  ): Promise<{ id: string; nickname?: string; profileImage?: string }> {
    if (provider === 'kakao') {
      // 카카오 API로 토큰 검증
      const res = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new UnauthorizedException('카카오 토큰 검증 실패');
      const data = await res.json() as any;
      return {
        id: String(data.id),
        nickname: data.kakao_account?.profile?.nickname,
        profileImage: data.kakao_account?.profile?.profile_image_url,
      };
    }

    if (provider === 'google') {
      // Google tokeninfo API로 검증
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`,
      );
      if (!res.ok) throw new UnauthorizedException('구글 토큰 검증 실패');
      const data = await res.json() as any;
      return { id: data.sub, nickname: data.name, profileImage: data.picture };
    }

    if (provider === 'apple') {
      // Apple identity token (JWT) 검증
      // Flutter에서 signInWithApple() 후 받은 identityToken을 accessToken으로 전달
      try {
        const claims = await appleSignin.verifyIdToken(accessToken, {
          audience: this.config.get<string>('APPLE_BUNDLE_ID'),
          ignoreExpiration: false,
        });
        // claims.sub: Apple 고유 사용자 ID (변경 불가)
        // claims.email: 최초 로그인 시에만 제공 (이후 null 가능)
        return { id: claims.sub };
      } catch {
        throw new UnauthorizedException('Apple 토큰 검증 실패');
      }
    }

    throw new UnauthorizedException('지원하지 않는 소셜 로그인입니다.');
  }
}
