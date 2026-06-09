import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { FirebaseService, FcmPayload } from '../firebase/firebase.service';

@Injectable()
export class NotificationsService {
  constructor(
    private supabase: SupabaseService,
    private firebase: FirebaseService,
  ) {}

  // ────────────────────────────────────────────────────
  // FCM 토큰 관리
  // ────────────────────────────────────────────────────

  /** FCM 토큰 등록/업데이트 */
  async registerToken(userId: string, token: string) {
    await this.supabase.db
      .from('users')
      .update({ fcm_token: token })
      .eq('id', userId);
  }

  /** FCM 토큰 해제 (로그아웃 시) */
  async unregisterToken(userId: string) {
    await this.supabase.db
      .from('users')
      .update({ fcm_token: null })
      .eq('id', userId);
  }

  // ────────────────────────────────────────────────────
  // 알림 발송
  // ────────────────────────────────────────────────────

  /**
   * 특정 유저 1명에게 푸시 발송 + 로그 저장
   */
  async sendToUser(userId: string, payload: FcmPayload) {
    const { data: user } = await this.supabase.db
      .from('users')
      .select('fcm_token')
      .eq('id', userId)
      .single();

    if (user?.fcm_token) {
      await this.firebase.sendToToken(user.fcm_token, payload);
    }

    // push_logs에 기록
    await this.supabase.db.from('push_logs').insert({
      user_id: userId,
      title: payload.title,
      body: payload.body,
    });
  }

  /**
   * 여러 유저에게 푸시 발송 + 로그 저장
   */
  async sendToUsers(userIds: string[], payload: FcmPayload) {
    const { data: users } = await this.supabase.db
      .from('users')
      .select('id, fcm_token')
      .in('id', userIds)
      .not('fcm_token', 'is', null);

    const tokens = (users ?? []).map((u) => u.fcm_token as string);
    if (tokens.length > 0) {
      await this.firebase.sendToMultiple(tokens, payload);
    }

    // 로그 일괄 저장
    const logs = userIds.map((user_id) => ({
      user_id,
      title: payload.title,
      body: payload.body,
    }));
    await this.supabase.db.from('push_logs').insert(logs);
  }

  /**
   * 전체 유저에게 브로드캐스트 (500개씩 배치)
   */
  async broadcast(payload: FcmPayload) {
    const { data: users } = await this.supabase.db
      .from('users')
      .select('id, fcm_token')
      .not('fcm_token', 'is', null)
      .eq('status', 'active');

    if (!users || users.length === 0) return { sent: 0 };

    const tokens = users.map((u) => u.fcm_token as string);

    // 500개씩 배치 발송
    let totalSent = 0;
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      totalSent += await this.firebase.sendToMultiple(batch, payload);
    }

    return { sent: totalSent, total: users.length };
  }

  // ────────────────────────────────────────────────────
  // 앱 — 내 알림 목록
  // ────────────────────────────────────────────────────

  async getMyNotifications(userId: string, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count } = await this.supabase.db
      .from('push_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .range(from, to);

    return { data: data ?? [], total: count ?? 0, page, limit };
  }
}
