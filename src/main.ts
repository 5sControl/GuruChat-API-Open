import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const PORT = configService.get<number>('CHATGURU_API_PORT');
  app.enableCors();
  await app.listen(PORT, '0.0.0.0');
}
bootstrap();
