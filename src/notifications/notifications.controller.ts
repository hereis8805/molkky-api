import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RegisterTokenDto } from './dto/register-token.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * PATCH /notifications/token
   * 앱 시작 시 또는 토큰 갱신 시 호출
   */
  @Patch('token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'FCM 토큰 등록/업데이트' })
  async registerToken(@Request() req: any, @Body() dto: RegisterTokenDto) {
    await this.notificationsService.registerToken(req.user.sub, dto.token);
  }

  /**
   * DELETE /notifications/token
   * 로그아웃 시 호출 — 토큰 해제
   */
  @Delete('token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'FCM 토큰 해제 (로그아웃)' })
  async unregisterToken(@Request() req: any) {
    await this.notificationsService.unregisterToken(req.user.sub);
  }

  /**
   * GET /notifications
   * 내 알림 목록
   */
  @Get()
  @ApiOperation({ summary: '내 알림 목록' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyNotifications(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationsService.getMyNotifications(req.user.sub, +page, +limit);
  }
}
