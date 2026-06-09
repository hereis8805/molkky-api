import { Module } from '@nestjs/common';
import { ClubsController, AdminClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';

@Module({
  controllers: [ClubsController, AdminClubsController],
  providers: [ClubsService],
  exports: [ClubsService],
})
export class ClubsModule {}
