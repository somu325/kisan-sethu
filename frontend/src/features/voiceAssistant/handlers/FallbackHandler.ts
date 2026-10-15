/**
 * Fallback Handler for 'UNKNOWN' or unsupported intents in Phase 1.
 * Provides a polite message and shows the 'Nearest mandi' chip.
 */

import type { IntentHandler, IntentHandlerContext, IntentHandlerResponse } from '../types.ts';
import { translations } from '../../../data/i18n.ts';

export class FallbackHandler implements IntentHandler {
  async handle(ctx: IntentHandlerContext): Promise<IntentHandlerResponse> {
    const t = translations[ctx.language] || translations.en;

    const message = t.assistantFallbackText;
    const speech = t.assistantFallbackSpeech;

    return {
      chatMessages: [
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          text: message,
          speechText: speech,
          timestamp: Date.now(),
          actions: [
            {
              id: 'act_nearest_mandi',
              label: t.nearestMandiChip,
              actionType: 'query',
              payload: t.nearestMandiChip,
            },
          ],
        },
      ],
      speechText: speech,
      actions: [
        {
          id: 'act_nearest_mandi',
          label: t.nearestMandiChip,
          actionType: 'query',
          payload: t.nearestMandiChip,
        },
      ],
    };
  }
}
