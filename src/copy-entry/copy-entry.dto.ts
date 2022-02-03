export interface EntryDto {
  spaceId: string;
  environmentId: string;
}

export interface CopyEntryDto {
  entryId: string;
  source: EntryDto;
  destination: EntryDto;
}