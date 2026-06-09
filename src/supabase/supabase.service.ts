import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClient;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.client = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      // service_role key: RLS 우회, 서버 전용 (절대 클라이언트에 노출 금지)
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  get db(): SupabaseClient {
    return this.client;
  }
}
