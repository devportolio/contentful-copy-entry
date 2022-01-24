import { Repository } from 'typeorm';
import { CopyEntryDto, CopyUpdateDto, SourceDto } from './copy-entry.dto';
import { CopyEntry } from './copy-entry.entity';
export declare class CopyEntryService {
    private copyEntryRepository;
    constructor(copyEntryRepository: Repository<CopyEntry>);
    performCopy(copyEntryDto: CopyEntryDto): Promise<boolean>;
    getLinkedEntryIds(fields: any): any[];
    exportEntry(entryId: any, spaceId: any, environmentId: any, managementToken: any): Promise<any[]>;
    export(sourceDto: SourceDto): Promise<string[]>;
    importContent(sourceDto: SourceDto): Promise<any>;
    getSavedEntry(entryId: string): any;
    createCopyEntry(entryId: string, parentId: string): Promise<void>;
    updateCopyEntry(where: object, copyEntry: Partial<CopyEntry>): Promise<void>;
    checkCopyUpdate(entryId: string): Promise<CopyUpdateDto>;
}
