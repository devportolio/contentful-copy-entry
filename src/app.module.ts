import { Module } from '@nestjs/common';
import { CopyEntryModule } from './copy-entry/copy-entry.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { SocketModule } from './socket/socket.module';
import { AppService } from './app.service';
import { TaskModule } from './task/task.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'copy-entry',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    SocketModule,
    CopyEntryModule,
    TaskModule,
  ],
  controllers: [],
  providers: [SocketModule, AppService],
  exports: [SocketModule],
})
export class AppModule {}
