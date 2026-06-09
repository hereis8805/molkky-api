import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { UpdateStaticContentDto } from './dto/update-static-content.dto';

@Injectable()
export class NoticesService {
  constructor(private supabase: SupabaseService) {}

  // ──────────────────────────────────────────
  // 공지사항 — App (공개)
  // ──────────────────────────────────────────

  /** 공지사항 목록 (published 상태만, pinned 우선) */
  async findAll(params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await this.supabase.db
      .from('notices')
      .select('id, title, pinned, published_at, created_at', { count: 'exact' })
      .eq('status', 'published')
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .range(from, to);

    if (error) throw new BadRequestException('공지사항 목록 조회 실패');
    return { data, total: count, page, limit };
  }

  /** 공지사항 상세 (published 상태만) */
  async findOne(noticeId: string) {
    const { data, error } = await this.supabase.db
      .from('notices')
      .select('id, title, body, pinned, published_at, created_at')
      .eq('id', noticeId)
      .eq('status', 'published')
      .single();

    if (error || !data) throw new NotFoundException('공지사항을 찾을 수 없습니다.');
    return data;
  }

  // ──────────────────────────────────────────
  // 공지사항 — Admin
  // ──────────────────────────────────────────

  /** [어드민] 공지사항 목록 (전체 상태) */
  async adminFindAll(params: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase.db
      .from('notices')
      .select('id, title, status, pinned, published_at, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw new BadRequestException('공지사항 목록 조회 실패');
    return { data, total: count, page, limit };
  }

  /** [어드민] 공지사항 상세 */
  async adminFindOne(noticeId: string) {
    const { data, error } = await this.supabase.db
      .from('notices')
      .select('*')
      .eq('id', noticeId)
      .single();

    if (error || !data) throw new NotFoundException('공지사항을 찾을 수 없습니다.');
    return data;
  }

  /** [어드민] 공지사항 작성 */
  async create(dto: CreateNoticeDto) {
    const status = dto.status ?? 'draft';
    const publishedAt =
      status === 'published'
        ? new Date().toISOString()
        : dto.publishedAt ?? null;

    const { data, error } = await this.supabase.db
      .from('notices')
      .insert({
        title: dto.title,
        body: dto.body,
        status,
        pinned: dto.pinned ?? false,
        published_at: publishedAt,
      })
      .select()
      .single();

    if (error) throw new BadRequestException('공지사항 작성에 실패했습니다.');
    return data;
  }

  /** [어드민] 공지사항 수정 */
  async update(noticeId: string, dto: UpdateNoticeDto) {
    const updates: Record<string, any> = {};
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.body !== undefined) updates.body = dto.body;
    if (dto.pinned !== undefined) updates.pinned = dto.pinned;

    if (dto.status !== undefined) {
      updates.status = dto.status;
      if (dto.status === 'published' && !dto.publishedAt) {
        updates.published_at = new Date().toISOString();
      }
    }
    if (dto.publishedAt !== undefined) updates.published_at = dto.publishedAt;

    const { data, error } = await this.supabase.db
      .from('notices')
      .update(updates)
      .eq('id', noticeId)
      .select()
      .single();

    if (error) throw new BadRequestException('공지사항 수정에 실패했습니다.');
    return data;
  }

  /** [어드민] 공지사항 삭제 */
  async remove(noticeId: string) {
    const { error } = await this.supabase.db.from('notices').delete().eq('id', noticeId);
    if (error) throw new BadRequestException('공지사항 삭제에 실패했습니다.');
    return { message: '삭제되었습니다.' };
  }

  // ──────────────────────────────────────────
  // 소개 콘텐츠 (static_contents)
  // ──────────────────────────────────────────

  /** 소개 콘텐츠 조회 (공개) */
  async getStaticContent(type: 'molkky' | 'association' | 'license') {
    const { data, error } = await this.supabase.db
      .from('static_contents')
      .select('type, body, updated_at')
      .eq('type', type)
      .single();

    if (error || !data) throw new NotFoundException('콘텐츠를 찾을 수 없습니다.');
    return data;
  }

  /** [어드민] 소개 콘텐츠 수정 */
  async updateStaticContent(
    type: 'molkky' | 'association' | 'license',
    dto: UpdateStaticContentDto,
  ) {
    const { data, error } = await this.supabase.db
      .from('static_contents')
      .update({ body: dto.body, updated_at: new Date().toISOString() })
      .eq('type', type)
      .select()
      .single();

    if (error) throw new BadRequestException('콘텐츠 수정에 실패했습니다.');
    return data;
  }
}
