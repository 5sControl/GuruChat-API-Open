import { Body, Controller, HttpException, Post } from '@nestjs/common';
import { AIExtensionService } from './aiExtension.service';
import { AIExtensionIncomingData } from '../shared/interfaces';

@Controller('aiExtension')
export class AIExtensionController {
  constructor(private readonly aiExtensionService: AIExtensionService) {}
  @Post('generateComment')
  async generateComment(
    @Body()
    body: {
      textPost: string;
      textComment?: string;
    },
  ) {
    try {
      return await this.aiExtensionService.generateComment(body);
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }

  @Post('sendEvent')
  async sendEvent(
    @Body()
    body: {
      generated_comment: string;
      executor: string;
      projectId: string;
    } & AIExtensionIncomingData,
  ) {
    try {
      return await this.aiExtensionService.sendEvent(body);
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }
}
