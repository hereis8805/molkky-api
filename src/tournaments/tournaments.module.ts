import { Module } from '@nestjs/common';
import {
  TournamentsController,
  RankingsController,
  AdminTournamentsController,
} from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

@Module({
  controllers: [TournamentsController, RankingsController, AdminTournamentsController],
  providers: [TournamentsService],
  exports: [TournamentsService],
})
export class TournamentsModule {}
