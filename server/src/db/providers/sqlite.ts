import fs from 'fs';
import path from 'path';
import knex, { type Knex } from 'knex';
import type { DbConnectionConfig } from '../config.js';
import { logger } from '../../logger.js';

export function createSqliteConnection(cfg: DbConnectionConfig): Knex {
  const resolvedPath = path.isAbsolute(cfg.databaseUrl)
    ? cfg.databaseUrl
    : path.resolve(process.cwd(), cfg.databaseUrl);

  const parentDir = path.dirname(resolvedPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
    logger.info({ parentDir }, 'Created parent directory for SQLite database');
  }

  logger.info({ path: resolvedPath }, 'Connecting to SQLite database');

  return knex({
    client: 'sqlite3',
    connection: {
      filename: resolvedPath,
    },
    useNullAsDefault: true,
    pool: {
      min: 1,
      max: cfg.maxConnections || 5,
      acquireTimeoutMillis: cfg.timeoutMs || 5000,
      afterCreate: (conn: any, done: Function) => {
        // Enable WAL mode and foreign keys for better performance and data integrity
        conn.run('PRAGMA foreign_keys = ON;', (err: any) => {
          if (err) return done(err, conn);
          conn.run('PRAGMA journal_mode = WAL;', done);
        });
      },
    },
  });
}
