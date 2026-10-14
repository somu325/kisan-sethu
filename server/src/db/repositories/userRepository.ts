import type { Knex } from 'knex';

export interface DbUser {
  id: string;
  preferredLanguage: string;
  createdAt: string;
}

export interface UserRepository {
  getById(id: string): Promise<DbUser | null>;
  getOrCreate(id: string, preferredLanguage?: string): Promise<DbUser>;
  updateLanguage(id: string, preferredLanguage: string): Promise<void>;
}

export class KnexUserRepository implements UserRepository {
  constructor(private knex: Knex) {}

  async getById(id: string): Promise<DbUser | null> {
    const row = await this.knex('users').where('id', id).first();
    if (!row) return null;
    return {
      id: row.id,
      preferredLanguage: row.preferred_language,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async getOrCreate(id: string, preferredLanguage: string = 'en'): Promise<DbUser> {
    const existing = await this.getById(id);
    if (existing) return existing;

    const now = new Date();
    await this.knex('users').insert({
      id,
      preferred_language: preferredLanguage,
      created_at: now,
    });

    return {
      id,
      preferredLanguage,
      createdAt: now.toISOString(),
    };
  }

  async updateLanguage(id: string, preferredLanguage: string): Promise<void> {
    await this.knex('users').where('id', id).update({
      preferred_language: preferredLanguage,
    });
  }
}
