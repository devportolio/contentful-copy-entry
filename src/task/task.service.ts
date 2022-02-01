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

    return;
    if (!this.isProcessing && queue) {
      this.isProcessing = true;

      const copyEntry = await this.copyEntryService.getCopyEntry(
        queue.parentId,
      );

      if (!copyEntry) {
        // this.isProcessing = false;
        return;
      }

      const copyEntryDto = {
        entryId: copyEntry.entryId,
        source: {
          spaceId: copyEntry.sourceSpaceId,
          environmentId: copyEntry.sourceEnvironmentId,
        },
        destination: {
          spaceId: copyEntry.destinationSpaceId,
          environmentId: copyEntry.destinationEnvironmentId,
        },
      };

      // run copy functionality
      const isDone = await this.copyEntryService.startCopying(copyEntryDto);

      if (isDone) {
        // Delete queue if it's done processing
        await this.queueService.removeById(queue.id);

        // Broadcast all queue positions
        await this.copyEntryService.broadcastEachPosition();
      }

      //  this.isProcessing = false;
    }
  }
}
