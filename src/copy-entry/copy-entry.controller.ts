import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CopyEntryService } from './copy-entry.service';

@Controller('copy-entry')
export class CopyEntryController {
  constructor(private copyEntryService: CopyEntryService) {}

}
