import { Injectable } from '@nestjs/common';
import { PromptTemplate } from 'langchain/prompts';
import { LLMChain } from 'langchain/chains';
import { Ollama } from 'langchain/llms/ollama';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class AIExtensionService {
  llamaUrl;
  model;

  constructor(private readonly configService: ConfigService) {
    this.llamaUrl = this.configService.get('CHATGURU_API_MODEL_URL');
    this.model = new Ollama({
      baseUrl: `${this.llamaUrl}`,
      model: 'openchat',
      temperature: 1.5,
    });
  }

  async generateComment(data: {
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
  }) {
    if (!data.commentData) {
      const prompt = PromptTemplate.fromTemplate(
        `Comment the quoted Linkedin post to drive discussion. Be supportive and brief. As part of your comment, ask a logical question to get the person you are talking to to respond. Your tone has to be professional, but a bit informal and friendly. Your response is limited to 70 words. Try to avoid phrases, vocabulary and structures typical of GPT-chat.
            POST: {post}
          `,
      );
      const chain = new LLMChain({
        llm: this.model,
        prompt,
      });
      const answer = await chain.invoke({
        post: data.postData.postText,
      });
      return answer.text;
    }
    if (data.commentData) {
      const prompt = PromptTemplate.fromTemplate(
        `Generate answer to the {comment} from the quoted Linkedin {post} or article to drive discussion.  Be supportive and brief. As part of your comment, ask a logical question to get the person you are talking to to respond. Your tone has to be professional, but a bit informal and friendly. Your response is limited to 70 words. Try to avoid phrases, vocabulary and structures typical of GPT-chat.
            POST: {post}
            COMMENT: {comment}
          `,
      );
      const chain = new LLMChain({
        llm: this.model,
        prompt,
      });
      const answer = await chain.invoke({
        post: data.postData.postText,
        comment: data.commentData.commentText,
      });
      return answer.text;
    }
  }
}
