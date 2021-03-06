import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as contentfulExport from 'contentful-export';
import * as contentfulImport from 'contentful-import';
import { readFileSync } from 'fs';

import { CopyEntryDto, CopyUpdateDto, SourceDto } from './copy-entry.dto';
import { CopyEntry } from './copy-entry.entity';

@Injectable()
export class CopyEntryService {
  constructor(
    @InjectRepository(CopyEntry)
    private copyEntryRepository: Repository<CopyEntry>,
  ) {}

  async performCopy(copyEntryDto: CopyEntryDto) {
    try {
      const exportedIds = await this.export(copyEntryDto.export);

      for (const id of exportedIds) {
        await this.importContent({ ...copyEntryDto.import, entryId: id });
        await this.updateCopyEntry({ entryId: id }, { imported: true });
      }

      //await Entry.update({  batchDone: true }, { where: { parentId: req.body.import.entryId } })
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
            if ('sys' in item) {
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
      queryEntries: [`sys.id[in]=${entryId}`],
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

    return await contentfulImport({
      spaceId,
      environmentId,
      managementToken,
      content,
      skipContentPublishing: true,
      skipEditorInterfaces: false,
    });
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
