import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QueueService } from '../queue/queue.service';
import { CopyEntryService } from '../copy-entry/copy-entry.service';

@Injectable()
export class TaskService {
  private isProcessing = false;

  constructor(
    private readonly queueService: QueueService,
    private readonly copyEntryService: CopyEntryService,
  ) {}

  @Cron('* * * * * *')
  async handleCron() {
    const queue = await this.queueService.getProcessing();

    if (!this.isProcessing && queue) {
      this.isProcessing = true;

      // Get the parent entry
      const copyEntry = await this.copyEntryService.getCopyEntry(
        queue.parentId,
      );

      if (!copyEntry) {
        this.isProcessing = false;
        return;
      }

      // run copy functionality
      const isDone = await this.copyEntryService.startCopying(
        copyEntry.getDto(),
      );

      if (isDone) {
        // Delete queue if it's done processing
        await this.queueService.removeById(queue.id);

        // Set next queue
        await this.queueService.setNextProcessing();

        // Broadcast all queue positions
        await this.copyEntryService.broadcastEachPosition();
      }

      this.isProcessing = false;
    }
  }
}
