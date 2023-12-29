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
import { Category, Chat, Prompt } from '../shared/interfaces';
import { v4 } from 'uuid';
import { loadQAStuffChain, RetrievalQAChain } from 'langchain/chains';
import { RecursiveUrlLoader } from 'langchain/document_loaders/web/recursive_url';
import { compile } from 'html-to-text';
import { ConfigService } from '@nestjs/config';
import { HuggingFaceTransformersEmbeddings } from 'langchain/embeddings/hf_transformers';
import { createReadStream } from 'fs';
import { PromptTemplate } from 'langchain/prompts';

@Injectable()
export class ChatContextService implements OnApplicationBootstrap {
  prompts: Prompt[] = [];
  chatStorageBasePath = `./src/docker-volume/`;
  availableModels = [
    'llama2:13b',
    'openchat',
    'zephyr',
    'starling-lm',
    'mistral-openorca',
    'mixtral',
    'phi',
    'mistrallite',
    'solar',
    'bakllava',
    'orca-mini',
  ];
  llamaUrl;
  categories: Category[] = [];
  chats: Chat[] = [];
  embeddingModel;
  textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 0,
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

  private chainCreator(
    model: any,
    retriever: any,
    promptTemplate?: PromptTemplate,
  ) {
    if (promptTemplate) {
      return new RetrievalQAChain({
        combineDocumentsChain: loadQAStuffChain(model, {
          prompt: promptTemplate,
        }),
        retriever,
        inputKey: 'query',
      });
    }
    return RetrievalQAChain.fromLLM(model, retriever);
  }

  private backupData() {
    fs.writeFileSync(
      `${this.chatStorageBasePath}backup/categories.txt`,
      JSON.stringify(this.categories),
    );
    fs.writeFileSync(
      `${this.chatStorageBasePath}backup/chats.txt`,
      JSON.stringify(this.chats),
    );
    fs.writeFileSync(
      `${this.chatStorageBasePath}backup/prompts.txt`,
      JSON.stringify(this.prompts),
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
    if (!fs.existsSync(`${this.chatStorageBasePath}uploads`)) {
      fs.mkdirSync(`${this.chatStorageBasePath}uploads`);
    }
    if (!fs.existsSync(`${this.chatStorageBasePath}uploads/ChatGuru`)) {
      fs.mkdirSync(`${this.chatStorageBasePath}uploads/ChatGuru`);
    }
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
    const categories = JSON.parse(
      fs.readFileSync(`${this.chatStorageBasePath}backup/categories.txt`, {
        encoding: 'utf8',
      }),
    );
    const chats = JSON.parse(
      fs.readFileSync(`${this.chatStorageBasePath}backup/chats.txt`, {
        encoding: 'utf8',
      }),
    );
    const prompts = JSON.parse(
      fs.readFileSync(`${this.chatStorageBasePath}backup/prompts.txt`, {
        encoding: 'utf8',
      }),
    );
    this.categories = categories;
    this.chats = chats;
    this.prompts = prompts;
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
      category.vectorStore = vectorStore;
    }
    for (const chat of this.chats) {
      chat.model = this.modelCreator(chat.modelName);
      if (chat.categoryName) {
        const chatCategory = this.categories.find(
          (category) => category.name === chat.categoryName,
        );
        if (chatCategory && chatCategory.vectorStore) {
          chat.chain = this.chainCreator(
            chat.model,
            chatCategory.vectorStore.asRetriever(),
          );
          chat.vectorStore = chatCategory.vectorStore;
        }
      }
    }
  }

  getPrompts() {
    return this.prompts;
  }

  getCategories() {
    return this.categories;
  }

  getChats() {
    return this.chats;
  }

  getModels() {
    return this.availableModels;
  }

  async createPrompt(data: { title: string; content: string }) {
    this.prompts.push({
      title: data.title,
      content: data.content,
      promptTemplate: new PromptTemplate({
        inputVariables: [],
        template: data.content,
      }),
    });
    this.backupData();
    return this.prompts;
  }

  async editPrompt(data: {
    oldTitle: string;
    title?: string;
    content?: string;
  }) {
    const currentPrompt = this.prompts.find(
      (prompt) => (prompt.title = data.oldTitle),
    );
    if (!currentPrompt) {
      return 'Prompt with such name not found';
    }
    currentPrompt.title = data.title;
    if (data.content) {
      currentPrompt.content = data.content;
      currentPrompt.promptTemplate = new PromptTemplate({
        inputVariables: [],
        template: data.content,
      });
    }
    this.backupData();
    return this.prompts;
  }

  async removePrompt(data: { title: string }) {
    this.prompts = this.prompts.filter((prompt) => prompt.title !== data.title);
    this.backupData();
    return this.prompts;
  }

  async createCategory(data: { name: string; description: string }) {
    if (this.categories.find((cat) => cat.name === data.name)) {
      return 'category already exists';
    }
    fs.mkdirSync(`${this.chatStorageBasePath}uploads/ChatGuru/${data.name}`);
    this.categories.push({
      name: data.name,
      description: data.description,
      vectorStore: null,
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
    if (this.categories.some((category) => category.name === data.newName)) {
      return 'such category is already exists';
    }
    const targetCategory = this.categories.find(
      (category) => category.name === data.oldName,
    );
    if (data.newName) {
      targetCategory.name = data.newName;
      fs.renameSync(
        `${this.chatStorageBasePath}uploads/ChatGuru/${data.oldName}`,
        `${this.chatStorageBasePath}uploads/ChatGuru/${data.newName}`,
      );
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
    fs.rmSync(`${this.chatStorageBasePath}uploads/ChatGuru/${data.name}`, {
      recursive: true,
      force: true,
    });
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
    this.chats.forEach((chat) => {
      if (chat.categoryName === categoryName) {
        chat.sources = chat.sources.filter((source) => source !== fileName);
      }
    });
    if (
      fs.existsSync(
        `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}/files/${fileName}`,
      )
    ) {
      fs.rmSync(
        `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}/files/${fileName}`,
        {
          recursive: true,
          force: true,
        },
      );
    }
    if (
      fs.existsSync(
        `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}/faiss-saved-stores/${fileName}`,
      )
    ) {
      fs.rmSync(
        `${this.chatStorageBasePath}uploads/ChatGuru/${categoryName}/faiss-saved-stores/${fileName}`,
        {
          recursive: true,
          force: true,
        },
      );
    }
    this.backupData();
    return this.categories;
  }

  async createChat(modelName: string, categoryName?: string) {
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
      this.chats.push(newChatData);
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
      this.chats.push(newChatData);
      this.backupData();
      return this.chats;
    }
  }

  async removeChat(chatId: string) {
    this.chats = this.chats.filter((chat) => chat.id !== chatId);
    return this.chats;
  }

  async editChat(params: {
    categoryName?: string;
    chatId: string;
    sources?: string[];
    chatName?: string;
    modelName?: string;
  }) {
    const currentChat = this.chats.find((chat) => chat.id === params.chatId);
    const model = params.modelName
      ? this.modelCreator(params.modelName)
      : currentChat.model;
    if (params.chatName) {
      currentChat.name = params.chatName;
    }
    if (params.categoryName) {
      if (
        params.categoryName === '@Default' ||
        params.categoryName === 'undefined'
      ) {
        currentChat.categoryName = params.categoryName;
        currentChat.sources = [];
        currentChat.vectorStore = null;
        currentChat.chain = null;
      } else {
        currentChat.categoryName = params.categoryName;
        const categorySources = this.categories.find(
          (cat) => cat.name === params.categoryName,
        ).categoryContent;
        currentChat.sources = categorySources.files
          .map((s) => s.name)
          .concat(categorySources.links.map((l) => l.name));
        currentChat.vectorStore = this.categories.find(
          (cat) => cat.name === params.categoryName,
        ).vectorStore;
      }
      if (currentChat.vectorStore) {
        currentChat.chain = this.chainCreator(
          currentChat.model,
          currentChat.vectorStore.asRetriever(),
        );
      }
    }
    if (params.modelName) {
      currentChat.model = model;
      currentChat.modelName = params.modelName;
    }
    if (
      params.sources &&
      params.sources.length &&
      params.categoryName !== '@Default'
    ) {
      const vectorStore = await this.createVectorStorage(
        params.categoryName,
        params.sources,
      );
      currentChat.chain = this.chainCreator(model, vectorStore.asRetriever());
      currentChat.sources = params.sources;
    }
    return this.chats;
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
      const currentCategory = this.categories.find(
        (cat) => cat.name === categoryName,
      );
      await currentCategory.vectorStore.mergeFrom(linkVectorFormat);
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
      const currentCategory = this.categories.find(
        (cat) => cat.name === categoryName,
      );
      await currentCategory.vectorStore.mergeFrom(fileVectorFormat);
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

  async downloadPrompt(promptTemplateTitle: string) {
    const selectedTemplate = this.prompts.find(
      (prompt) => (prompt.title = promptTemplateTitle),
    );
    return `${selectedTemplate.title}: ${selectedTemplate.content}`;
  }

  async askAssistant(params: {
    prompt: string;
    chatId: string;
    categoryName: string;
    promptTemplateTitle?: string;
  }) {
    const currentChat = this.chats.find((chat) => chat.id === params.chatId);
    if (!currentChat) {
      return 'invalid chat id';
    }
    const selectedCategory = this.categories.find(
      (category) => category.name === params.categoryName,
    );
    if (selectedCategory) {
      currentChat.vectorStore = selectedCategory.vectorStore;
      if (params.promptTemplateTitle) {
        const selectedTemplate = this.prompts.find(
          (prompt) => (prompt.title = params.promptTemplateTitle),
        );
        currentChat.chain = this.chainCreator(
          currentChat.model,
          selectedCategory.vectorStore.asRetriever(),
          selectedTemplate.promptTemplate,
        );
      } else {
        currentChat.chain = this.chainCreator(
          currentChat.model,
          selectedCategory.vectorStore.asRetriever(),
        );
      }
    }
    if (!currentChat.chain || !currentChat.sources.length) {
      if (params.promptTemplateTitle) {
        const selectedTemplate = this.prompts.find(
          (prompt) => (prompt.title = params.promptTemplateTitle),
        );
        const prompt = PromptTemplate.fromTemplate(
          `${selectedTemplate.content} Question: {question}`,
        );
        const runnable = prompt.pipe(currentChat.model);
        const answer = await runnable.invoke({ question: params.prompt });
        currentChat.history.push({ author: 'user', message: params.prompt });
        currentChat.history.push({ author: 'chat', message: answer as string });
      } else {
        const answer = await currentChat.model.call(params.prompt);
        currentChat.history.push({ author: 'user', message: params.prompt });
        currentChat.history.push({ author: 'chat', message: answer });
      }
    } else {
      const answer = await currentChat.chain.call({
        query: params.prompt,
      });
      currentChat.history.push({ author: 'user', message: params.prompt });
      currentChat.history.push({ author: 'chat', message: answer.text });
    }
    return this.chats;
  }
}
