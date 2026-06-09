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
import { Roles } from '../common/decorators/roles.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { JoinClubDto } from './dto/join-club.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePollDto } from './dto/create-poll.dto';
import { CastVoteDto } from './dto/cast-vote.dto';

// ──────────────────────────────────────────
// App — 클럽 공개/인증 API
// ──────────────────────────────────────────
@ApiTags('Clubs (App)')
@ApiBearerAuth()
@Controller('clubs')
export class ClubsController {
  constructor(private clubsService: ClubsService) {}

  // ── 클럽 목록/상세 (퍼블릭) ──────────────

  /** GET /clubs */
  @Get()
  @Public()
  @ApiOperation({ summary: '클럽 목록 조회 (검색·지역 필터)' })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'region', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: any) {
    return this.clubsService.findAll(query);
  }

  /** GET /clubs/:id */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: '클럽 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.clubsService.findOne(id);
  }

  // ── 클럽 개설 (지도사+) ──────────────────

  /** POST /clubs */
  @Post()
  @Roles('instructor')
  @ApiOperation({ summary: '클럽 개설 (지도사 이상)' })
  createClub(@Request() req: any, @Body() dto: CreateClubDto) {
    return this.clubsService.createClub(req.user.id, dto);
  }

  // ── 클럽 수정 (클럽장) ───────────────────

  /** PATCH /clubs/:id */
  @Patch(':id')
  @ApiOperation({ summary: '클럽 정보 수정 (클럽장)' })
  updateClub(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateClubDto) {
    return this.clubsService.updateClub(id, req.user.id, dto);
  }

  // ── 멤버 관리 ────────────────────────────

  /** POST /clubs/:id/join */
  @Post(':id/join')
  @ApiOperation({ summary: '클럽 가입 신청' })
  joinClub(@Param('id') id: string, @Request() req: any, @Body() dto: JoinClubDto) {
    return this.clubsService.joinClub(id, req.user.id, dto);
  }

  /** GET /clubs/:id/members */
  @Get(':id/members')
  @ApiOperation({ summary: '멤버 목록 조회 (클럽장)' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  getMembers(@Param('id') id: string, @Request() req: any, @Query('status') status?: string) {
    return this.clubsService.getMembers(id, req.user.id, status);
  }

  /** PATCH /clubs/:id/members/:memberId */
  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: '멤버 신청 승인/거절 (클럽장)' })
  updateMemberStatus(
    @Param('id') clubId: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
    @Body('status') status: 'approved' | 'rejected',
  ) {
    return this.clubsService.updateMemberStatus(clubId, memberId, req.user.id, status);
  }

  // ── 게시글 ───────────────────────────────

  /** GET /clubs/:id/posts */
  @Get(':id/posts')
  @ApiOperation({ summary: '게시글 목록 (승인 멤버)' })
  @ApiQuery({ name: 'type', required: false, enum: ['notice', 'free', 'photo'] })
  getPosts(@Param('id') clubId: string, @Request() req: any, @Query('type') type?: string) {
    return this.clubsService.getPosts(clubId, req.user.id, type);
  }

  /** GET /clubs/:id/posts/:postId */
  @Get(':id/posts/:postId')
  @ApiOperation({ summary: '게시글 상세 + 댓글 (승인 멤버)' })
  getPost(
    @Param('id') clubId: string,
    @Param('postId') postId: string,
    @Request() req: any,
  ) {
    return this.clubsService.getPost(clubId, postId, req.user.id);
  }

  /** POST /clubs/:id/posts */
  @Post(':id/posts')
  @ApiOperation({ summary: '게시글 작성 (승인 멤버; notice는 클럽장만)' })
  createPost(@Param('id') clubId: string, @Request() req: any, @Body() dto: CreatePostDto) {
    return this.clubsService.createPost(clubId, req.user.id, dto);
  }

  /** DELETE /clubs/:id/posts/:postId */
  @Delete(':id/posts/:postId')
  @ApiOperation({ summary: '게시글 삭제 (작성자 본인)' })
  deletePost(
    @Param('id') clubId: string,
    @Param('postId') postId: string,
    @Request() req: any,
  ) {
    return this.clubsService.deletePost(clubId, postId, req.user.id);
  }

  // ── 댓글 ────────────────────────────────

  /** POST /clubs/:id/posts/:postId/comments */
  @Post(':id/posts/:postId/comments')
  @ApiOperation({ summary: '댓글 작성 (승인 멤버)' })
  createComment(
    @Param('id') clubId: string,
    @Param('postId') postId: string,
    @Request() req: any,
    @Body() dto: CreateCommentDto,
  ) {
    return this.clubsService.createComment(clubId, postId, req.user.id, dto);
  }

  /** DELETE /clubs/:id/posts/:postId/comments/:commentId */
  @Delete(':id/posts/:postId/comments/:commentId')
  @ApiOperation({ summary: '댓글 삭제 (본인 댓글)' })
  deleteComment(@Param('commentId') commentId: string, @Request() req: any) {
    return this.clubsService.deleteComment(commentId, req.user.id);
  }

  // ── 투표 ────────────────────────────────

  /** GET /clubs/:id/polls */
  @Get(':id/polls')
  @ApiOperation({ summary: '투표 목록 (승인 멤버)' })
  getPolls(@Param('id') clubId: string, @Request() req: any) {
    return this.clubsService.getPolls(clubId, req.user.id);
  }

  /** POST /clubs/:id/polls */
  @Post(':id/polls')
  @ApiOperation({ summary: '투표 생성 (승인 멤버)' })
  createPoll(@Param('id') clubId: string, @Request() req: any, @Body() dto: CreatePollDto) {
    return this.clubsService.createPoll(clubId, req.user.id, dto);
  }

  /** POST /clubs/:id/polls/:pollId/vote */
  @Post(':id/polls/:pollId/vote')
  @ApiOperation({ summary: '투표 참여 (승인 멤버)' })
  castVote(
    @Param('id') clubId: string,
    @Param('pollId') pollId: string,
    @Request() req: any,
    @Body() dto: CastVoteDto,
  ) {
    return this.clubsService.castVote(clubId, pollId, req.user.id, dto);
  }
}

// ──────────────────────────────────────────
// Admin — 클럽 관리
// ──────────────────────────────────────────
@ApiTags('Clubs (Admin)')
@ApiBearerAuth()
@Public()
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@Controller('admin/clubs')
export class AdminClubsController {
  constructor(private clubsService: ClubsService) {}

  /** GET /admin/clubs */
  @Get()
  @ApiOperation({ summary: '[어드민] 클럽 목록' })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: any) {
    return this.clubsService.adminFindAll(query);
  }

  /** GET /admin/clubs/:id */
  @Get(':id')
  @ApiOperation({ summary: '[어드민] 클럽 상세' })
  findOne(@Param('id') id: string) {
    return this.clubsService.findOne(id);
  }

  /** PATCH /admin/clubs/:id/status */
  @Patch(':id/status')
  @ApiOperation({ summary: '[어드민] 클럽 상태 변경 (활성/비활성)' })
  updateStatus(@Param('id') id: string, @Body('status') status: 'active' | 'inactive') {
    return this.clubsService.adminUpdateStatus(id, status);
  }
}
