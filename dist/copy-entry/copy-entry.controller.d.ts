import { CopyEntryDto, CopyUpdateDto } from './copy-entry.dto';
import { CopyEntryService } from './copy-entry.service';
export declare class CopyEntryController {
    private copyEntryService;
    constructor(copyEntryService: CopyEntryService);
    copy(copyEntryDto: CopyEntryDto): Promise<boolean>;
    update(params: any): Promise<CopyUpdateDto>;
}
