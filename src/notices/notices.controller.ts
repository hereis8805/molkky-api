import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { NoticesService } from './notices.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { UpdateStaticContentDto } from './dto/update-static-content.dto';

// ──────────────────────────────────────────
// 공지사항 App (공개)
// ──────────────────────────────────────────
@ApiTags('Notices (App)')
@Controller('notices')
export class NoticesController {
  constructor(private noticesService: NoticesService) {}

  /** GET /notices */
  @Get()
  @Public()
  @ApiOperation({ summary: '공지사항 목록 (published, pinned 우선)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: any) {
    return this.noticesService.findAll(query);
  }

  /** GET /notices/:id */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: '공지사항 상세' })
  findOne(@Param('id') id: string) {
    return this.noticesService.findOne(id);
  }
}

// ──────────────────────────────────────────
// 소개 콘텐츠 App (공개)
// ──────────────────────────────────────────
@ApiTags('Static Contents (App)')
@Controller('contents')
export class ContentsController {
  constructor(private noticesService: NoticesService) {}

  /** GET /contents/:type */
  @Get(':type')
  @Public()
  @ApiOperation({ summary: '소개 콘텐츠 조회 (molkky | association | license)' })
  getStaticContent(@Param('type') type: 'molkky' | 'association' | 'license') {
    return this.noticesService.getStaticContent(type);
  }
}

// ──────────────────────────────────────────
// 공지사항 Admin
// ──────────────────────────────────────────
@ApiTags('Notices (Admin)')
@ApiBearerAuth()
@Public()
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@Controller('admin/notices')
export class AdminNoticesController {
  constructor(private noticesService: NoticesService) {}

  /** GET /admin/notices */
  @Get()
  @ApiOperation({ summary: '[어드민] 공지사항 목록 (전체 상태)' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'scheduled', 'ended'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: any) {
    return this.noticesService.adminFindAll(query);
  }

  /** GET /admin/notices/:id */
  @Get(':id')
  @ApiOperation({ summary: '[어드민] 공지사항 상세' })
  findOne(@Param('id') id: string) {
    return this.noticesService.adminFindOne(id);
  }

  /** POST /admin/notices */
  @Post()
  @ApiOperation({ summary: '[어드민] 공지사항 작성 (draft / published / scheduled)' })
  create(@Body() dto: CreateNoticeDto) {
    return this.noticesService.create(dto);
  }

  /** PATCH /admin/notices/:id */
  @Patch(':id')
  @ApiOperation({ summary: '[어드민] 공지사항 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateNoticeDto) {
    return this.noticesService.update(id, dto);
  }

  /** DELETE /admin/notices/:id */
  @Delete(':id')
  @ApiOperation({ summary: '[어드민] 공지사항 삭제' })
  remove(@Param('id') id: string) {
    return this.noticesService.remove(id);
  }
}

// ──────────────────────────────────────────
// 소개 콘텐츠 Admin
// ──────────────────────────────────────────
@ApiTags('Static Contents (Admin)')
@ApiBearerAuth()
@Public()
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@Controller('admin/contents')
export class AdminContentsController {
  constructor(private noticesService: NoticesService) {}

  /** PATCH /admin/contents/:type */
  @Patch(':type')
  @ApiOperation({ summary: '[어드민] 소개 콘텐츠 수정 (molkky | association | license)' })
  updateStaticContent(
    @Param('type') type: 'molkky' | 'association' | 'license',
    @Body() dto: UpdateStaticContentDto,
  ) {
    return this.noticesService.updateStaticContent(type, dto);
  }
}
