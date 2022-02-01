import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Queue } from './queue.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Queue])],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
