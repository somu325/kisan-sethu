import type { Knex } from 'knex';

export interface CacheRepository {
  get<T = any>(key: string): Promise<T | null>;
  set(key: string, value: any, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  cleanExpired(): Promise<number>;
}

export class KnexCacheRepository implements CacheRepository {
  constructor(private knex: Knex) {}

  async get<T = any>(key: string): Promise<T | null> {
    const row = await this.knex('response_cache')
      .where('key', key)
      .andWhere('expires_at', '>', new Date())
      .first();

    if (!row) return null;
    try {
      return JSON.parse(row.value_json) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const valueJson = JSON.stringify(value);

    // Upsert pattern compatible across SQLite (since 3.24) and PostgreSQL
    await this.knex('response_cache')
      .insert({
        key,
        value_json: valueJson,
        expires_at: expiresAt,
      })
      .onConflict('key')
      .merge({
        value_json: valueJson,
        expires_at: expiresAt,
      });
  }

  async delete(key: string): Promise<void> {
    await this.knex('response_cache').where('key', key).del();
  }

  async cleanExpired(): Promise<number> {
    const count = await this.knex('response_cache')
      .where('expires_at', '<=', new Date())
      .del();
    return count;
  }
}
