import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../supabase/supabase.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    private supabase: SupabaseService,
    private jwt: JwtService,
  ) {}

  /**
   * 어드민 이메일/비밀번호 로그인
   */
  async login(dto: AdminLoginDto) {
    const { data: admin, error } = await this.supabase.db
      .from('admin_users')
      .select('id, email, password_hash, role, status')
      .eq('email', dto.email)
      .single();

    if (error || !admin) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    if (admin.status !== 'active') throw new UnauthorizedException('비활성 계정입니다.');

    const valid = await bcrypt.compare(dto.password, admin.password_hash);
    if (!valid) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    const token = this.issueAdminToken(admin);
    const { password_hash: _, ...adminInfo } = admin;
    return { accessToken: token, admin: adminInfo };
  }

  /**
   * 어드민 토큰 발급 — type: 'admin' 필드로 앱 토큰과 구분
   */
  issueAdminToken(admin: { id: string; role: string }) {
    return this.jwt.sign(
      { sub: admin.id, role: admin.role, type: 'admin' },
      { expiresIn: '1d' },  // 어드민은 만료 짧게
    );
  }

  /**
   * 어드민 계정 생성 (슈퍼관리자만)
   */
  async createAdmin(email: string, password: string, role: 'admin' | 'super_admin' = 'admin') {
    const { data: existing } = await this.supabase.db
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) throw new BadRequestException('이미 존재하는 이메일입니다.');

    const password_hash = await bcrypt.hash(password, 12);

    const { data, error } = await this.supabase.db
      .from('admin_users')
      .insert({ email, password_hash, role })
      .select('id, email, role, status, created_at')
      .single();

    if (error) throw new BadRequestException('계정 생성에 실패했습니다.');
    return data;
  }

  /**
   * 어드민 비밀번호 변경
   */
  async changePassword(adminId: string, currentPassword: string, newPassword: string) {
    const { data: admin } = await this.supabase.db
      .from('admin_users')
      .select('password_hash')
      .eq('id', adminId)
      .single();

    if (!admin) throw new UnauthorizedException('계정을 찾을 수 없습니다.');

    const valid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!valid) throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다.');

    const password_hash = await bcrypt.hash(newPassword, 12);
    const { error } = await this.supabase.db
      .from('admin_users')
      .update({ password_hash })
      .eq('id', adminId);

    if (error) throw new BadRequestException('비밀번호 변경에 실패했습니다.');
    return { message: '비밀번호가 변경되었습니다.' };
  }

  /**
   * 어드민 목록 조회 (슈퍼관리자)
   */
  async findAllAdmins() {
    const { data, error } = await this.supabase.db
      .from('admin_users')
      .select('id, email, role, status, created_at')
      .order('created_at', { ascending: true });

    if (error) throw new BadRequestException('어드민 목록 조회 실패');
    return data;
  }

  /**
   * 어드민 상태 변경 (슈퍼관리자)
   */
  async updateAdminStatus(adminId: string, status: 'active' | 'inactive') {
    const { error } = await this.supabase.db
      .from('admin_users')
      .update({ status })
      .eq('id', adminId);

    if (error) throw new BadRequestException('상태 변경에 실패했습니다.');
    return { message: '상태가 변경되었습니다.' };
  }
}
