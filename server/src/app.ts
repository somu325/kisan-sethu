import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { config } from './config.js';
import { logger } from './logger.js';
import { marketsRouter } from './routes/markets.js';
import { conversationsRouter } from './routes/conversations.js';
import { feedbackRouter } from './routes/feedback.js';
import { adminRouter } from './routes/admin.js';
import { pesticidesRouter } from './routes/pesticides.js';
import { assistantRouter } from './routes/assistant.js';

export function createApp() {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
      credentials: true,
    })
  );

  // Rate Limiting (120 requests per minute per IP)
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again in a minute.',
      },
    },
  });
  app.use(limiter);

  // Structured request logging
  if (config.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        autoLogging: {
          ignore: (req) => req.url === '/health',
        },
      })
    );
  }

  // Parse JSON bodies
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      dbProvider: config.DB_PROVIDER,
      llmProvider: config.LLM_PRIMARY_PROVIDER,
      version: '1.0.0',
    });
  });

  // Mount API Routers
  app.use('/markets', marketsRouter);
  app.use('/conversations', conversationsRouter);
  app.use('/feedback', feedbackRouter);
  app.use('/admin', adminRouter);
  app.use('/pesticides', pesticidesRouter);
  app.use('/assistant', assistantRouter);

  // Global 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint does not exist',
      },
    });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'Unhandled server error');
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: config.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
      },
    });
  });

  return app;
}
