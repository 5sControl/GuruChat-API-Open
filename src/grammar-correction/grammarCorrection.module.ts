import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GrammarCorrectionController } from './grammarCorrection.controller';
import { GrammarCorrectionService } from './grammarCorrection.service';

@Module({
  imports: [ConfigModule],
  controllers: [GrammarCorrectionController],
  providers: [GrammarCorrectionService],
})
export class GrammarCorrectionModule {}
