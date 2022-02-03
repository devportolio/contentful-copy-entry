import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import * as contentfulImport from 'contentful-import';

import { EntryDto } from '../copy-entry/copy-entry.dto';
import { CopyEntryService } from '../copy-entry/copy-entry.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class ImportService {
  constructor(
    @Inject(forwardRef(() => CopyEntryService))
    private copyEntryService: CopyEntryService,
    @Inject(forwardRef(() => QueueService))
    private queueService: QueueService,
  ) {}

  async run(entryId: string, destination: EntryDto) {
    const content = this.getSavedEntry(entryId);

    // Check if entry was already copied.
    const copyEntry = await this.copyEntryService.getByEntryId(entryId);

    // Skip if it's already copied or not found
    if (!copyEntry || copyEntry.isCopied()) {
      return;
    }

    await contentfulImport({
      ...destination,
      content,
      managementToken: process.env.MANAGEMENT_TOKEN,
      skipContentPublishing: true,
      skipEditorInterfaces: false,
      errorLogFile: 'errors',
    });

    await this.copyEntryService.markAsCopied(entryId);
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
}
