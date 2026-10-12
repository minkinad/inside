import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './module';
import { JsonLogger } from './logger';

async function bootstrap() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error('JWT_SECRET must be at least 32 characters');
  if (process.env.NODE_ENV === 'production') {
    for (const name of [
      'DATABASE_URL',
      'REDIS_URL',
      'MINIO_ENDPOINT',
      'MINIO_ACCESS_KEY',
      'MINIO_SECRET_KEY',
      'WEB_ORIGIN',
    ])
      if (!process.env[name])
        throw new Error(`${name} is required in production`);
  }
  const app = await NestFactory.create(AppModule, { logger: new JsonLogger() });
  app.setGlobalPrefix('api');
  app.use(
    (
      _request: unknown,
      response: { setHeader: (name: string, value: string) => void },
      next: () => void,
    ) => {
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('X-Frame-Options', 'DENY');
      response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      next();
    },
  );
  app.enableCors({ origin: process.env.WEB_ORIGIN || 'http://localhost:3000' });
  const config = new DocumentBuilder()
    .setTitle('Inside API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  await app.listen(Number(process.env.PORT || 4000));
}
bootstrap();
