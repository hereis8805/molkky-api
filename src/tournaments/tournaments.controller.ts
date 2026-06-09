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
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { SubmitResultsDto } from './dto/submit-results.dto';

// ──────────────────────────────────────────
// App — 대회/경기
// ──────────────────────────────────────────
@ApiTags('Tournaments (App)')
@ApiBearerAuth()
@Controller('tournaments')
export class TournamentsController {
  constructor(private tournamentsService: TournamentsService) {}

  // ── 목록/상세 (퍼블릭) ───────────────────

  /** GET /tournaments */
  @Get()
  @Public()
  @ApiOperation({ summary: '대회 목록 조회' })
  @ApiQuery({ name: 'status', required: false, enum: ['upcoming', 'ongoing', 'completed'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: any) {
    return this.tournamentsService.findAll(query);
  }

  /** GET /tournaments/:id */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: '대회 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.tournamentsService.findOne(id);
  }

  /** GET /tournaments/:id/entries */
  @Get(':id/entries')
  @Public()
  @ApiOperation({ summary: '참가자 목록 조회' })
  getEntries(@Param('id') id: string) {
    return this.tournamentsService.getEntries(id);
  }

  /** GET /tournaments/:id/results */
  @Get(':id/results')
  @Public()
  @ApiOperation({ summary: '경기 결과 조회' })
  getResults(@Param('id') id: string) {
    return this.tournamentsService.getResults(id);
  }

  // ── 대회 개설 (심판+) ────────────────────

  /** POST /tournaments */
  @Post()
  @Roles('referee')
  @ApiOperation({ summary: '대회 개설 (심판 이상)' })
  createTournament(@Request() req: any, @Body() dto: CreateTournamentDto) {
    return this.tournamentsService.createTournament(req.user.id, dto);
  }

  // ── 대회 수정 (주최자) ───────────────────

  /** PATCH /tournaments/:id */
  @Patch(':id')
  @Roles('referee')
  @ApiOperation({ summary: '대회 정보 수정 (주최자)' })
  updateTournament(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateTournamentDto,
  ) {
    return this.tournamentsService.updateTournament(id, req.user.id, dto);
  }

  // ── 참가 신청/취소 ───────────────────────

  /** POST /tournaments/:id/enter */
  @Post(':id/enter')
  @ApiOperation({ summary: '대회 참가 신청' })
  enterTournament(@Param('id') id: string, @Request() req: any) {
    return this.tournamentsService.enterTournament(id, req.user.id);
  }

  /** DELETE /tournaments/:id/enter */
  @Delete(':id/enter')
  @ApiOperation({ summary: '대회 참가 취소' })
  cancelEntry(@Param('id') id: string, @Request() req: any) {
    return this.tournamentsService.cancelEntry(id, req.user.id);
  }

  // ── 결과 입력 (주최자 심판) ──────────────

  /** POST /tournaments/:id/results */
  @Post(':id/results')
  @Roles('referee')
  @ApiOperation({ summary: '경기 결과 입력 (주최자)' })
  submitResults(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: SubmitResultsDto,
  ) {
    return this.tournamentsService.submitResults(id, req.user.id, dto);
  }
}

// ──────────────────────────────────────────
// Rankings (퍼블릭)
// ──────────────────────────────────────────
@ApiTags('Rankings (App)')
@Controller('rankings')
export class RankingsController {
  constructor(private tournamentsService: TournamentsService) {}

  /** GET /rankings/players */
  @Get('players')
  @Public()
  @ApiOperation({ summary: '선수 랭킹 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPlayerRankings(@Query() query: any) {
    return this.tournamentsService.getPlayerRankings(query);
  }

  /** GET /rankings/clubs */
  @Get('clubs')
  @Public()
  @ApiOperation({ summary: '클럽 랭킹 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getClubRankings(@Query() query: any) {
    return this.tournamentsService.getClubRankings(query);
  }
}

// ──────────────────────────────────────────
// Admin — 대회 관리
// ──────────────────────────────────────────
@ApiTags('Tournaments (Admin)')
@ApiBearerAuth()
@Public()
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@Controller('admin/tournaments')
export class AdminTournamentsController {
  constructor(private tournamentsService: TournamentsService) {}

  /** GET /admin/tournaments */
  @Get()
  @ApiOperation({ summary: '[어드민] 대회 목록' })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['upcoming', 'ongoing', 'completed'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: any) {
    return this.tournamentsService.adminFindAll(query);
  }

  /** GET /admin/tournaments/:id */
  @Get(':id')
  @ApiOperation({ summary: '[어드민] 대회 상세' })
  findOne(@Param('id') id: string) {
    return this.tournamentsService.findOne(id);
  }

  /** PATCH /admin/tournaments/:id/status */
  @Patch(':id/status')
  @ApiOperation({ summary: '[어드민] 대회 상태 변경' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'upcoming' | 'ongoing' | 'completed',
  ) {
    return this.tournamentsService.adminUpdateStatus(id, status);
  }
}
