import type { Knex } from 'knex';

export interface DbConversation {
  id: string;
  userId?: string;
  language: string;
  createdAt: string;
}

export interface DbMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  intent?: string;
  payload?: any;
  createdAt: string;
}

export interface DbFeedback {
  id: string;
  messageId: string;
  helpful: boolean;
  reason?: string;
  createdAt: string;
}

export interface ConversationRepository {
  createConversation(language: string, userId?: string): Promise<DbConversation>;
  getConversation(id: string): Promise<DbConversation | null>;
  addMessage(params: {
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    text: string;
    intent?: string;
    payload?: any;
  }): Promise<DbMessage>;
  getMessages(conversationId: string): Promise<DbMessage[]>;
  addFeedback(messageId: string, helpful: boolean, reason?: string): Promise<DbFeedback>;
}

export class KnexConversationRepository implements ConversationRepository {
  constructor(private knex: Knex) {}

  async createConversation(language: string, userId?: string): Promise<DbConversation> {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    await this.knex('conversations').insert({
      id,
      user_id: userId || null,
      language: language || 'en',
      created_at: now,
    });
    return {
      id,
      userId,
      language,
      createdAt: now.toISOString(),
    };
  }

  async getConversation(id: string): Promise<DbConversation | null> {
    const row = await this.knex('conversations').where('id', id).first();
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id || undefined,
      language: row.language,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async addMessage(params: {
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    text: string;
    intent?: string;
    payload?: any;
  }): Promise<DbMessage> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    await this.knex('messages').insert({
      id,
      conversation_id: params.conversationId,
      role: params.role,
      text: params.text,
      intent: params.intent || null,
      payload_json: params.payload ? JSON.stringify(params.payload) : null,
      created_at: now,
    });
    return {
      id,
      conversationId: params.conversationId,
      role: params.role,
      text: params.text,
      intent: params.intent,
      payload: params.payload,
      createdAt: now.toISOString(),
    };
  }

  async getMessages(conversationId: string): Promise<DbMessage[]> {
    const rows = await this.knex('messages')
      .where('conversation_id', conversationId)
      .orderBy('created_at', 'asc');

    return rows.map((r) => {
      let payload = undefined;
      if (r.payload_json) {
        try {
          payload = JSON.parse(r.payload_json);
        } catch {
          payload = undefined;
        }
      }
      return {
        id: r.id,
        conversationId: r.conversation_id,
        role: r.role,
        text: r.text,
        intent: r.intent || undefined,
        payload,
        createdAt: new Date(r.created_at).toISOString(),
      };
    });
  }

  async addFeedback(messageId: string, helpful: boolean, reason?: string): Promise<DbFeedback> {
    const id = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    await this.knex('feedback').insert({
      id,
      message_id: messageId,
      helpful,
      reason: reason || null,
      created_at: now,
    });
    return {
      id,
      messageId,
      helpful,
      reason,
      createdAt: now.toISOString(),
    };
  }
}
