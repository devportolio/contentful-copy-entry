import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as contentfulExport from 'contentful-export';
import * as contentfulImport from 'contentful-import';
import { readFileSync } from 'fs';

import { CopyEntryDto, CopyUpdateDto, SourceDto } from './copy-entry.dto';
import { CopyEntry } from './copy-entry.entity';
import { SocketService } from '../socket/socket.service';

@Injectable()
export class CopyEntryService {
  exporting = 0;
  importing = 0;
  entryId = '';

  constructor(
    @InjectRepository(CopyEntry)
    private readonly copyEntryRepository: Repository<CopyEntry>,
    private readonly socketService: SocketService,
  ) {}

  async performCopy(copyEntryDto: CopyEntryDto) {
    this.exporting = 0;
    this.importing = 0;
    this.entryId = copyEntryDto.import.entryId;

    this.socketService.socket.emit('processing' + this.entryId, 'Processing');

    try {
      const exportedIds = await this.export(copyEntryDto.export);

      this.socketService.socket.emit('exportDone' + this.entryId);

      for (const id of exportedIds) {
        await this.importContent({ ...copyEntryDto.import, entryId: id });
      }

      this.socketService.socket.emit('importDone' + this.entryId);

      await this.updateCopyEntry(
        { parentId: copyEntryDto.import.entryId },
        { batchDone: true },
      );

      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  getLinkedEntryIds(fields) {
    const linkedEntryIds = [];
    // Navigate each key of fields and look for id
    for (const key of Object.keys(fields)) {
      let daKey;

      // Check if da key is available
      if ('da' in fields[key] && !!(daKey = fields[key].da)) {
        if (typeof daKey === 'object' && 'sys' in daKey) {
          linkedEntryIds.push(daKey.sys.id);
        }

        if (Array.isArray(daKey)) {
          daKey.forEach((item) => {
            if (typeof item === 'object' && 'sys' in item) {
              linkedEntryIds.push(item.sys.id);
            }
          });
        }
      }
    }

    return linkedEntryIds;
  }

  async exportEntry(entryId, spaceId, environmentId, managementToken) {
    // TODO: check if entry was already imported

    const result = await contentfulExport({
      spaceId,
      managementToken,
      environmentId,
      exportDir: 'exports',
      contentFile: `content-${entryId}.json`,
      contentOnly: true,
      includeDrafts: true,
      skipWebhooks: true,
      skipEditorInterfaces: true,
      useVerboseRenderer: true,
      errorLogFile: 'errors',
      queryEntries: [`sys.id[in]=${entryId}`],
    });

    this.exporting++;
    this.socketService.socket.emit('exporting' + this.entryId, {
      total: this.exporting,
      processed: this.importing,
    });

    return result.entries.length > 0
      ? this.getLinkedEntryIds(result.entries[0].fields)
      : [];
  }

  async export(sourceDto: SourceDto) {
    const { entryId, spaceId, environmentId, managementToken } = sourceDto;
    let exportedIds = [entryId];

    const runExportChildrenExport = async (linkedEntryIds) => {
      let childEntryIds = [];

      // Import each entry
      for (const id of linkedEntryIds) {
        // Export entries that were not not imported yet
        if (!exportedIds.includes(id)) {
          const ids = await this.exportEntry(
            id,
            spaceId,
            environmentId,
            managementToken,
          );

          await this.createCopyEntry(id, entryId);

          exportedIds = [...new Set([id, ...exportedIds])];
          childEntryIds = [...ids, ...childEntryIds];
        }
      }

      return childEntryIds;
    };

    // Get first level children entries
    let linkedEntryIds = await this.exportEntry(
      entryId,
      spaceId,
      environmentId,
      managementToken,
    );

    do {
      // Export each entry
      linkedEntryIds = await runExportChildrenExport(linkedEntryIds);
      // receives ids of the children of the next level parent
    } while (linkedEntryIds.length > 0);

    return exportedIds;
  }

  async importContent(sourceDto: SourceDto) {
    const { entryId, spaceId, environmentId, managementToken } = sourceDto;

    const content = this.getSavedEntry(entryId);

    await contentfulImport({
      spaceId,
      environmentId,
      managementToken,
      content,
      skipContentPublishing: true,
      skipEditorInterfaces: false,
      errorLogFile: 'errors',
    });

    this.importing++;
    this.socketService.socket.emit('importing' + this.entryId, {
      total: this.exporting,
      processed: this.importing,
    });

    await this.updateCopyEntry({ entryId }, { imported: true });
  }

  getSavedEntry(entryId: string) {
    let data: any = readFileSync(`./exports/content-${entryId}.json`, {
      encoding: 'utf8',
      flag: 'r',
    });

    // Replace manually the danish and english to sv to allow the import
    data = data.replace(/"da"/g, '"sv"').replace(/"en-US"/g, '"sv"');

    return JSON.parse(data);
  }

  async createCopyEntry(entryId: string, parentId: string) {
    const copyEntry = new CopyEntry();
    copyEntry.entryId = entryId;
    copyEntry.parentId = parentId;

    await this.copyEntryRepository.save(copyEntry);
  }

  async updateCopyEntry(where: object, copyEntry: Partial<CopyEntry>) {
    await this.copyEntryRepository.update(where, copyEntry);
  }

  async checkCopyUpdate(entryId: string): Promise<CopyUpdateDto> {
    const entries = await this.copyEntryRepository.find({
      parentId: entryId,
      batchDone: false,
    });

    const total = entries.length;
    const processed = entries.reduce((sum, entry) => sum + +entry.imported, 0);

    return { total, processed };
  }
}
