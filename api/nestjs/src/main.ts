import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path';
import * as cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './auth/all-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe ({
    whitelist: true,
  }));
  app.useStaticAssets(join(__dirname, '../../', 'public'));
  app.use(cookieParser());
//  app.useGlobalFilters(new AllExceptionsFilter)
  await app.listen(3000);
}
bootstrap();
