import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { MainModule } from './src/main.module';

async function bootstrap() {
  const app = await NestFactory.create(MainModule);

  const config = new DocumentBuilder()
    .setTitle('Promo API')
    .setDescription('The Promo API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documentFactory = SwaggerModule.createDocument(app, config);

  fs.writeFileSync(
    './openapi.json',
    JSON.stringify(cleanupOpenApiDoc(documentFactory), null, 2),
  );
  console.log('OpenAPI schema generated in openapi.json');

  await app.close();
  process.exit(0);
}

void bootstrap();
