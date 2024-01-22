import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIExtensionController } from './aiExtension.controller';
import { AIExtensionService } from './aiExtension.service';

@Module({
  imports: [ConfigModule],
  controllers: [AIExtensionController],
  providers: [AIExtensionService],
})
export class AIExtensionModule {}
