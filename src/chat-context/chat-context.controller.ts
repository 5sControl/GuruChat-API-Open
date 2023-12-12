import {
  Body,
  Controller,
  Get,
  Header,
  HttpException,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Response,
} from '@nestjs/common';
import { ChatContextService } from './chat-context.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('aiChat')
export class ChatContextController {
  constructor(private readonly chatContextService: ChatContextService) {}

  @Get('ask?')
  askAssistant(
    @Query()
    query: {
      chatId: string;
      prompt: string;
    },
  ) {
    try {
      return this.chatContextService.askAssistant(query);
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }

  @Post('createCategory')
  async createCategory(@Query() query: { name: string; description: string }) {
    try {
      return await this.chatContextService.createCategory(query);
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }

  @Post('editCategory')
  async editCategory(
    @Query() query: { oldName: string; newName?: string; description?: string },
  ) {
    try {
      return await this.chatContextService.editCategory(query);
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }

  @Post('removeCategory')
  async removeCategory(@Query() query: { name: string }) {
    try {
      return await this.chatContextService.removeCategory(query);
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }

  @Post('removeSource')
  async removeSource(
    @Query() query: { fileName: string; categoryName: string },
  ) {
    try {
      return this.chatContextService.removeSource(
        query.fileName,
        query.categoryName,
      );
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }

  @Get('getModels')
  getModels() {
    try {
      return this.chatContextService.getModels();
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }

  @Get('getCategories')
  getCategories() {
    try {
      return this.chatContextService.getCategories();
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }

  @Post('createChat?')
  async createChat(
    @Query() query: { categoryName: string; modelName: string },
  ) {
    try {
      return await this.chatContextService.createChat(
        query.categoryName,
        query.modelName,
      );
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }

  @Post('removeChat?')
  async removeChat(@Query() query: { categoryName: string; chatId: string }) {
    try {
      return await this.chatContextService.removeChat(
        query.categoryName,
        query.chatId,
      );
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }

  @Post('editChat')
  async editChat(
    @Body()
    body: {
      categoryName: string;
      chatId: string;
      sources: string[];
      chatName: string;
      modelName: string;
    },
  ) {
    try {
      return this.chatContextService.editChat(body);
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }

  @Get('download')
  @Header('Content-Type', 'application/json')
  async downloadFile(
    @Query() query: { categoryName: string; fileName: string },
    @Response({ passthrough: true }) res: any,
  ) {
    try {
      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=${query.fileName}`,
      });
      return this.chatContextService.downloadFile(
        query.categoryName,
        query.fileName,
      );
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Query() query: { categoryName: string },
  ) {
    try {
      return this.chatContextService.uploadFile(
        query.categoryName,
        file,
        body.link,
      );
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }
}
