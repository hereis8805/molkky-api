/**
 * 초기 슈퍼어드민 계정 생성 스크립트
 *
 * 사용법:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-admin.ts
 *
 * 환경변수 (.env) 필요:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function seedAdmin() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const email = process.env.ADMIN_EMAIL || 'admin@molkky.kr';
  const password = process.env.ADMIN_PASSWORD || '1234';

  // 이미 존재하면 스킵
  const { data: existing } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    console.log(`✅ 이미 존재하는 어드민 계정: ${email}`);
    return;
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from('admin_users')
    .insert({ email, password_hash, role: 'super_admin' })
    .select('id, email, role')
    .single();

  if (error) {
    console.error('❌ 어드민 계정 생성 실패:', error.message);
    process.exit(1);
  }

  console.log('✅ 슈퍼어드민 계정 생성 완료');
  console.log(`   이메일: ${data.email}`);
  console.log(`   역할:   ${data.role}`);
  console.log(`   비밀번호: ${password}`);
  console.log('   ⚠️  배포 전 반드시 비밀번호를 변경하세요!');
}

seedAdmin();
