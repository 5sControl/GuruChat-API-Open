import { Controller, Get, HttpException, Query } from '@nestjs/common';
import { GrammarCorrectionService } from './grammarCorrection.service';

@Controller('grammarCorrection')
export class GrammarCorrectionController {
  constructor(
    private readonly grammarCorrectionService: GrammarCorrectionService,
  ) {}

  @Get('correct')
  async getModels(@Query() query: { text: string }) {
    try {
      return await this.grammarCorrectionService.correctGrammar(query.text);
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }
}
