import { Module } from '@nestjs/common';
import { CopyEntryModule } from './copy-entry/copy-entry.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocketModule } from './socket/socket.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db.sqlite',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    SocketModule,
    CopyEntryModule,
  ],
  controllers: [],
  providers: [SocketModule],
  exports: [SocketModule],
})
export class AppModule {}
