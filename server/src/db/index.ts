import type { Knex } from 'knex';
import { getDbConfig } from './config.js';
import { createSqliteConnection } from './providers/sqlite.js';
import { createPostgresConnection } from './providers/postgres.js';
import { createFirestoreStub } from './providers/firestore.js';
import {
  KnexMarketRepository,
  type MarketRepository,
} from './repositories/marketRepository.js';
import {
  KnexPesticideKnowledgeRepository,
  type PesticideKnowledgeRepository,
} from './repositories/pesticideKnowledgeRepository.js';
import {
  KnexConversationRepository,
  type ConversationRepository,
} from './repositories/conversationRepository.js';
import {
  KnexLlmUsageRepository,
  type LlmUsageRepository,
} from './repositories/llmUsageRepository.js';
import {
  KnexUserRepository,
  type UserRepository,
} from './repositories/userRepository.js';
import {
  KnexCacheRepository,
  type CacheRepository,
} from './repositories/cacheRepository.js';
import { logger } from '../logger.js';

let dbInstance: Knex | null = null;

// Cached repository instances
let marketRepo: MarketRepository | null = null;
let pesticideRepo: PesticideKnowledgeRepository | null = null;
let conversationRepo: ConversationRepository | null = null;
let llmUsageRepo: LlmUsageRepository | null = null;
let userRepo: UserRepository | null = null;
let cacheRepo: CacheRepository | null = null;

export async function initDb(): Promise<Knex> {
  if (dbInstance) return dbInstance;

  const cfg = getDbConfig();

  if (cfg.provider === 'sqlite') {
    dbInstance = createSqliteConnection(cfg);
  } else if (cfg.provider === 'postgres') {
    dbInstance = createPostgresConnection(cfg);
  } else if (cfg.provider === 'firestore') {
    createFirestoreStub(cfg);
  } else {
    throw new Error(`Unsupported DB_PROVIDER: ${cfg.provider}`);
  }

  return dbInstance;
}

export function getDb(): Knex {
  if (!dbInstance) {
    const cfg = getDbConfig();
    if (cfg.provider === 'sqlite') {
      dbInstance = createSqliteConnection(cfg);
    } else if (cfg.provider === 'postgres') {
      dbInstance = createPostgresConnection(cfg);
    } else {
      throw new Error(`Database not initialized and unsupported provider: ${cfg.provider}`);
    }
  }
  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.destroy();
      logger.info('Database connection destroyed');
    } catch (err) {
      logger.error({ err }, 'Error closing database connection');
    } finally {
      dbInstance = null;
      marketRepo = null;
      pesticideRepo = null;
      conversationRepo = null;
      llmUsageRepo = null;
      userRepo = null;
      cacheRepo = null;
    }
  }
}

// Repository Factory Functions
export function getMarketRepository(): MarketRepository {
  if (!marketRepo) {
    marketRepo = new KnexMarketRepository(getDb());
  }
  return marketRepo;
}

export function getPesticideKnowledgeRepository(): PesticideKnowledgeRepository {
  if (!pesticideRepo) {
    pesticideRepo = new KnexPesticideKnowledgeRepository(getDb());
  }
  return pesticideRepo;
}

export function getConversationRepository(): ConversationRepository {
  if (!conversationRepo) {
    conversationRepo = new KnexConversationRepository(getDb());
  }
  return conversationRepo;
}

export function getLlmUsageRepository(): LlmUsageRepository {
  if (!llmUsageRepo) {
    llmUsageRepo = new KnexLlmUsageRepository(getDb());
  }
  return llmUsageRepo;
}

export function getUserRepository(): UserRepository {
  if (!userRepo) {
    userRepo = new KnexUserRepository(getDb());
  }
  return userRepo;
}

export function getCacheRepository(): CacheRepository {
  if (!cacheRepo) {
    cacheRepo = new KnexCacheRepository(getDb());
  }
  return cacheRepo;
}
