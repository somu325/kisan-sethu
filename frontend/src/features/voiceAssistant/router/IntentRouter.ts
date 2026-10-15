/**
 * Multilingual Intent Router for KisanSetu Voice Assistant.
 * Translates speech/text into intents: NEAREST_MANDI | UNKNOWN.
 */

import type { Language } from '../../../types/index.ts';
import type { IntentResult } from '../types.ts';

export interface IntentRouter {
  route(text: string, language: Language): Promise<IntentResult>;
}

export class RuleBasedIntentRouter implements IntentRouter {
  /**
   * Cleans and normalizes punctuation, multiple spaces, and case.
   */
  private normalize(input: string): string {
    return input
      .toLowerCase()
      .replace(/[?.,!;:।'"]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async route(text: string, _language: Language): Promise<IntentResult> {
    const clean = this.normalize(text);
    if (!clean) {
      return { intent: 'UNKNOWN', confidence: 0, normalizedText: clean };
    }

    // 1. English patterns
    const englishPatterns = [
      /nearest\s+mandi/,
      /mandi\s+near\s+me/,
      /nearest\s+market/,
      /market\s+near\s+me/,
      /where\s+(is|are)\s+(the\s+)?(nearest\s+)?(mandi|market)/,
      /closest\s+(mandi|market)/,
      /nearby\s+(mandi|market|apmc)/,
      /apmc\s+near/,
      /find\s+(nearest\s+)?(mandi|market)/,
      /near\s+mandi/,
    ];

    for (const pat of englishPatterns) {
      if (pat.test(clean)) {
        return { intent: 'NEAREST_MANDI', confidence: 0.98, normalizedText: clean };
      }
    }

    // 2. Hindi patterns
    const hindiPatterns = [
      /पास\s+की\s+मंडी/,
      /नजदीकी\s+मंडी/,
      /निकटतम\s+मंडी/,
      /मंडी\s+(कहाँ|किधर|कहा|कहापर|कहाँपर)\s+है/,
      /मंडी\s+पास/,
      /मंडी\s+दिखाओ/,
      /मंडी\s+खोजो/,
      /आस\s*पास\s+की\s+मंडी/,
      /पास\s+मंडी/,
      /मंडी/,
    ];

    // Check specific multi-word match first
    for (const pat of hindiPatterns) {
      if (pat.test(clean)) {
        return { intent: 'NEAREST_MANDI', confidence: 0.95, normalizedText: clean };
      }
    }

    // 3. Telugu patterns
    const teluguPatterns = [
      /దగ్గర.*మండి/,
      /దగ్గర్లోని\s+మండి/,
      /సమీప.*మార్కెట్/,
      /సమీప.*మండి/,
      /మార్కెట్.*ఎక్కడ/,
      /మండి.*ఎక్కడ/,
      /మార్కెట్.*యార్డ్/,
      /మా\s+దగ్గర/,
      /మండి/,
      /మార్కెట్/,
    ];

    for (const pat of teluguPatterns) {
      if (pat.test(clean)) {
        return { intent: 'NEAREST_MANDI', confidence: 0.95, normalizedText: clean };
      }
    }

    // Unhandled queries fall back politely
    return { intent: 'UNKNOWN', confidence: 0.1, normalizedText: clean };
  }
}
