import { Test, TestingModule } from '@nestjs/testing';
import { ChatContextService } from './chat-context.service';

describe('ChatContextService', () => {
  let service: ChatContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatContextService],
    }).compile();

    service = module.get<ChatContextService>(ChatContextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
