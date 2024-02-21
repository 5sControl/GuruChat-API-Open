import { Controller, Get, HttpException, Query, Response } from "@nestjs/common";
import { EmailsParserService } from './emailsParser.service';

@Controller('emailsParser')
export class EmailsParserController {
  constructor(private readonly emailsParserService: EmailsParserService) {}

  @Get('parse')
  async getModels(
    @Query() query: { link: string },
    @Response({ passthrough: true }) res: any,
  ) {
    try {
      const file = await this.emailsParserService.parseData(query.link);
      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=emails.csv`,
      });
      return file;
    } catch (err) {
      if (err.message) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException(err, 500);
    }
  }
}
