import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueModule } from '../queue/queue.module';
import { CopyEntryModule } from '../copy-entry/copy-entry.module';

@Module({
  imports: [ScheduleModule.forRoot(), QueueModule, CopyEntryModule],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
