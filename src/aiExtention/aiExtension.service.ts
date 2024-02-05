import { HttpException, Injectable } from '@nestjs/common';
import { PromptTemplate } from 'langchain/prompts';
import { LLMChain } from 'langchain/chains';
import { Ollama } from 'langchain/llms/ollama';
import { ConfigService } from '@nestjs/config';
import { Client } from '@hubspot/api-client';
import { AIExtensionIncomingData, FiveSDBBackup } from '../shared/interfaces';
import axios from 'axios';
@Injectable()
export class AIExtensionService {
  llamaUrl;
  model;
  hubspot;
  databaseUrl;
  modelsList = ['llama2:13b', 'openchat', 'mistral'];

  constructor(private readonly configService: ConfigService) {
    this.llamaUrl = this.configService.get('CHATGURU_API_MODEL_URL');
    this.model = new Ollama({
      baseUrl: `${this.llamaUrl}`,
      model: 'mistral',
      temperature: 1,
    });
    this.hubspot = new Client({
      accessToken: this.configService.get('HUBSPOT_AUTH_TOKEN'),
    });
    this.databaseUrl = this.configService.get('DATABASE_URL');
  }

  async hubspotClient(data: {
    subject: string;
    post_text: string;
    comment_text?: string;
    generated_comment: string;
    post_author: string;
    authors__company: string;
    project_name: string;
    link_to_post: string;
  }) {
    const properties = {
      hs_pipeline_stage: '1',
      ...data,
    };
    const SimplePublicObjectInputForCreate = { associations: [], properties };
    try {
      await this.hubspot.crm.tickets.basicApi.create(
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
        `${this.databaseUrl}api/auth/jwt/create/`,
        {
          username: this.configService.get('ACCESS_LOGIN'),
          password: this.configService.get('ACCESS_PASSWORD'),
        },
      );
      return data.access;
    } catch (e) {
      throw new HttpException('Invalid fields values', 422);
    }
  }

  async sendToFiveSDB(data: FiveSDBBackup, token: string) {
    return await axios
      .post(`${this.databaseUrl}api/extension_linkedin/reports/`, data, {
        headers: {
          Authorization: `JWT ${token}`,
        },
      })
      .then(() => true)
      .catch((err) => {
        console.log(err);
        throw new HttpException('Invalid fields values', 422);
      });
  }

  async sendEvent(
    data: {
      executor: string;
      generated_comment: string;
      projectId: string;
      postLink: string;
    } & AIExtensionIncomingData,
  ) {
    const hubspotEventData = {
      subject: data.executor,
      post_text: data.textPost,
      comment_text: data.textComment ?? '--',
      generated_comment: data.generated_comment,
      post_author: data.userInfo.name,
      authors__company: data.userInfo.company,
      project_name: data.projectId,
      link_to_post: data.postLink ?? '--',
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
    const token = await this.getJwt();
    await this.sendToFiveSDB(fiveSDBEventData, token);
    await this.hubspotClient(hubspotEventData);
    return 'Event successfully sent';
  }

  async generateComment(data: {
    textPost: string;
    textComment?: string;
    prompt?: string;
    modelName?: string;
  }) {
    this.model = new Ollama({
      baseUrl: `${this.llamaUrl}`,
      model: data.modelName ?? 'openchat',
      temperature: 1,
    });
    if (data.textComment) {
      const prompt = PromptTemplate.fromTemplate(
        `
          Reply the {comment} on the LinkedIn {post}. Your reply is limited to 70 words. ${data.prompt}.
            POST: {post}
            COMMENT: {comment}
          `,
      );
      const chain = new LLMChain({
        llm: this.model,
        prompt,
      });
      const answer = await chain.invoke({
        post: data.textPost,
        comment: data.textComment,
      });
      return answer.text;
    }
    const prompt = PromptTemplate.fromTemplate(
      `
        Comment the quoted Linkedin post. Your comment is limited to 70 words. ${data.prompt}.
            POST: {post}
          `,
    );
    const chain = new LLMChain({
      llm: this.model,
      prompt,
    });
    const answer = await chain.invoke({
      post: data.textPost,
    });
    return answer.text;
  }
}
