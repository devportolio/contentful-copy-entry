import { Global, Module } from '@nestjs/common';
import { SocketService } from './socket.service';
import { SocketGateway } from './socket.gateway';
import { CopyEntryModule } from '../copy-entry/copy-entry.module';

@Global()
@Module({
  imports: [CopyEntryModule],
  providers: [SocketService, SocketGateway],
  exports: [SocketService],
})
export class SocketModule {}
