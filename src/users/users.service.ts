import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RequestCredentialDto } from './dto/request-credential.dto';

@Injectable()
export class UsersService {
  constructor(private supabase: SupabaseService) {}

  // ──────────────────────────────────────────
  // App APIs
  // ──────────────────────────────────────────

  /** 내 프로필 조회 */
  async getMe(userId: string) {
    const { data, error } = await this.supabase.db
      .from('users')
      .select('id, nickname, profile_image, role, status, created_at')
      .eq('id', userId)
      .single();

    if (error || !data) throw new NotFoundException('회원을 찾을 수 없습니다.');
    return data;
  }

  /** 프로필 수정 (닉네임, 이미지, FCM 토큰) */
  async updateMe(userId: string, dto: UpdateProfileDto) {
    const updates: Record<string, any> = {};
    if (dto.nickname !== undefined) updates.nickname = dto.nickname;
    if (dto.profileImage !== undefined) updates.profile_image = dto.profileImage;
    if (dto.fcmToken !== undefined) updates.fcm_token = dto.fcmToken;

    const { data, error } = await this.supabase.db
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, nickname, profile_image, role')
      .single();

    if (error) throw new BadRequestException('프로필 수정에 실패했습니다.');
    return data;
  }

  /** 내 가입 클럽 목록 */
  async getMyClubs(userId: string) {
    const { data, error } = await this.supabase.db
      .from('club_members')
      .select(`
        status,
        clubs (id, name, region, status)
      `)
      .eq('user_id', userId)
      .in('status', ['pending', 'approved']);

    if (error) throw new BadRequestException('클럽 조회에 실패했습니다.');
    return data;
  }

  /** 내 대회 참가 이력 */
  async getMyTournaments(userId: string) {
    const { data, error } = await this.supabase.db
      .from('tournament_entries')
      .select(`
        created_at,
        tournaments (id, name, location, held_at, status)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException('대회 이력 조회에 실패했습니다.');
    return data;
  }

  /** 지도사/심판 자격증 신청 */
  async requestCredential(userId: string, dto: RequestCredentialDto) {
    // 동일 타입 대기 중 신청 중복 방지
    const { data: existing } = await this.supabase.db
      .from('user_credentials')
      .select('id')
      .eq('user_id', userId)
      .eq('type', dto.type)
      .eq('status', 'pending')
      .single();

    if (existing) {
      throw new BadRequestException('이미 심사 중인 신청이 있습니다.');
    }

    const { data, error } = await this.supabase.db
      .from('user_credentials')
      .insert({
        user_id: userId,
        type: dto.type,
        cert_number: dto.certNumber,
        cert_image: dto.certImage,
      })
      .select()
      .single();

    if (error) throw new BadRequestException('자격증 신청에 실패했습니다.');
    return data;
  }

  /** 회원 탈퇴 (soft delete) */
  async deleteMe(userId: string) {
    const { error } = await this.supabase.db
      .from('users')
      .update({ status: 'deleted' })
      .eq('id', userId);

    if (error) throw new BadRequestException('회원 탈퇴에 실패했습니다.');
    return { message: '탈퇴 처리되었습니다.' };
  }

  // ──────────────────────────────────────────
  // Admin APIs
  // ──────────────────────────────────────────

  /** [어드민] 회원 목록 조회 (검색 + 필터) */
  async findAll(params: {
    keyword?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { keyword, role, status, page = 1, limit = 20 } = params;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase.db
      .from('users')
      .select('id, nickname, profile_image, role, social_provider, status, created_at', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (keyword) query = query.ilike('nickname', `%${keyword}%`);
    if (role) query = query.eq('role', role);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw new BadRequestException('회원 목록 조회 실패');
    return { data, total: count, page, limit };
  }

  /** [어드민] 회원 상세 */
  async findOne(userId: string) {
    const [userRes, clubsRes, tournamentsRes] = await Promise.all([
      this.supabase.db
        .from('users')
        .select('id, nickname, profile_image, role, social_provider, status, created_at')
        .eq('id', userId)
        .single(),
      this.supabase.db
        .from('club_members')
        .select('status, clubs(id, name, region)')
        .eq('user_id', userId),
      this.supabase.db
        .from('tournament_entries')
        .select('created_at, tournaments(id, name, held_at)')
        .eq('user_id', userId),
    ]);

    if (userRes.error || !userRes.data) throw new NotFoundException('회원을 찾을 수 없습니다.');
    return {
      ...userRes.data,
      clubs: clubsRes.data ?? [],
      tournaments: tournamentsRes.data ?? [],
    };
  }

  /** [어드민] 회원 상태 변경 (정지/복구) */
  async updateStatus(userId: string, status: 'active' | 'suspended') {
    const { error } = await this.supabase.db
      .from('users')
      .update({ status })
      .eq('id', userId);

    if (error) throw new BadRequestException('상태 변경에 실패했습니다.');
    return { message: '상태가 변경되었습니다.' };
  }

  /** [어드민] 자격증 신청 목록 */
  async getCredentials(type: 'instructor' | 'referee', status?: string) {
    let query = this.supabase.db
      .from('user_credentials')
      .select(`
        id, type, cert_number, cert_image, status, reject_reason, approved_at, created_at,
        users (id, nickname, profile_image)
      `)
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new BadRequestException('신청 목록 조회 실패');
    return data;
  }

  /** [어드민] 자격증 신청 승인 */
  async approveCredential(credentialId: string) {
    // 신청 정보 조회
    const { data: cred, error: credErr } = await this.supabase.db
      .from('user_credentials')
      .select('user_id, type, status')
      .eq('id', credentialId)
      .single();

    if (credErr || !cred) throw new NotFoundException('신청 정보를 찾을 수 없습니다.');
    if (cred.status !== 'pending') throw new BadRequestException('대기 중인 신청이 아닙니다.');

    // 트랜잭션처럼 두 업데이트 수행
    const [credUpdate, userUpdate] = await Promise.all([
      this.supabase.db
        .from('user_credentials')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', credentialId),
      this.supabase.db
        .from('users')
        .update({ role: cred.type }) // 'instructor' 또는 'referee'
        .eq('id', cred.user_id),
    ]);

    if (credUpdate.error || userUpdate.error) {
      throw new BadRequestException('승인 처리에 실패했습니다.');
    }
    return { message: '승인 처리되었습니다.' };
  }

  /** [어드민] 자격증 신청 거절 */
  async rejectCredential(credentialId: string, reason: string) {
    const { data: cred } = await this.supabase.db
      .from('user_credentials')
      .select('status')
      .eq('id', credentialId)
      .single();

    if (!cred || cred.status !== 'pending') {
      throw new BadRequestException('대기 중인 신청이 아닙니다.');
    }

    const { error } = await this.supabase.db
      .from('user_credentials')
      .update({ status: 'rejected', reject_reason: reason })
      .eq('id', credentialId);

    if (error) throw new BadRequestException('거절 처리에 실패했습니다.');
    return { message: '거절 처리되었습니다.' };
  }
}
