import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { JoinClubDto } from './dto/join-club.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePollDto } from './dto/create-poll.dto';
import { CastVoteDto } from './dto/cast-vote.dto';

@Injectable()
export class ClubsService {
  constructor(private supabase: SupabaseService) {}

  // ──────────────────────────────────────────
  // 클럽 기본 CRUD
  // ──────────────────────────────────────────

  /** 클럽 목록 조회 (검색 + 지역 필터) */
  async findAll(params: { keyword?: string; region?: string; page?: number; limit?: number }) {
    const { keyword, region, page = 1, limit = 20 } = params;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase.db
      .from('clubs')
      .select(
        `id, name, region, intro, status, created_at,
         club_members(count)`,
        { count: 'exact' },
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (keyword) query = query.ilike('name', `%${keyword}%`);
    if (region && region !== '전체') query = query.eq('region', region);

    const { data, error, count } = await query;
    if (error) throw new BadRequestException('클럽 목록 조회 실패');
    return { data, total: count, page, limit };
  }

  /** 클럽 상세 조회 */
  async findOne(clubId: string) {
    const { data, error } = await this.supabase.db
      .from('clubs')
      .select(
        `id, name, region, intro, status, created_at,
         owner:owner_id (id, nickname, profile_image),
         club_members(count)`,
      )
      .eq('id', clubId)
      .single();

    if (error || !data) throw new NotFoundException('클럽을 찾을 수 없습니다.');
    return data;
  }

  /** 클럽 개설 (지도사+ 권한) */
  async createClub(ownerId: string, dto: CreateClubDto) {
    const { data, error } = await this.supabase.db
      .from('clubs')
      .insert({ owner_id: ownerId, ...dto })
      .select()
      .single();

    if (error) throw new BadRequestException('클럽 개설에 실패했습니다.');
    return data;
  }

  /** 클럽 정보 수정 (클럽장 본인만) */
  async updateClub(clubId: string, userId: string, dto: UpdateClubDto) {
    await this.assertClubOwner(clubId, userId);

    const { data, error } = await this.supabase.db
      .from('clubs')
      .update(dto)
      .eq('id', clubId)
      .select()
      .single();

    if (error) throw new BadRequestException('클럽 수정에 실패했습니다.');
    return data;
  }

  // ──────────────────────────────────────────
  // 멤버 관리
  // ──────────────────────────────────────────

  /** 클럽 가입 신청 */
  async joinClub(clubId: string, userId: string, dto: JoinClubDto) {
    // 클럽 존재 확인
    const { data: club } = await this.supabase.db
      .from('clubs')
      .select('id, status')
      .eq('id', clubId)
      .single();

    if (!club) throw new NotFoundException('클럽을 찾을 수 없습니다.');
    if (club.status !== 'active') throw new BadRequestException('활성 클럽이 아닙니다.');

    // 중복 신청 방지
    const { data: existing } = await this.supabase.db
      .from('club_members')
      .select('id, status')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      if (existing.status === 'approved') throw new BadRequestException('이미 가입된 클럽입니다.');
      if (existing.status === 'pending') throw new BadRequestException('이미 신청 중입니다.');
    }

    const { data, error } = await this.supabase.db
      .from('club_members')
      .upsert(
        { club_id: clubId, user_id: userId, message: dto.message, status: 'pending' },
        { onConflict: 'club_id,user_id' },
      )
      .select()
      .single();

    if (error) throw new BadRequestException('가입 신청에 실패했습니다.');
    return data;
  }

  /** 멤버 목록 조회 (클럽장 전용) */
  async getMembers(clubId: string, userId: string, status?: string) {
    await this.assertClubOwner(clubId, userId);

    let query = this.supabase.db
      .from('club_members')
      .select(`id, status, message, created_at, users:user_id (id, nickname, profile_image, role)`)
      .eq('club_id', clubId)
      .order('created_at', { ascending: true });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new BadRequestException('멤버 목록 조회 실패');
    return data;
  }

  /** 멤버 신청 승인/거절 (클럽장 전용) */
  async updateMemberStatus(
    clubId: string,
    memberId: string,
    userId: string,
    status: 'approved' | 'rejected',
  ) {
    await this.assertClubOwner(clubId, userId);

    const { error } = await this.supabase.db
      .from('club_members')
      .update({ status })
      .eq('id', memberId)
      .eq('club_id', clubId);

    if (error) throw new BadRequestException('멤버 상태 변경 실패');
    return { message: status === 'approved' ? '승인되었습니다.' : '거절되었습니다.' };
  }

  // ──────────────────────────────────────────
  // 게시글 (커뮤니티)
  // ──────────────────────────────────────────

  /** 게시글 목록 조회 (승인 멤버 전용) */
  async getPosts(clubId: string, userId: string, type?: string) {
    await this.assertApprovedMember(clubId, userId);

    let query = this.supabase.db
      .from('posts')
      .select(
        `id, type, title, body, created_at,
         author:author_id (id, nickname, profile_image),
         post_images (image_url, "order"),
         comments(count)`,
      )
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });

    if (type) query = query.eq('type', type);

    const { data, error } = await query;
    if (error) throw new BadRequestException('게시글 목록 조회 실패');
    return data;
  }

  /** 게시글 상세 조회 (승인 멤버 전용) */
  async getPost(clubId: string, postId: string, userId: string) {
    await this.assertApprovedMember(clubId, userId);

    const { data, error } = await this.supabase.db
      .from('posts')
      .select(
        `id, type, title, body, created_at,
         author:author_id (id, nickname, profile_image),
         post_images (image_url, "order"),
         comments (id, body, created_at, author:author_id (id, nickname, profile_image))`,
      )
      .eq('id', postId)
      .eq('club_id', clubId)
      .single();

    if (error || !data) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    return data;
  }

  /** 게시글 작성 (승인 멤버, notice 타입은 클럽장만) */
  async createPost(clubId: string, userId: string, dto: CreatePostDto) {
    await this.assertApprovedMember(clubId, userId);

    // 공지 게시글은 클럽장만
    if (dto.type === 'notice') {
      await this.assertClubOwner(clubId, userId);
    }

    const { data: post, error } = await this.supabase.db
      .from('posts')
      .insert({
        club_id: clubId,
        author_id: userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
      })
      .select()
      .single();

    if (error) throw new BadRequestException('게시글 작성에 실패했습니다.');

    // 이미지 삽입
    if (dto.imageUrls && dto.imageUrls.length > 0) {
      const images = dto.imageUrls.slice(0, 5).map((url, idx) => ({
        post_id: post.id,
        image_url: url,
        order: idx,
      }));
      await this.supabase.db.from('post_images').insert(images);
    }

    return post;
  }

  /** 게시글 삭제 (작성자 본인만) */
  async deletePost(clubId: string, postId: string, userId: string) {
    const { data: post } = await this.supabase.db
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .eq('club_id', clubId)
      .single();

    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (post.author_id !== userId) throw new ForbiddenException('삭제 권한이 없습니다.');

    const { error } = await this.supabase.db.from('posts').delete().eq('id', postId);
    if (error) throw new BadRequestException('게시글 삭제에 실패했습니다.');
    return { message: '삭제되었습니다.' };
  }

  // ──────────────────────────────────────────
  // 댓글
  // ──────────────────────────────────────────

  /** 댓글 작성 */
  async createComment(clubId: string, postId: string, userId: string, dto: CreateCommentDto) {
    await this.assertApprovedMember(clubId, userId);

    const { data, error } = await this.supabase.db
      .from('comments')
      .insert({ post_id: postId, author_id: userId, body: dto.body })
      .select()
      .single();

    if (error) throw new BadRequestException('댓글 작성에 실패했습니다.');
    return data;
  }

  /** 댓글 삭제 (본인만) */
  async deleteComment(commentId: string, userId: string) {
    const { data: comment } = await this.supabase.db
      .from('comments')
      .select('author_id')
      .eq('id', commentId)
      .single();

    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.author_id !== userId) throw new ForbiddenException('삭제 권한이 없습니다.');

    const { error } = await this.supabase.db.from('comments').delete().eq('id', commentId);
    if (error) throw new BadRequestException('댓글 삭제에 실패했습니다.');
    return { message: '삭제되었습니다.' };
  }

  // ──────────────────────────────────────────
  // 투표
  // ──────────────────────────────────────────

  /** 투표 목록 조회 (승인 멤버) */
  async getPolls(clubId: string, userId: string) {
    await this.assertApprovedMember(clubId, userId);

    const { data, error } = await this.supabase.db
      .from('polls')
      .select(
        `id, title, description, category, multi_select, ends_at, created_at,
         author:author_id (id, nickname),
         poll_options (id, label, "order",
           poll_votes(count))`,
      )
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException('투표 목록 조회 실패');
    return data;
  }

  /** 투표 생성 (승인 멤버) */
  async createPoll(clubId: string, userId: string, dto: CreatePollDto) {
    await this.assertApprovedMember(clubId, userId);

    const { data: poll, error } = await this.supabase.db
      .from('polls')
      .insert({
        club_id: clubId,
        author_id: userId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        multi_select: dto.multiSelect,
        ends_at: dto.endsAt,
      })
      .select()
      .single();

    if (error) throw new BadRequestException('투표 생성에 실패했습니다.');

    // 선택지 삽입
    const options = dto.options.map((label, idx) => ({
      poll_id: poll.id,
      label,
      order: idx,
    }));
    await this.supabase.db.from('poll_options').insert(options);

    return poll;
  }

  /** 투표 참여 */
  async castVote(clubId: string, pollId: string, userId: string, dto: CastVoteDto) {
    await this.assertApprovedMember(clubId, userId);

    // 투표 설정 확인
    const { data: poll } = await this.supabase.db
      .from('polls')
      .select('multi_select, ends_at')
      .eq('id', pollId)
      .eq('club_id', clubId)
      .single();

    if (!poll) throw new NotFoundException('투표를 찾을 수 없습니다.');
    if (poll.ends_at && new Date(poll.ends_at) < new Date()) {
      throw new BadRequestException('마감된 투표입니다.');
    }
    if (!poll.multi_select && dto.optionIds.length > 1) {
      throw new BadRequestException('단일 선택 투표입니다.');
    }

    // 기존 투표 삭제 후 재투표 허용
    await this.supabase.db
      .from('poll_votes')
      .delete()
      .eq('poll_id', pollId)
      .eq('user_id', userId);

    const votes = dto.optionIds.map((optionId) => ({
      poll_id: pollId,
      option_id: optionId,
      user_id: userId,
    }));

    const { error } = await this.supabase.db.from('poll_votes').insert(votes);
    if (error) throw new BadRequestException('투표에 실패했습니다.');
    return { message: '투표가 완료되었습니다.' };
  }

  // ──────────────────────────────────────────
  // Admin APIs
  // ──────────────────────────────────────────

  /** [어드민] 클럽 목록 */
  async adminFindAll(params: { keyword?: string; status?: string; page?: number; limit?: number }) {
    const { keyword, status, page = 1, limit = 20 } = params;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase.db
      .from('clubs')
      .select(
        `id, name, region, status, created_at,
         owner:owner_id (id, nickname),
         club_members(count)`,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (keyword) query = query.ilike('name', `%${keyword}%`);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw new BadRequestException('클럽 목록 조회 실패');
    return { data, total: count, page, limit };
  }

  /** [어드민] 클럽 상태 변경 */
  async adminUpdateStatus(clubId: string, status: 'active' | 'inactive') {
    const { error } = await this.supabase.db
      .from('clubs')
      .update({ status })
      .eq('id', clubId);

    if (error) throw new BadRequestException('클럽 상태 변경 실패');
    return { message: '상태가 변경되었습니다.' };
  }

  // ──────────────────────────────────────────
  // 공통 헬퍼
  // ──────────────────────────────────────────

  /** 클럽장 여부 확인 */
  private async assertClubOwner(clubId: string, userId: string) {
    const { data } = await this.supabase.db
      .from('clubs')
      .select('owner_id')
      .eq('id', clubId)
      .single();

    if (!data) throw new NotFoundException('클럽을 찾을 수 없습니다.');
    if (data.owner_id !== userId) throw new ForbiddenException('클럽장만 가능합니다.');
  }

  /** 승인된 멤버 또는 클럽장 여부 확인 */
  async assertApprovedMember(clubId: string, userId: string) {
    // 클럽장이면 통과
    const { data: club } = await this.supabase.db
      .from('clubs')
      .select('owner_id')
      .eq('id', clubId)
      .single();

    if (!club) throw new NotFoundException('클럽을 찾을 수 없습니다.');
    if (club.owner_id === userId) return;

    // 승인된 멤버 확인
    const { data: member } = await this.supabase.db
      .from('club_members')
      .select('status')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .single();

    if (!member || member.status !== 'approved') {
      throw new ForbiddenException('클럽 승인 멤버만 접근 가능합니다.');
    }
  }
}
