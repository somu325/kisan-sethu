/**
 * Speech-To-Text (STT) service interface and Web Speech API implementation.
 */

import type { Language } from '../../../types/index.ts';

export interface SpeechToTextOptions {
  language: Language;
  onStart?: () => void;
  onInterimResult?: (text: string) => void;
  onFinalResult: (text: string) => void;
  onError: (error: string, isPermissionDenied?: boolean) => void;
  onEnd: () => void;
}

export interface SpeechToTextService {
  isSupported(): boolean;
  start(options: SpeechToTextOptions): void;
  stop(): void;
  abort(): void;
}

export class WebSpeechToTextService implements SpeechToTextService {
  private recognition: any = null;
  private isListening = false;

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as any;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  start(options: SpeechToTextOptions): void {
    if (this.isListening) {
      this.stop();
    }

    if (!this.isSupported()) {
      options.onError('Speech recognition is not supported in this browser environment.');
      return;
    }

    try {
      const win = window as any;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionClass();

      // Regional Indian Locales
      const localeMap: Record<Language, string> = {
        hi: 'hi-IN',
        te: 'te-IN',
        en: 'en-IN',
      };
      this.recognition.lang = localeMap[options.language] || 'en-IN';
      this.recognition.interimResults = true;
      this.recognition.continuous = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        options.onStart?.();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        if (interimTranscript && options.onInterimResult) {
          options.onInterimResult(interimTranscript);
        }

        if (finalTranscript) {
          this.isListening = false;
          options.onFinalResult(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        const err = event.error || 'speech_recognition_error';
        const isPermission = err === 'not-allowed' || err === 'service-not-allowed';
        options.onError(err, isPermission);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        options.onEnd();
      };

      this.recognition.start();
    } catch (e: any) {
      this.isListening = false;
      options.onError(e?.message || 'Failed to start microphone');
    }
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore stop error
      }
    }
    this.isListening = false;
  }

  abort(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore abort error
      }
    }
    this.isListening = false;
  }
}
