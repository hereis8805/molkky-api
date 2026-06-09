import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { SubmitResultsDto } from './dto/submit-results.dto';

@Injectable()
export class TournamentsService {
  constructor(private supabase: SupabaseService) {}

  // ──────────────────────────────────────────
  // 대회 기본 CRUD
  // ──────────────────────────────────────────

  /** 대회 목록 조회 (공개) */
  async findAll(params: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase.db
      .from('tournaments')
      .select(
        `id, name, location, held_at, intro, status, created_at,
         host:host_id (id, nickname),
         tournament_entries(count)`,
        { count: 'exact' },
      )
      .order('held_at', { ascending: true })
      .range(from, to);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw new BadRequestException('대회 목록 조회 실패');
    return { data, total: count, page, limit };
  }

  /** 대회 상세 조회 (공개) */
  async findOne(tournamentId: string) {
    const { data, error } = await this.supabase.db
      .from('tournaments')
      .select(
        `id, name, location, held_at, intro, status, created_at,
         host:host_id (id, nickname, profile_image),
         tournament_entries(count)`,
      )
      .eq('id', tournamentId)
      .single();

    if (error || !data) throw new NotFoundException('대회를 찾을 수 없습니다.');
    return data;
  }

  /** 대회 개설 (심판+) */
  async createTournament(hostId: string, dto: CreateTournamentDto) {
    const { data, error } = await this.supabase.db
      .from('tournaments')
      .insert({
        host_id: hostId,
        name: dto.name,
        location: dto.location,
        held_at: dto.heldAt,
        intro: dto.intro,
      })
      .select()
      .single();

    if (error) throw new BadRequestException('대회 개설에 실패했습니다.');
    return data;
  }

  /** 대회 정보 수정 (주최자 본인) */
  async updateTournament(tournamentId: string, userId: string, dto: UpdateTournamentDto) {
    await this.assertHost(tournamentId, userId);

    const updates: Record<string, any> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.location !== undefined) updates.location = dto.location;
    if (dto.heldAt !== undefined) updates.held_at = dto.heldAt;
    if (dto.intro !== undefined) updates.intro = dto.intro;
    if (dto.status !== undefined) updates.status = dto.status;

    const { data, error } = await this.supabase.db
      .from('tournaments')
      .update(updates)
      .eq('id', tournamentId)
      .select()
      .single();

    if (error) throw new BadRequestException('대회 수정에 실패했습니다.');
    return data;
  }

  // ──────────────────────────────────────────
  // 참가 신청
  // ──────────────────────────────────────────

  /** 대회 참가 신청 (로그인 회원) */
  async enterTournament(tournamentId: string, userId: string) {
    const { data: tournament } = await this.supabase.db
      .from('tournaments')
      .select('status')
      .eq('id', tournamentId)
      .single();

    if (!tournament) throw new NotFoundException('대회를 찾을 수 없습니다.');
    if (tournament.status !== 'upcoming') {
      throw new BadRequestException('신청 가능한 대회가 아닙니다.');
    }

    const { data, error } = await this.supabase.db
      .from('tournament_entries')
      .insert({ tournament_id: tournamentId, user_id: userId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new BadRequestException('이미 신청된 대회입니다.');
      throw new BadRequestException('참가 신청에 실패했습니다.');
    }
    return data;
  }

  /** 대회 참가 취소 */
  async cancelEntry(tournamentId: string, userId: string) {
    const { data: tournament } = await this.supabase.db
      .from('tournaments')
      .select('status')
      .eq('id', tournamentId)
      .single();

    if (!tournament) throw new NotFoundException('대회를 찾을 수 없습니다.');
    if (tournament.status !== 'upcoming') {
      throw new BadRequestException('취소 가능한 상태가 아닙니다.');
    }

    const { error } = await this.supabase.db
      .from('tournament_entries')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('user_id', userId);

    if (error) throw new BadRequestException('참가 취소에 실패했습니다.');
    return { message: '참가 취소되었습니다.' };
  }

  /** 참가자 목록 조회 (공개) */
  async getEntries(tournamentId: string) {
    const { data, error } = await this.supabase.db
      .from('tournament_entries')
      .select('id, created_at, users:user_id (id, nickname, profile_image)')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    if (error) throw new BadRequestException('참가자 목록 조회 실패');
    return data;
  }

  // ──────────────────────────────────────────
  // 경기 결과
  // ──────────────────────────────────────────

  /** 경기 결과 목록 (공개) */
  async getResults(tournamentId: string) {
    const { data, error } = await this.supabase.db
      .from('tournament_results')
      .select('id, score, rank, users:user_id (id, nickname, profile_image)')
      .eq('tournament_id', tournamentId)
      .order('rank', { ascending: true });

    if (error) throw new BadRequestException('경기 결과 조회 실패');
    return data;
  }

  /** 경기 결과 입력 (주최자 심판) */
  async submitResults(tournamentId: string, userId: string, dto: SubmitResultsDto) {
    await this.assertHost(tournamentId, userId);

    // upsert 방식 — 재입력도 허용
    const rows = dto.results.map((r) => ({
      tournament_id: tournamentId,
      user_id: r.userId,
      score: r.score,
      rank: r.rank,
    }));

    const { error } = await this.supabase.db
      .from('tournament_results')
      .upsert(rows, { onConflict: 'tournament_id,user_id' });

    if (error) throw new BadRequestException('결과 입력에 실패했습니다.');

    // 랭킹 테이블 업데이트 (선수 랭킹: 점수 누적)
    await this.updatePlayerRankings(dto.results.map((r) => ({ userId: r.userId, score: r.score })));

    return { message: '결과가 저장되었습니다.' };
  }

  /** 선수 랭킹 점수 누적 업데이트 */
  private async updatePlayerRankings(results: { userId: string; score: number }[]) {
    for (const { userId, score } of results) {
      // 기존 랭킹 조회
      const { data: existing } = await this.supabase.db
        .from('rankings')
        .select('score')
        .eq('type', 'player')
        .eq('ref_id', userId)
        .single();

      const newScore = (existing?.score ?? 0) + score;

      await this.supabase.db
        .from('rankings')
        .upsert(
          { type: 'player', ref_id: userId, score: newScore, updated_at: new Date().toISOString() },
          { onConflict: 'type,ref_id' },
        );
    }
  }

  // ──────────────────────────────────────────
  // 랭킹
  // ──────────────────────────────────────────

  /** 선수 랭킹 조회 */
  async getPlayerRankings(params: { page?: number; limit?: number }) {
    const { page = 1, limit = 50 } = params;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await this.supabase.db
      .from('rankings')
      .select(
        `id, score, updated_at,
         users:ref_id (id, nickname, profile_image)`,
        { count: 'exact' },
      )
      .eq('type', 'player')
      .order('score', { ascending: false })
      .range(from, to);

    if (error) throw new BadRequestException('선수 랭킹 조회 실패');
    return { data, total: count, page, limit };
  }

  /** 클럽 랭킹 조회 */
  async getClubRankings(params: { page?: number; limit?: number }) {
    const { page = 1, limit = 50 } = params;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await this.supabase.db
      .from('rankings')
      .select(
        `id, score, updated_at,
         clubs:ref_id (id, name, region)`,
        { count: 'exact' },
      )
      .eq('type', 'club')
      .order('score', { ascending: false })
      .range(from, to);

    if (error) throw new BadRequestException('클럽 랭킹 조회 실패');
    return { data, total: count, page, limit };
  }

  // ──────────────────────────────────────────
  // Admin APIs
  // ──────────────────────────────────────────

  /** [어드민] 대회 목록 */
  async adminFindAll(params: { keyword?: string; status?: string; page?: number; limit?: number }) {
    const { keyword, status, page = 1, limit = 20 } = params;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase.db
      .from('tournaments')
      .select(
        `id, name, location, held_at, status, created_at,
         host:host_id (id, nickname),
         tournament_entries(count)`,
        { count: 'exact' },
      )
      .order('held_at', { ascending: false })
      .range(from, to);

    if (keyword) query = query.ilike('name', `%${keyword}%`);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw new BadRequestException('대회 목록 조회 실패');
    return { data, total: count, page, limit };
  }

  /** [어드민] 대회 상태 변경 */
  async adminUpdateStatus(
    tournamentId: string,
    status: 'upcoming' | 'ongoing' | 'completed',
  ) {
    const { error } = await this.supabase.db
      .from('tournaments')
      .update({ status })
      .eq('id', tournamentId);

    if (error) throw new BadRequestException('대회 상태 변경 실패');
    return { message: '상태가 변경되었습니다.' };
  }

  // ──────────────────────────────────────────
  // 헬퍼
  // ──────────────────────────────────────────

  private async assertHost(tournamentId: string, userId: string) {
    const { data } = await this.supabase.db
      .from('tournaments')
      .select('host_id')
      .eq('id', tournamentId)
      .single();

    if (!data) throw new NotFoundException('대회를 찾을 수 없습니다.');
    if (data.host_id !== userId) throw new ForbiddenException('주최자만 가능합니다.');
  }
}
