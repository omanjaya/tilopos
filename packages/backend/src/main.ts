import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { RequestLoggerMiddleware } from './infrastructure/logging/request-logger.middleware';

function validateEnvironment() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `FATAL: Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}`,
    );
  }

  if (process.env.CORS_ORIGIN === '*') {
    throw new Error(
      'FATAL: CORS_ORIGIN=* is not allowed. Set explicit origins (e.g. http://localhost:5173)',
    );
  }

  const optional: Record<string, string> = {
    XENDIT_WEBHOOK_TOKEN: 'Xendit payment webhooks will be rejected',
    MIDTRANS_SERVER_KEY: 'Midtrans payment webhooks will be rejected',
  };
  Object.entries(optional).forEach(([key, warning]) => {
    if (!process.env[key]) {
      console.warn(`WARNING: ${key} not set — ${warning}`);
    }
  });
}

async function bootstrap() {
  validateEnvironment();

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.use(new RequestLoggerMiddleware().use.bind(new RequestLoggerMiddleware()));

  app.use(helmet());

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('TiloPOS API')
    .setDescription('Point of Sale system for Indonesian SME/UMKM')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
}

bootstrap();
