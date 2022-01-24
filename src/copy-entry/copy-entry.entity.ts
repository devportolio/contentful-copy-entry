import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class CopyEntry {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column()
  entryId: string;

  @Column()
  parentId: string;

  @Column({ default: false })
  imported: boolean;

  @Column({ default: false })
  batchDone: boolean;
}
