import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CopyEntryDto } from './copy-entry.dto';
import { CopyEntry } from './copy-entry.entity';
import { SocketService } from '../socket/socket.service';
import { QueueService } from '../queue/queue.service';
import { ExportService } from '../contentful/export.service';
import { ImportService } from 'src/contentful/import.service';
import { QueueDto } from '../queue/queue.dto';
import { Queue } from '../queue/queue.entity';
import { EventType } from './copy-entry.enum';

@Injectable()
export class CopyEntryService {
  constructor(
    @InjectRepository(CopyEntry)
    private readonly copyEntryRepository: Repository<CopyEntry>,
    private readonly socketService: SocketService,
    private readonly queueService: QueueService,
    private readonly exportService: ExportService,
    private readonly importService: ImportService,
  ) {}

  async performCopy(copyEntryDto: CopyEntryDto) {
    const { entryId } = copyEntryDto;

    // Add item to copy entry table
    const newEntry = await this.create(
      copyEntryDto,
      entryId, // set as parentId
    );

    // Skip if entry was already copied
    if (!newEntry) {
      return;
    }

    // Add item to queue
    await this.queueService.addItem(new QueueDto(entryId));

    await this.broadcastQueuePosition(entryId);
  }

  async startCopying(copyEntryDto: CopyEntryDto) {
    const { entryId, destination } = copyEntryDto;

    this.socketService.socket.emit(EventType.PROCESSING + entryId);

    try {
      const exportedIds = await this.exportService.run(copyEntryDto);

      this.socketService.socket.emit(EventType.EXPORT_DONE + entryId);

      for (const id of exportedIds) {
        await this.importService.run(id, destination);
        await this.queueService.incrementProcessedByParentId(entryId);
        await this.broadcastQueue(EventType.IMPORTING);
      }

      this.socketService.socket.emit(EventType.IMPORT_DONE + entryId);
      await this.broadcastCopyStatus(entryId);

      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  async create(copyEntryDto: CopyEntryDto, parentId: string) {
    const { entryId, destination, source } = copyEntryDto;

    const existingCopyEntry = await this.copyEntryRepository.findOne({
      entryId,
    });

    if (existingCopyEntry) {
      return null;
    }

    const copyEntry = new CopyEntry();
    copyEntry.entryId = entryId;
    copyEntry.parentId = parentId;
    copyEntry.sourceSpaceId = source.spaceId;
    copyEntry.sourceEnvironmentId = source.environmentId;
    copyEntry.destinationSpaceId = destination.spaceId;
    copyEntry.destinationEnvironmentId = destination.environmentId;

    return await this.copyEntryRepository.save(copyEntry);
  }

  async getCopyEntry(parentId: string) {
    return await this.copyEntryRepository.findOne({
      entryId: parentId,
      parentId,
    });
  }

  async getByEntryId(entryId: string): Promise<CopyEntry> {
    return await this.copyEntryRepository.findOne({ entryId });
  }

  async markAsCopied(entryId: string) {
    await this.copyEntryRepository.update(
      { entryId },
      { dateCopied: new Date() },
    );
  }

  async broadcastQueuePosition(entryId: string) {
    const queue = await this.queueService.getByParentId(entryId);

    if (!queue) {
      return;
    }

    // Get positions
    const position = await this.queueService.getPosition(queue.id);

    this.socketService.socket.emit(EventType.ITEM_QUEUED + entryId, {
      position,
    });
  }

  async broadcastEachPosition() {
    // Get all queue items except
    const queues = await this.queueService.getAllItems();

    for (const queue of queues) {
      await this.broadcastQueuePosition(queue.parentId);
    }
  }

  async broadcastQueue(eventType: EventType) {
    const queue = await this.queueService.getProcessing();

    if (!queue) {
      return;
    }

    const { total, processed, parentId } = queue;
    this.socketService.socket.emit(eventType + parentId, { total, processed });
  }

  async broadcastCopyStatus(entryId: string) {
    const copyEntry = await this.getByEntryId(entryId);
    const data = { done: false, date: null };

    if (copyEntry) {
      data.done = copyEntry.isCopied();
      data.date = copyEntry.getFormattedDateCopied();
    }

    this.socketService.socket.emit(EventType.COPIED_STATUS + entryId, data);
  }
}
