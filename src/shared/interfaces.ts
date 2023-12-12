import { RetrievalQAChain } from 'langchain/chains';

interface SourceData {
  name: string;
  date: string;
}

export interface Category {
  name: string;
  description: string;
  chats: Chat[];
  categoryContent: {
    links: SourceData[];
    files: Array<SourceData & { size: number }>;
  };
}

export interface Chat {
  id: string;
  name: string;
  categoryName: string;
  chain: RetrievalQAChain;
  sources: string[];
  vectorStore: any;
  modelName: string;
  model: any;
  history: {
    author: 'chat' | 'user';
    message: string;
  }[];
}
