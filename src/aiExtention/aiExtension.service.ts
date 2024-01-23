import { Injectable } from '@nestjs/common';
import { PromptTemplate } from 'langchain/prompts';
import { LLMChain } from 'langchain/chains';
import { Ollama } from 'langchain/llms/ollama';
import { ConfigService } from '@nestjs/config';
import { v4 } from 'uuid';
import { Client } from '@hubspot/api-client';
import { AIExtensionIncomingData, FiveSDBBackup } from '../shared/interfaces';
import axios from 'axios';
@Injectable()
export class AIExtensionService {
  llamaUrl;
  model;
  hubspot;

  constructor(private readonly configService: ConfigService) {
    this.llamaUrl = this.configService.get('CHATGURU_API_MODEL_URL');
    this.model = new Ollama({
      baseUrl: `${this.llamaUrl}`,
      model: 'openchat',
      temperature: 1.5,
    });
    this.hubspot = new Client({
      accessToken: 'pat-eu1-f4d5a0a3-b6e8-48d7-a4f8-04dfde2496d8',
    });
  }

  async hubspotClient(data: {
    executor: string;
    post_text: string;
    comment_text?: string;
    generated_comment: string;
  }) {
    const uniqueId = v4();
    const properties = {
      firstname: uniqueId,
      generated_comment: data.generated_comment,
      executor: data.executor,
      post_text: data.post_text,
      comment_text: data.comment_text ?? '--',
    };
    const SimplePublicObjectInputForCreate = { associations: [], properties };
    try {
      await this.hubspot.crm.contacts.basicApi.create(
        SimplePublicObjectInputForCreate,
      );
      console.log('Hubspot event sent');
    } catch (e) {
      console.log(e.message);
    }
  }

  async getJwt() {
    try {
      const { data } = await axios.post(
        'https://grand-alien-apparently.ngrok-free.app/api/auth/jwt/create/',
        { username: 'admin', password: 'admin' },
      );
      return data.access;
    } catch (e) {
      return e.message;
    }
  }

  async sendToFiveSDB(data: FiveSDBBackup, token: string) {
    await axios
      .post(
        'https://grand-alien-apparently.ngrok-free.app/api/extension_linkedin/reports/',
        data,
        {
          headers: {
            Authorization: `JWT ${token}`,
          },
        },
      )
      .catch((err) => console.log(err.message));
  }

  async sendEvent(
    data: {
      executor: string;
      generated_comment: string;
      projectId: string;
    } & AIExtensionIncomingData,
  ) {
    const hubspotEventData = {
      executor: data.executor,
      post_text: data.textPost,
      comment_text: data.textComment ?? '--',
      generated_comment: data.generated_comment,
    };
    const fiveSDBEventData: FiveSDBBackup = {
      text_post: data.textPost,
      text_comment: data.textComment ?? '--',
      link_author_comment: data.linkAuthorComment,
      about_user: data.userInfo.about ?? '--',
      about_author: data.userInfo.aboutAuthor ?? '--',
      user_company: data.userInfo.company ?? '--',
      user_experience: data.userInfo.experience ?? '--',
      user_link: data.userInfo.link,
      user_name: data.userInfo.name ?? '--',
      user_position: data.userInfo.position ?? '--',
      extension_user: data.executor,
      ai_comments: data.generated_comment,
      project_id: data.projectId ?? '--',
    };
    await this.hubspotClient(hubspotEventData);
    const token = await this.getJwt();
    await this.sendToFiveSDB(fiveSDBEventData, token);
    return 'Event successfully sent';
  }

  async generateComment(data: { postText: string; commentText?: string }) {
    if (data.commentText) {
      const prompt = PromptTemplate.fromTemplate(
        `Generate answer to the {comment} from the quoted Linkedin {post} or article to drive discussion.  Be supportive and brief. Your tone has to be professional, but a bit informal and friendly. Your response is limited to 70 words. Try to avoid phrases, vocabulary and structures typical of GPT-chat.
            POST: {post}
            COMMENT: {comment}
          `,
      );
      const chain = new LLMChain({
        llm: this.model,
        prompt,
      });
      const answer = await chain.invoke({
        post: data.postText,
        comment: data.commentText,
      });
      return answer.text;
    }
    const prompt = PromptTemplate.fromTemplate(
      `Comment the quoted Linkedin post to drive discussion. Be supportive and brief. Your tone has to be professional, but a bit informal and friendly. Your response is limited to 70 words. Try to avoid phrases, vocabulary and structures typical of GPT-chat.
            POST: {post}
          `,
    );
    const chain = new LLMChain({
      llm: this.model,
      prompt,
    });
    const answer = await chain.invoke({
      post: data.postText,
    });
    return answer.text;
  }
}
