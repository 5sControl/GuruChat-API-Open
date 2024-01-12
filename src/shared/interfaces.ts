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
}
