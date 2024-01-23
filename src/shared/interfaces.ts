import { FaissStore } from 'langchain/vectorstores/faiss';
import { PromptTemplate } from 'langchain/prompts';

export interface Prompt {
  title: string;
  content: string;
  promptTemplate: PromptTemplate;
}

interface SourceData {
  name: string;
  date: string;
}

export interface Category {
  name: string;
  description: string;
  vectorStore: FaissStore;
  categoryContent: {
    links: SourceData[];
    files: Array<SourceData & { size: number }>;
  };
}

export interface Chat {
  id: string;
  name: string;
  categoryName: string;
  promptTemplateTitle: string;
  chain: any;
  sources: string[];
  vectorStore: any;
  modelName: string;
  model: any;
  history: {
    author: 'chat' | 'user';
    usedCategory?: string;
    usedPrompt?: string;
    message: string;
    mentionedRCFiles?: string[];
  }[];
  autoplayAnswers?: boolean;
}

export interface AIExtensionIncomingData {
  textPost: string;
  textComment?: string;
  linkAuthorComment?: string;
  userInfo: {
    about: string;
    aboutAuthor: string;
    company: string;
    experience: string;
    link: string;
    name: string;
    position: string;
  };
}

export interface FiveSDBBackup {
  text_post: string;
  text_comment: string;
  link_author_comment: string;
  about_user: string;
  about_author: string;
  user_company: string;
  user_experience: string;
  user_link: string;
  user_name: string;
  user_position: string;
  extension_user: string;
  ai_comments: string;
  project_id: string;
}
