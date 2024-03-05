import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'langchain/llms/ollama';

@Injectable()
export class GrammarCorrectionService {
  llamaUrl;
  constructor(private readonly configService: ConfigService) {
    this.llamaUrl = this.configService.get('CHATGURU_API_MODEL_URL');
  }

  async correctGrammar(text: string) {
    const model = new Ollama({
      baseUrl: `${this.llamaUrl}`,
      model: 'openchat',
      temperature: 0.3,
    });
    const answer = await model.invoke(`correct grammar in this text: ${text}`);
    return answer;
  }
}
