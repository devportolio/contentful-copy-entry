export class QueueDto {
  constructor(parentId: string) {
    this.parentId = parentId;
  }

  readonly parentId: string;
  public processing = false;
}
