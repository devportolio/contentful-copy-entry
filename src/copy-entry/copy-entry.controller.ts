import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CopyEntryDto, CopyUpdateDto } from './copy-entry.dto';
import { CopyEntryService } from './copy-entry.service';

@Controller('copy-entry')
export class CopyEntryController {
  constructor(private copyEntryService: CopyEntryService) {}

  @Post()
  async copy(@Body() copyEntryDto: CopyEntryDto): Promise<boolean> {
    return await this.copyEntryService.performCopy(copyEntryDto);
  }

  @Get('/update/:entryId')
  async update(@Param() params): Promise<CopyUpdateDto> {
    return await this.copyEntryService.checkCopyUpdate(params.entryId);
  }
}
