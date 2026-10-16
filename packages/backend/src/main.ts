import { corsOrigins } from './config/cors';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { RequestLoggerMiddleware } from './infrastructure/logging/request-logger.middleware';
import { ElkLoggerService } from './infrastructure/logging/elk-logger.service';
import { parseTrustProxy } from './config/env.validation';

async function bootstrap() {
  // Environment is validated by ConfigModule (src/config/env.validation.ts)
  // rawBody: webhook HMACs (self-order) are verified over the exact bytes received.
  // bufferLogs + useLogger: boot logs go through the structured ELK logger (LoggingModule).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });
  app.useLogger(app.get(ElkLoggerService));
  app.enableShutdownHooks();

  // Behind a load balancer req.ip is the proxy address unless Express is told
  // how many hops to trust. Per-IP throttling and audit IPs depend on it.
  // TRUST_PROXY: false (default) | true | <hop count> | comma-separated subnets.
  app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

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

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', '*'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
        },
      },
    }),
  );

  app.enableCors({
    origin: corsOrigins(process.env.CORS_ORIGIN, process.env.NODE_ENV),
    credentials: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TiloPOS API')
      .setDescription('Point of Sale system for Indonesian SME/UMKM')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  const port = process.env.PORT || 3001; // matches Docker, Vite proxy and README
  await app.listen(port);
}

bootstrap();
