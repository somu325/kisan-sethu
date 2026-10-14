import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from current server root or parent
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  ADMIN_API_KEY: z.string().default('ks-admin-secret-dev-key'),

  // Database settings
  DB_PROVIDER: z.enum(['sqlite', 'postgres', 'firestore']).default('sqlite'),
  DATABASE_URL: z.string().default('./data/kisansetu.db'),
  DB_TIMEOUT_MS: z.coerce.number().default(5000),
  DB_MAX_CONNECTIONS: z.coerce.number().default(10),

  // LLM settings
  LLM_PRIMARY_PROVIDER: z.enum(['gemini', 'openai', 'anthropic']).default('gemini'),
  GEMINI_API_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_BASE_URL: z.string().default('https://api.openai.com/v1'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  LLM_FORCE_MODEL: z.string().optional().default(''),
  LLM_DAILY_COST_CAP_USD: z.coerce.number().default(10.0),
  LLM_CACHE_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  LLM_CACHE_TTL_SECONDS: z.coerce.number().default(3600),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const config = parsed.data;

export function getResolvedDbPath(): string {
  if (config.DB_PROVIDER === 'sqlite') {
    // Resolve relative path to absolute
    if (path.isAbsolute(config.DATABASE_URL)) {
      return config.DATABASE_URL;
    }
    return path.resolve(process.cwd(), config.DATABASE_URL);
  }
  return config.DATABASE_URL;
}
