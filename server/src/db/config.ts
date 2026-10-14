import { config } from '../config.js';

export interface DbConnectionConfig {
  provider: 'sqlite' | 'postgres' | 'firestore';
  databaseUrl: string;
  timeoutMs: number;
  maxConnections: number;
}

export function getDbConfig(): DbConnectionConfig {
  return {
    provider: config.DB_PROVIDER,
    databaseUrl: config.DATABASE_URL,
    timeoutMs: config.DB_TIMEOUT_MS,
    maxConnections: config.DB_MAX_CONNECTIONS,
  };
}
