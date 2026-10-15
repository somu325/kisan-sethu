/**
 * Text-To-Speech (TTS) service interface and Web Speech Synthesis implementation.
 */

import type { Language } from '../../../types/index.ts';

export interface TextToSpeechOptions {
  language: Language;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

export interface TextToSpeechService {
  isSupported(): boolean;
  speak(text: string, options: TextToSpeechOptions): void;
  stop(): void;
  isSpeaking(): boolean;
}

export class WebTextToSpeechService implements TextToSpeechService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voicesCache: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voicesCache = window.speechSynthesis.getVoices() || [];
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  isSpeaking(): boolean {
    if (!this.isSupported()) return false;
    return window.speechSynthesis.speaking || this.currentUtterance !== null;
  }

  stop(): void {
    if (!this.isSupported()) return;
    try {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    } catch {
      // Ignore cancel error
    }
  }

  speak(text: string, options: TextToSpeechOptions): void {
    if (!this.isSupported() || !text.trim()) {
      options.onEnd?.();
      return;
    }

    this.stop();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      const localeMap: Record<Language, string> = {
        hi: 'hi-IN',
        te: 'te-IN',
        en: 'en-IN',
      };
      const targetLocale = localeMap[options.language] || 'en-IN';
      utterance.lang = targetLocale;
      utterance.rate = options.rate ?? 0.95;
      utterance.pitch = options.pitch ?? 1.0;

      // Select best matched voice if available
      if (this.voicesCache.length === 0) {
        this.loadVoices();
      }

      const matchedVoice = this.voicesCache.find((v) =>
        v.lang.toLowerCase().replace('_', '-').startsWith(targetLocale.toLowerCase())
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        options.onStart?.();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        options.onEnd?.();
      };

      utterance.onerror = (e) => {
        this.currentUtterance = null;
        options.onError?.(e);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      options.onError?.(err);
      options.onEnd?.();
    }
  }
}
