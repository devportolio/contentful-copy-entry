import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'queues' })
export class Queue {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column()
  parentId: string;

  @Column({ type: 'int', default: 0 })
  total: number;

  @Column({ type: 'int', default: 0 })
  processed: number;

  @Column({ type: 'boolean', default: false })
  processing: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
