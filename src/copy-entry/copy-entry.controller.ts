import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CopyEntryDto, CopyUpdateDto } from './copy-entry.dto';
import { CopyEntryService } from './copy-entry.service';

@Controller('copy-entry')
export class CopyEntryController {
  constructor(private copyEntryService: CopyEntryService) {}

  @Post()
  async copy(@Body() copyEntryDto: CopyEntryDto): Promise<boolean> {
    // Check if there's on going copy process
    const { total } = await this.copyEntryService.checkCopyUpdate(
      copyEntryDto.import.entryId,
    );

    if (total > 0) {
      return false;
    }

    return await this.copyEntryService.performCopy(copyEntryDto);
  }

  @Get('/update/:entryId')
  async update(@Param() params): Promise<CopyUpdateDto> {
    return await this.copyEntryService.checkCopyUpdate(params.entryId);
  }
}
