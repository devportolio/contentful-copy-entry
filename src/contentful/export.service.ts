import { forwardRef, Inject, Injectable } from '@nestjs/common';
import * as contentfulExport from 'contentful-export';
import { QueueService } from 'src/queue/queue.service';

import { CopyEntryDto } from '../copy-entry/copy-entry.dto';
import { CopyEntryService } from '../copy-entry/copy-entry.service';
import { EventType } from '../copy-entry/copy-entry.enum';

@Injectable()
export class ExportService {
  constructor(
    @Inject(forwardRef(() => CopyEntryService))
    private copyEntryService: CopyEntryService,
    @Inject(forwardRef(() => QueueService))
    private queueService: QueueService,
  ) {}

  async run(copyEntryDto: CopyEntryDto) {
    const entryId = copyEntryDto.entryId;
    const { spaceId, environmentId } = copyEntryDto.source;
    let exportedIds = [copyEntryDto.entryId];

    const runExportChildrenExport = async (linkedEntryIds) => {
      let childEntryIds = [];

      // Import each entry
      for (const id of linkedEntryIds) {
        // Export entries that were not not imported yet
        if (!exportedIds.includes(id)) {
          const ids = await this.exportEntry(id, spaceId, environmentId);

          const isCreated = await this.copyEntryService.create(
            { ...copyEntryDto, entryId: id },
            entryId, // set parentId
          );

          // Trigger only if a new entry was created.
          if (isCreated) {
            await this.queueService.incrementTotalByParentId(entryId);
            await this.copyEntryService.broadcastQueue(EventType.EXPORTING);

            // merge and remove duplicates
            exportedIds = [...new Set([id, ...exportedIds])];
          }

          // merge and remove duplicates
          childEntryIds = [...new Set([...ids, ...childEntryIds])];
        }
      }

      return childEntryIds;
    };

    // Get first level children entries
    let linkedEntryIds = await this.exportEntry(
      entryId,
      spaceId,
      environmentId,
    );

    await this.queueService.incrementTotalByParentId(entryId);

    do {
      // Export each entry
      // receives ids of the children of the next level parent
      linkedEntryIds = await runExportChildrenExport(linkedEntryIds);
    } while (linkedEntryIds.length > 0);

    return exportedIds;
  }

  private async exportEntry(entryId, spaceId, environmentId) {
    const copyEntry = await this.copyEntryService.getByEntryId(entryId);

    // Skip if the entry was already copied
    if (copyEntry && copyEntry.isCopied()) {
      return [];
    }

    const result = await contentfulExport({
      spaceId,
      managementToken: process.env.MANAGEMENT_TOKEN,
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

    return result.entries.length > 0
      ? this.getLinkedEntryIds(result.entries[0].fields)
      : [];
  }

  private getLinkedEntryIds(fields) {
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
}
