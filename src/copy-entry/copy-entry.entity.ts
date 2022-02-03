import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { CopyEntryDto } from './copy-entry.dto';
import { dateFormat } from '../app.utilities';

@Entity({ name: 'copy_entries' })
export class CopyEntry {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column()
  entryId: string;

  @Column()
  parentId: string;

  @Column()
  sourceSpaceId: string;

  @Column()
  sourceEnvironmentId: string;

  @Column()
  destinationSpaceId: string;

  @Column()
  destinationEnvironmentId: string;

  @Column({ type: 'timestamp', nullable: true, default: null })
  dateCopied: Date;

  @CreateDateColumn()
  createdAt: Date;

  isCopied(): boolean {
    return !!this.dateCopied;
  }

  getFormattedDateCopied() {
    return dateFormat(this.dateCopied, '%d/%m/%Y %H:%M');
  }

  getDto(): CopyEntryDto {
    return {
      entryId: this.entryId,
      source: {
        spaceId: this.sourceSpaceId,
        environmentId: this.sourceEnvironmentId,
      },
      destination: {
        spaceId: this.destinationSpaceId,
        environmentId: this.destinationEnvironmentId,
      },
    };
  }
}
