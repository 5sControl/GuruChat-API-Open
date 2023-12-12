import { Module } from '@nestjs/common';
import { ChatContextController } from './chat-context.controller';
import { ChatContextService } from './chat-context.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [ChatContextController],
  providers: [ChatContextService],
})
export class ChatContextModule {}
