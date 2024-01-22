import { Body, Controller, HttpException, Post } from '@nestjs/common';
import { AIExtensionService } from './aiExtension.service';

@Controller('aiExtension')
export class AIExtensionController {
  constructor(private readonly aiExtensionService: AIExtensionService) {}
  @Post('generateComment')
  async editChat(
    @Body()
    body: {
      postData: {
        postText: string;
        postAuthor: string;
        postLink: string;
      };
      commentData?: {
        commentText: string;
        commentAuthor: string;
        commentLink: string;
      };
      extensionUser?: string;
      projectName?: string;
    },
  ) {
    try {
      return this.aiExtensionService.generateComment(body);
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }
}
