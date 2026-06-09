import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AdminRoles } from '../common/decorators/admin-roles.decorator';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  /**
   * POST /admin/auth/login
   * 어드민 이메일/비밀번호 로그인 — 퍼블릭
   */
  @Post('login')
  @Public()
  @ApiOperation({ summary: '어드민 로그인 (이메일/비밀번호)' })
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto);
  }

  /**
   * GET /admin/auth/me
   * 내 어드민 프로필
   */
  @Get('me')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 어드민 프로필' })
  getMe(@Request() req: any) {
    const { password_hash: _, ...admin } = req.user;
    return admin;
  }

  /**
   * POST /admin/auth/change-password
   * 비밀번호 변경
   */
  @Post('change-password')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '어드민 비밀번호 변경' })
  changePassword(
    @Request() req: any,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.adminAuthService.changePassword(req.user.id, currentPassword, newPassword);
  }
}

/**
 * 어드민 계정 관리 (슈퍼관리자 전용)
 */
@ApiTags('Admin Auth')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('super_admin')
@Controller('admin/accounts')
export class AdminAccountsController {
  constructor(private adminAuthService: AdminAuthService) {}

  /** GET /admin/accounts — 어드민 목록 */
  @Get()
  @ApiOperation({ summary: '[슈퍼관리자] 어드민 계정 목록' })
  findAll() {
    return this.adminAuthService.findAllAdmins();
  }

  /** POST /admin/accounts — 어드민 계정 생성 */
  @Post()
  @ApiOperation({ summary: '[슈퍼관리자] 어드민 계정 생성' })
  createAdmin(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('role') role: 'admin' | 'super_admin',
  ) {
    return this.adminAuthService.createAdmin(email, password, role);
  }

  /** PATCH /admin/accounts/:id/status — 계정 활성/비활성 */
  @Patch(':id/status')
  @ApiOperation({ summary: '[슈퍼관리자] 어드민 계정 상태 변경' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'active' | 'inactive',
  ) {
    return this.adminAuthService.updateAdminStatus(id, status);
  }
}
