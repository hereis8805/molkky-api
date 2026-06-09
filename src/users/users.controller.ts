import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RequestCredentialDto } from './dto/request-credential.dto';
import { RejectCredentialDto } from './dto/reject-credential.dto';

// ──────────────────────────────────────────
// App — 로그인한 사용자 본인 관련
// ──────────────────────────────────────────
@ApiTags('Users (App)')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  /** GET /users/me — 내 프로필 */
  @Get('me')
  @ApiOperation({ summary: '내 프로필 조회' })
  getMe(@Request() req: any) {
    return this.usersService.getMe(req.user.id);
  }

  /** PATCH /users/me — 프로필 수정 */
  @Patch('me')
  @ApiOperation({ summary: '프로필 수정 (닉네임, 이미지, FCM 토큰)' })
  updateMe(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe(req.user.id, dto);
  }

  /** GET /users/me/clubs — 내 가입 클럽 */
  @Get('me/clubs')
  @ApiOperation({ summary: '내 가입 클럽 목록' })
  getMyClubs(@Request() req: any) {
    return this.usersService.getMyClubs(req.user.id);
  }

  /** GET /users/me/tournaments — 내 대회 이력 */
  @Get('me/tournaments')
  @ApiOperation({ summary: '내 대회 참가 이력' })
  getMyTournaments(@Request() req: any) {
    return this.usersService.getMyTournaments(req.user.id);
  }

  /** POST /users/me/credentials — 지도사/심판 자격증 신청 */
  @Post('me/credentials')
  @ApiOperation({ summary: '지도사·심판 자격증 신청' })
  requestCredential(@Request() req: any, @Body() dto: RequestCredentialDto) {
    return this.usersService.requestCredential(req.user.id, dto);
  }

  /** DELETE /users/me — 회원 탈퇴 */
  @Delete('me')
  @ApiOperation({ summary: '회원 탈퇴 (soft delete)' })
  deleteMe(@Request() req: any) {
    return this.usersService.deleteMe(req.user.id);
  }
}

// ──────────────────────────────────────────
// Admin — 관리자 전용
// ──────────────────────────────────────────
@ApiTags('Users (Admin)')
@ApiBearerAuth()
@Public()                                       // 전역 유저 JWT 가드 스킵
@UseGuards(AdminJwtGuard, AdminRolesGuard)      // 어드민 JWT 가드 적용
@Controller('admin/users')
export class AdminUsersController {
  constructor(private usersService: UsersService) {}

  /** GET /admin/users — 회원 목록 */
  @Get()
  @ApiOperation({ summary: '[어드민] 회원 목록 조회' })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'role', required: false, enum: ['user', 'instructor', 'referee', 'club_owner'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'suspended', 'deleted'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: any) {
    return this.usersService.findAll(query);
  }

  /** GET /admin/users/credentials — 자격증 신청 목록 */
  @Get('credentials')
  @ApiOperation({ summary: '[어드민] 자격증 신청 목록' })
  @ApiQuery({ name: 'type', required: true, enum: ['instructor', 'referee'] })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  getCredentials(@Query('type') type: 'instructor' | 'referee', @Query('status') status?: string) {
    return this.usersService.getCredentials(type, status);
  }

  /** GET /admin/users/:id — 회원 상세 */
  @Get(':id')
  @ApiOperation({ summary: '[어드민] 회원 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /** PATCH /admin/users/:id/status — 상태 변경 */
  @Patch(':id/status')
  @ApiOperation({ summary: '[어드민] 회원 상태 변경 (정지/복구)' })
  updateStatus(@Param('id') id: string, @Body('status') status: 'active' | 'suspended') {
    return this.usersService.updateStatus(id, status);
  }

  /** PATCH /admin/users/credentials/:id/approve — 자격증 승인 */
  @Patch('credentials/:id/approve')
  @ApiOperation({ summary: '[어드민] 자격증 신청 승인' })
  approveCredential(@Param('id') id: string) {
    return this.usersService.approveCredential(id);
  }

  /** PATCH /admin/users/credentials/:id/reject — 자격증 거절 */
  @Patch('credentials/:id/reject')
  @ApiOperation({ summary: '[어드민] 자격증 신청 거절' })
  rejectCredential(@Param('id') id: string, @Body() dto: RejectCredentialDto) {
    return this.usersService.rejectCredential(id, dto.reason);
  }
}
