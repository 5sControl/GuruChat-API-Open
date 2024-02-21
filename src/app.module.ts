import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatContextModule } from './chat-context/chat-context.module';
import { ConfigModule } from '@nestjs/config';
import { SummarizationModule } from './summarization/summarization.module';
import { AIExtensionModule } from './aiExtention/aiExtension.module';
import { EmailsParserModule } from './emailsParser/emailsParser.module';

@Module({
  imports: [
    ChatContextModule,
    ConfigModule.forRoot({
      envFilePath: './src/docker-volume/.env',
    }),
    SummarizationModule,
    AIExtensionModule,
    EmailsParserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
