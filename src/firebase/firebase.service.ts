import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase 환경변수 미설정 — FCM 비활성화');
      return;
    }

    // 앱이 이미 초기화되어 있으면 재사용
    if (admin.apps.length > 0) {
      this.app = admin.apps[0]!;
      return;
    }

    this.app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        // 환경변수에서 \n 이스케이프 처리
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });

    this.logger.log('Firebase Admin SDK 초기화 완료');
  }

  /** 단일 디바이스에 푸시 발송 */
  async sendToToken(token: string, payload: FcmPayload): Promise<boolean> {
    if (!this.app) return false;
    try {
      await admin.messaging(this.app).send({
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
        apns: { payload: { aps: { sound: 'default' } } },
        android: { notification: { sound: 'default' } },
      });
      return true;
    } catch (err: any) {
      // 유효하지 않은 토큰은 조용히 실패
      this.logger.warn(`FCM 발송 실패 (token: ${token.slice(0, 20)}...): ${err.message}`);
      return false;
    }
  }

  /** 여러 디바이스에 푸시 발송 (최대 500개) */
  async sendToMultiple(tokens: string[], payload: FcmPayload): Promise<number> {
    if (!this.app || tokens.length === 0) return 0;
    try {
      const response = await admin.messaging(this.app).sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
        apns: { payload: { aps: { sound: 'default' } } },
        android: { notification: { sound: 'default' } },
      });
      return response.successCount;
    } catch (err: any) {
      this.logger.error(`FCM 멀티캐스트 실패: ${err.message}`);
      return 0;
    }
  }
}
