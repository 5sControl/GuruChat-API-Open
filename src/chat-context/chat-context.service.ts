import {
  Injectable,
  OnApplicationBootstrap,
  StreamableFile,
} from '@nestjs/common';
import { Ollama } from 'langchain/llms/ollama';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { FaissStore } from 'langchain/vectorstores/faiss';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import * as fs from 'fs';
import { CSVLoader } from 'langchain/document_loaders/fs/csv';
import { DocxLoader } from 'langchain/document_loaders/fs/docx';
import { Category } from '../shared/interfaces';
import { v4 } from 'uuid';
import { RetrievalQAChain } from 'langchain/chains';
import { RecursiveUrlLoader } from 'langchain/document_loaders/web/recursive_url';
import { compile } from 'html-to-text';
import { ConfigService } from '@nestjs/config';
import { HuggingFaceTransformersEmbeddings } from 'langchain/embeddings/hf_transformers';
import { createReadStream } from 'fs';

@Injectable()
export class ChatContextService implements OnApplicationBootstrap {
  chatStorageBasePath = `./src/docker-volume/`;
  availableModels = [
    'llama2:13b',
    'openchat',
    'zephyr',
    'starling-lm',
    'mistral-openorca',
  ];
  llamaUrl;
  categories: Category[] = [];
  embeddingModel;
  textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 700,
    chunkOverlap: 50,
  });

  constructor(private readonly configService: ConfigService) {
    this.llamaUrl = this.configService.get('CHATGURU_API_MODEL_URL');
    this.embeddingModel = new HuggingFaceTransformersEmbeddings();
  }

  private async createVectorStorage(
    categoryName: string,
    contextSources: string[],
  ) {
    const vectorStore = await FaissStore.load(
      `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}/faiss-saved-stores/${contextSources[0]}`,
      this.embeddingModel,
    );
    for (const source of contextSources) {
      if (source !== contextSources[0]) {
        const currentVectorStore = await FaissStore.load(
          `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}/faiss-saved-stores/${source}`,
          this.embeddingModel,
        );
        await vectorStore.mergeFrom(currentVectorStore);
      }
    }
    return vectorStore;
  }

  private modelCreator(modelName: string) {
    return new Ollama({
      baseUrl: `${this.llamaUrl}`,
      model: modelName,
      temperature: 0.5,
    });
  }

  private chainCreator(model: any, retriever: any) {
    return RetrievalQAChain.fromLLM(model, retriever);
  }

  private backupData() {
    fs.writeFileSync(
      `${this.chatStorageBasePath}backup/categories.txt`,
      JSON.stringify(this.categories),
    );
  }

  private validatePaths(categoryName: string) {
    if (!this.categories.find((category) => category.name === categoryName)) {
      return 'Wrong category name';
    }
    if (
      !fs.existsSync(
        `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}`,
      )
    ) {
      fs.mkdirSync(
        `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}`,
      );
    }
    if (
      !fs.existsSync(
        `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}/files`,
      )
    ) {
      fs.mkdirSync(
        `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}/files`,
      );
    }
    if (
      !fs.existsSync(
        `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}/faiss-saved-stores`,
      )
    ) {
      fs.mkdirSync(
        `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}/faiss-saved-stores`,
      );
    }
  }

  async onApplicationBootstrap() {
    const data = fs.readFileSync(
      `${this.chatStorageBasePath}backup/categories.txt`,
      {
        encoding: 'utf8',
      },
    );
    this.categories = JSON.parse(data);
    await this.uploadCachedChats();
  }

  private async uploadCachedChats() {
    const data = JSON.parse(
      fs.readFileSync(`${this.chatStorageBasePath}backup/categories.txt`, {
        encoding: 'utf8',
      }),
    );
    this.categories = data;
    for (const category of this.categories) {
      let vectorStore = null;
      if (
        fs.existsSync(
          `${this.chatStorageBasePath}uploads/ChatGuru/${category.name}/faiss-saved-stores`,
        )
      ) {
        const contextSources = fs.readdirSync(
          `${this.chatStorageBasePath}uploads/ChatGuru/${category.name}/faiss-saved-stores`,
        );
        if (contextSources.length) {
          try {
            vectorStore = await this.createVectorStorage(
              category.name,
              contextSources,
            );
          } catch {
            console.log('error reading cached sources');
          }
        }
      }
      for (const chat of category.chats) {
        console.log(chat.model);
        chat.model = this.modelCreator(chat.modelName);
        console.log(chat.model);
        if (vectorStore) {
          chat.chain = this.chainCreator(chat.model, vectorStore.asRetriever());
        }
      }
    }
  }

  getCategories() {
    return this.categories;
  }

  getModels() {
    return this.availableModels;
  }

  async createCategory(data: { name: string; description: string }) {
    if (this.categories.find((cat) => cat.name === data.name)) {
      return 'category already exists';
    }
    fs.mkdirSync(`${this.chatStorageBasePath}uploads/ChatGuru/${data.name}`);
    this.categories.push({
      name: data.name,
      description: data.description,
      chats: [],
      categoryContent: {
        links: [],
        files: [],
      },
    });
    this.backupData();
    return this.categories;
  }

  async editCategory(data: {
    oldName: string;
    newName?: string;
    description?: string;
  }) {
    const targetCategory = this.categories.find(
      (category) => category.name === data.oldName,
    );
    if (data.newName) {
      targetCategory.name = data.newName;
    }
    if (data.description) {
      targetCategory.description = data.description;
    }
    this.backupData();
    return this.categories;
  }

  async removeCategory(data: { name: string }) {
    this.categories = this.categories.filter(
      (category) => category.name !== data.name,
    );
    this.backupData();
    return this.categories;
  }

  removeSource(fileName: string, categoryName: string) {
    const selectedCategory = this.categories.find(
      (cat) => cat.name === categoryName,
    );
    selectedCategory.categoryContent.links =
      selectedCategory.categoryContent.links.filter(
        (source) => source.name !== fileName,
      );
    selectedCategory.categoryContent.files =
      selectedCategory.categoryContent.files.filter(
        (source) => source.name !== fileName,
      );
    selectedCategory.chats.forEach((chat) => {
      chat.sources = chat.sources.filter((source) => source !== fileName);
    });
    this.backupData();
    return this.categories;
  }

  async createChat(categoryName: string, modelName: string) {
    const chatId = v4();
    let contextSources;
    const model = this.modelCreator(this.availableModels[0]);
    try {
      contextSources = fs.readdirSync(
        `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}/faiss-saved-stores`,
      );
      const vectorStore = await this.createVectorStorage(
        categoryName,
        contextSources,
      );
      const chain = this.chainCreator(model, vectorStore.asRetriever());
      const newChatData = {
        id: chatId,
        name: 'New Chat',
        modelName,
        model,
        categoryName,
        sources: contextSources,
        chain,
        vectorStore,
        history: [],
      };
      this.categories
        .find((category) => category.name === categoryName)
        .chats.push(newChatData);
      this.backupData();
      return this.categories;
    } catch {
      const newChatData = {
        id: chatId,
        name: 'New Chat',
        modelName,
        model,
        categoryName,
        sources: [],
        chain: null,
        vectorStore: null,
        history: [],
      };
      this.categories
        .find((category) => category.name === categoryName)
        .chats.push(newChatData);
      this.backupData();
      return this.categories;
    }
  }

  async removeChat(categoryName: string, chatId: string) {
    const currentCategory = this.categories.find(
      (cat) => cat.name === categoryName,
    );
    currentCategory.chats = currentCategory.chats.filter(
      (chat) => chat.id !== chatId,
    );
    return this.categories;
  }

  async editChat(params: {
    categoryName: string;
    chatId: string;
    sources: string[];
    chatName: string;
    modelName: string;
  }) {
    const model = this.modelCreator(params.modelName);
    const currentCategory = this.categories.find(
      (cat) => cat.name === params.categoryName,
    );
    const currentChat = currentCategory.chats.find(
      (chat) => chat.id === params.chatId,
    );
    if (params.chatName) {
      currentChat.name = params.chatName;
    }
    if (params.modelName) {
      currentChat.model = model;
      currentChat.modelName = params.modelName;
    }
    if (params.sources && params.sources.length) {
      const vectorStore = await this.createVectorStorage(
        params.categoryName,
        params.sources,
      );
      currentChat.chain = this.chainCreator(model, vectorStore.asRetriever());
      currentChat.sources = params.sources;
    }
    return this.categories;
  }

  private async processIncomingData(
    categoryName: string,
    file?: Express.Multer.File,
    link?: string,
  ) {
    const processLink = async (link: string) => {
      const compiledConvert = compile({ wordwrap: 130 });
      const linkLoader = new RecursiveUrlLoader(link, {
        extractor: compiledConvert,
        maxDepth: 3,
      });
      const documents = await linkLoader.load();
      const splittedDocs = await this.textSplitter.splitDocuments(documents);
      const linkVectorFormat = await FaissStore.fromDocuments(
        splittedDocs,
        this.embeddingModel,
      );
      await linkVectorFormat.save(
        `${
          this.chatStorageBasePath
        }uploads/ChatGuru/${categoryName}/faiss-saved-stores/${link.replace(
          'https://',
          '',
        )}`,
      );
    };

    const processFile = async (
      fileLoader: PDFLoader | CSVLoader | TextLoader | DocxLoader,
      file: Express.Multer.File,
    ) => {
      const documents = await fileLoader.load();
      const splittedDocs = await this.textSplitter.splitDocuments(documents);
      const fileVectorFormat = await FaissStore.fromDocuments(
        splittedDocs,
        this.embeddingModel,
      );
      await fileVectorFormat.save(
        `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}/faiss-saved-stores/${file.originalname}`,
      );
    };

    if (link) {
      await processLink(link);
    }

    if (file) {
      const filePath = `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}/files/${file.originalname}`;
      fs.writeFileSync(filePath, file.buffer);
      let loader;
      switch (file.mimetype) {
        case 'application/pdf': {
          loader = await new PDFLoader(filePath);
          break;
        }
        case 'text/csv': {
          loader = await new CSVLoader(filePath);
          break;
        }
        case 'text/plain': {
          loader = await new TextLoader(filePath);
          break;
        }
        case 'application/msword': {
          loader = await new DocxLoader(filePath);
          break;
        }
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
          loader = await new DocxLoader(filePath);
          break;
        }
        default:
          return 'wrong file extension';
      }
      await processFile(loader, file);
    }
  }

  async uploadFile(
    categoryName: string,
    file?: Express.Multer.File,
    link?: string,
  ) {
    this.validatePaths(categoryName);
    const date = new Date();
    const currentCategory = this.categories.find(
      (category) => category.name === categoryName,
    );
    if (file) {
      currentCategory.categoryContent.files.push({
        name: file.originalname,
        date: `${date.getDate()}.${date.getUTCMonth()}.${date.getFullYear()}`,
        size: file.size,
      });
      this.backupData();
    }
    if (link) {
      currentCategory.categoryContent.links.push({
        name: link,
        date: `${date.getDate()}.${date.getUTCMonth()}.${date.getFullYear()}`,
      });
    }
    if (link || file) {
      await this.processIncomingData(categoryName, file, link);
      return this.categories;
    } else {
      return 'error uploading file';
    }
  }

  async downloadFile(categoryName: string, fileName: string) {
    const file = createReadStream(
      `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}/files/${fileName}`,
    );
    return new StreamableFile(file);
  }

  async askAssistant(params: { prompt: string; chatId: string }) {
    const currentCategory = this.categories.find((category) =>
      category.chats.some((chat) => chat.id === params.chatId),
    );
    if (!currentCategory) {
      return 'invalid category name';
    }
    const currentChat = currentCategory.chats.find(
      (chat) => chat.id === params.chatId,
    );
    if (!currentChat.chain || !currentChat.sources.length) {
      const answer = await currentChat.model.call(params.prompt);
      currentChat.history.push({ author: 'user', message: params.prompt });
      currentChat.history.push({ author: 'chat', message: answer });
    } else {
      const answer = await currentChat.chain.call({
        query: params.prompt,
      });
      currentChat.history.push({ author: 'user', message: params.prompt });
      currentChat.history.push({ author: 'chat', message: answer.text });
    }
    if (!currentChat) {
      return 'invalid chat id';
    }
    return this.categories;
  }
}
