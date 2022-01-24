import { Module } from '@nestjs/common';
import { CopyEntryService } from './copy-entry.service';
import { CopyEntryController } from './copy-entry.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CopyEntry } from './copy-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CopyEntry])],
  controllers: [CopyEntryController],
  providers: [CopyEntryService],
})
export class CopyEntryModule {}
