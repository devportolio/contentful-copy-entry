import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from './queue.entity';
import { Repository } from 'typeorm';
import { QueueDto } from './queue.dto';

@Injectable()
export class QueueService {
  constructor(
    @InjectRepository(Queue)
    private readonly queueRepository: Repository<Queue>,
  ) {}

  async addItem(queueDto: QueueDto): Promise<Queue> {
    const queue = await this.queueRepository.findOne({
      parentId: queueDto.parentId,
    });

    if (queue) {
      return queue;
    }

    const processingQueue = await this.getProcessing();

    if (!processingQueue) {
      // Set processing to true if nothing is processing in the queue
      queueDto.processing = true;
    }

    return await this.queueRepository.save(queueDto);
  }

  async removeById(id: string) {
    await this.queueRepository.delete({ id });
  }

  async getAllItems(): Promise<Queue[]> {
    return await this.queueRepository.find();
  }

  async getProcessing(): Promise<Queue> {
    return await this.queueRepository.findOne({ processing: true });
  }

  async getPosition(id: string) {
    const queues = await this.queueRepository.find({
      order: {
        createdAt: 'ASC',
      },
    });

    return queues.findIndex((queue) => queue.id === id) + 1;
  }
}
