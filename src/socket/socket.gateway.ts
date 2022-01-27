import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CopyEntryDto } from '../copy-entry/copy-entry.dto';
import { SocketService } from './socket.service';
import { CopyEntryService } from '../copy-entry/copy-entry.service';

@WebSocketGateway({ cors: true })
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(
    private readonly copyEntryService: CopyEntryService,
    private socketService: SocketService,
  ) {}

  @SubscribeMessage('copyEntry')
  async handleCopy(client: Socket, payload: CopyEntryDto) {
    await this.copyEntryService.performCopy(payload);
  }

  afterInit(server: Server) {
    this.socketService.socket = server;
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }
}
