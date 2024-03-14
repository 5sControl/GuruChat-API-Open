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
  modelsList = [
    'solar',
    'openchat',
    'mistral',
    'mistral:instruct',
    'llama-pro:instruct',
    'openhermes',
    'vicuna',
    'qwen',
  ];
  promptPresets = {
    thoughtful: 'your answer must be very thoughtful',
    supportive:
      'Your answer should be supportive, your opinion should be the same as commentator opinion',
    summarize: 'summarize provided {post} and {comment}',
    question: 'ask logical question in your answer to start a discussion',
    argue:
      'your answer must be as rude as possible, your opinion must be opposite to commentator opinion',
  };

  constructor(private readonly configService: ConfigService) {
    this.llamaUrl = this.configService.get('CHATGURU_API_MODEL_URL');
    this.hubspot = new Client({
      accessToken: this.configService.get('HUBSPOT_AUTH_TOKEN'),
    });
    this.databaseUrl = this.configService.get('DATABASE_URL');
  }

  getModels() {
    return this.modelsList;
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
    } catch (e) {
      throw new HttpException('Invalid fields hubspot', 422);
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
      throw new HttpException('Error getting jwt', 422);
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
    length?: number;
  }) {
    this.model = new Ollama({
      baseUrl: `${this.llamaUrl}`,
      model: this.modelsList.includes(data.modelName)
        ? data.prompt === 'argue'
          ? 'dolphin-mistral'
          : data.modelName
        : 'openchat',
      temperature: 1.5,
    });

    const answerLimit =
      !data.length || data.length === 1
        ? 'twenty words'
        : data.length === 3
        ? 'hundred words'
        : `fifty words`;

    const tone = Object.keys(this.promptPresets).includes(data.prompt)
      ? this.promptPresets[data.prompt]
      : data.prompt;

    if (data.textComment) {
      const prompt = PromptTemplate.fromTemplate(
        `
          Craft a businesslike response to a comment on a LinkedIn post. ${tone}. Imagine you are a manager looking to engage with a person on LinkedIn. You've found the following post: {post}. Someone has commented: {comment}. Your response should be meaningful, no longer than ${answerLimit} words, and should prompt a reply. Avoid using personal names or addresses.
            POST: {post}
            COMMENT: {comment}
          `,
      );
      const customPrompt = PromptTemplate.fromTemplate(
        `
          ${data.prompt}
            POST: {post}
            COMMENT: {comment}
          `,
      );
      const isCustomPrompt =
        data.prompt.includes('{post}') && data.prompt.includes('{comment}');
      const chain = new LLMChain({
        llm: this.model,
        prompt: isCustomPrompt ? customPrompt : prompt,
      });
      const answer = await chain.invoke({
        post: data.textPost,
        comment: data.textComment,
      });
      return answer.text;
    }
    const prompt = PromptTemplate.fromTemplate(
      `
          Craft a businesslike response to a LinkedIn post. ${tone}. Imagine you are a manager looking to engage with a person on LinkedIn. You've found the following post: {post}. Your comment should be meaningful, no longer than ${answerLimit} words, and should prompt a reply. Avoid using personal names or addresses.
            POST: {post}
          `,
    );
    const customPrompt = PromptTemplate.fromTemplate(
      `
          ${data.prompt}
            POST: {post}
          `,
    );
    const isCustomPrompt = data.prompt.includes('{post}');
    const chain = new LLMChain({
      llm: this.model,
      prompt: isCustomPrompt ? customPrompt : prompt,
    });
    const answer = await chain.invoke({
      post: data.textPost,
    });
    return answer.text;
  }
}
