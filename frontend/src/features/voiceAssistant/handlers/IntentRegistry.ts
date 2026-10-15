/**
 * Registry for Intent Handlers.
 * Allows adding new intents without altering UI components.
 */

import type { IntentHandler, IntentType } from '../types';

export class IntentRegistry {
  private handlers = new Map<IntentType, IntentHandler>();

  registerHandler(intent: IntentType, handler: IntentHandler): void {
    this.handlers.set(intent, handler);
  }

  getHandler(intent: IntentType): IntentHandler | undefined {
    return this.handlers.get(intent);
  }
}
