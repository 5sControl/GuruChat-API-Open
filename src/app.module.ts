import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatContextModule } from './chat-context/chat-context.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ChatContextModule,
    ConfigModule.forRoot({
      envFilePath: './src/docker-volume/.env',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
