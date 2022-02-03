import { forwardRef, Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ImportService } from './import.service';
import { CopyEntryModule } from '../copy-entry/copy-entry.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [forwardRef(() => CopyEntryModule), forwardRef(() => QueueModule)],
  providers: [ExportService, ImportService],
  exports: [ExportService, ImportService],
})
export class ContentfulModule {}
