import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailsParserController } from './emailsParser.controller';
import { EmailsParserService } from './emailsParser.service';

@Module({
  imports: [ConfigModule],
  controllers: [EmailsParserController],
  providers: [EmailsParserService],
})
export class EmailsParserModule {}
