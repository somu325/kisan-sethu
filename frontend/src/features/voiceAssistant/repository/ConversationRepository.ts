/**
 * Conversation Repository for storing and retrieving assistant chat history.
 */

import type { ChatMessage } from '../types';

export interface ConversationRepository {
  getMessages(): Promise<ChatMessage[]>;
  saveMessages(messages: ChatMessage[]): Promise<void>;
  addMessage(msg: ChatMessage): Promise<void>;
  clear(): Promise<void>;
  hasGreetedInSession(): boolean;
  markGreetedInSession(): void;
}

const STORAGE_KEY = 'ks_voice_assistant_chat_history';
const GREETED_KEY = 'ks_voice_assistant_session_greeted';

export class LocalConversationRepository implements ConversationRepository {
  private inMemoryMessages: ChatMessage[] = [];
  private hasGreetedMemory = false;

  async getMessages(): Promise<ChatMessage[]> {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch {
        // Fallback to in-memory
      }
    }
    return this.inMemoryMessages;
  }

  async saveMessages(messages: ChatMessage[]): Promise<void> {
    this.inMemoryMessages = [...messages];
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); // Keep last 30 messages
      } catch {
        // Storage limit reached or blocked
      }
    }
  }

  async addMessage(msg: ChatMessage): Promise<void> {
    const list = await this.getMessages();
    list.push(msg);
    await this.saveMessages(list);

    // Optional server synchronization behind env flag
    const shouldSync = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SYNC_CONVERSATIONS === 'true';
    if (shouldSync) {
      try {
        const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL as string) || 'http://localhost:8080';
        fetch(`${baseUrl}/conversations/session_default/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: msg.role,
            text: msg.text,
            payload: msg.cards ? { cardsCount: msg.cards.length } : undefined,
          }),
        }).catch(() => {});
      } catch {
        // Non-blocking sync error
      }
    }
  }

  async clear(): Promise<void> {
    this.inMemoryMessages = [];
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore error
      }
    }
  }

  hasGreetedInSession(): boolean {
    if (typeof sessionStorage !== 'undefined') {
      try {
        return sessionStorage.getItem(GREETED_KEY) === 'true';
      } catch {
        return this.hasGreetedMemory;
      }
    }
    return this.hasGreetedMemory;
  }

  markGreetedInSession(): void {
    this.hasGreetedMemory = true;
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(GREETED_KEY, 'true');
      } catch {
        // Ignore error
      }
    }
  }
}
