import { forwardRef, Module } from '@nestjs/common';
import { CopyEntryService } from './copy-entry.service';
import { CopyEntryController } from './copy-entry.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CopyEntry } from './copy-entry.entity';
import { QueueModule } from 'src/queue/queue.module';
import { ContentfulModule } from 'src/contentful/contentful.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CopyEntry]),
    QueueModule,
    ContentfulModule,
  ],
  controllers: [CopyEntryController],
  providers: [CopyEntryService],
  exports: [CopyEntryService],
})
export class CopyEntryModule {}
