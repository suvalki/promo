import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { MainModule } from './main.module';

async function bootstrap() {
  const app = await NestFactory.create(MainModule);
  app.use(cookieParser());
  app.enableCors({
    origin: [/^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Promo API')
    .setDescription('The Promo API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(documentFactory));

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
