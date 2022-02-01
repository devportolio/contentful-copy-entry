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
    const queue = await this.queueService.addItem(
      new QueueDto(copyEntryDto.entryId),
    );

    await this.broadCastQueuePosition(queue);
  }

  async startCopying(copyEntryDto: CopyEntryDto) {
    const { entryId, destination } = copyEntryDto;

    this.socketService.socket.emit('processing' + entryId);

    try {
      const exportedIds = await this.exportService.run(copyEntryDto);

      this.socketService.socket.emit('exportDone' + entryId);

      for (const id of exportedIds) {
        await this.importService.run(id, destination);
      }

      this.socketService.socket.emit('importDone' + entryId);

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
    return this.copyEntryRepository.findOne({ entryId });
  }

  async markAsCopied(copyEntry: CopyEntry) {
    copyEntry.setDateCopied();
    const { id, ...data } = copyEntry;

    await this.copyEntryRepository.update({ id }, data);
  }

  async broadCastQueuePosition(queue: Queue) {
    const { parentId: entryId, id } = queue;

    // Get positions
    const position = await this.queueService.getPosition(id);

    this.socketService.socket.emit('itemQueued' + entryId, {
      position,
    });
  }

  async broadcastEachPosition() {
    // Get all queue items
    const queues = await this.queueService.getAllItems();

    for (const queue of queues) {
      await this.broadCastQueuePosition(queue);
    }
  }
}
