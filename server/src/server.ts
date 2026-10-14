import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { closeDb, initDb } from './db/index.js';

async function bootstrap() {
  // Initialize Database
  try {
    await initDb();
    logger.info({ provider: config.DB_PROVIDER }, 'Database connection initialized successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize database connection');
  }

  const app = createApp();

  const server = app.listen(config.PORT, () => {
    logger.info(
      {
        port: config.PORT,
        env: config.NODE_ENV,
        dbProvider: config.DB_PROVIDER,
      },
      `🚀 KisanSetu backend server listening on port ${config.PORT}`
    );
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Graceful shutdown signal received. Closing server...');
    server.close(async () => {
      logger.info('HTTP server closed. Closing database connections...');
      await closeDb();
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Fatal error during server bootstrap');
  process.exit(1);
});
