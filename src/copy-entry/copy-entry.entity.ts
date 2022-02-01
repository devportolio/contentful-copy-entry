import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

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
}
