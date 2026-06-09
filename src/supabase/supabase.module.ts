import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Global() // 전체 모듈에서 주입 가능
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
