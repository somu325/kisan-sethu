import knex, { type Knex } from 'knex';
import type { DbConnectionConfig } from '../config.js';
import { logger } from '../../logger.js';

export function createPostgresConnection(cfg: DbConnectionConfig): Knex {
  logger.info(
    {
      urlMasked: cfg.databaseUrl.replace(/:([^:@]+)@/, ':****@'),
      maxConnections: cfg.maxConnections,
    },
    'Connecting to PostgreSQL database'
  );

  return knex({
    client: 'pg',
    connection: cfg.databaseUrl,
    pool: {
      min: 2,
      max: cfg.maxConnections || 10,
      acquireTimeoutMillis: cfg.timeoutMs || 5000,
    },
    acquireConnectionTimeout: cfg.timeoutMs || 5000,
  });
}
