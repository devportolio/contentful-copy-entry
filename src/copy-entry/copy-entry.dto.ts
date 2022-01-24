export interface SourceDto {
  entryId: string;
  spaceId: string;
  environmentId: string;
  managementToken: string;
}

export interface CopyEntryDto {
  import: SourceDto;
  export: SourceDto;
}

export interface CopyUpdateDto {
  total: number;
  processed: number;
}
