import { Module } from '@nestjs/common';
import {
  NoticesController,
  ContentsController,
  AdminNoticesController,
  AdminContentsController,
} from './notices.controller';
import { NoticesService } from './notices.service';

@Module({
  controllers: [
    NoticesController,
    ContentsController,
    AdminNoticesController,
    AdminContentsController,
  ],
  providers: [NoticesService],
  exports: [NoticesService],
})
export class NoticesModule {}
