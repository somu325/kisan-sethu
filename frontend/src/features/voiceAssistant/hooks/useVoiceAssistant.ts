/**
 * Master hook for KisanSetu Voice Assistant.
 * Coordinates Speech-to-Text, Text-to-Speech, Intent Routing, and Conversation History.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Language, LocationOption } from '../../../types/index.ts';
import type { AssistantState, ChatMessage } from '../types';
import { WebSpeechToTextService, type SpeechToTextService } from '../services/SpeechToTextService';
import { WebTextToSpeechService, type TextToSpeechService } from '../services/TextToSpeechService';
import { RuleBasedIntentRouter, type IntentRouter } from '../router/IntentRouter';
import { IntentRegistry } from '../handlers/IntentRegistry';
import { NearestMandiHandler } from '../handlers/NearestMandiHandler';
import { FallbackHandler } from '../handlers/FallbackHandler';
import { LocalConversationRepository, type ConversationRepository } from '../repository/ConversationRepository';
import { translations } from '../../../data/i18n';

export interface UseVoiceAssistantOptions {
  language: Language;
  location?: LocationOption;
  userCoords?: { lat: number; lng: number };
  autoGreetOnMount?: boolean;
}

export interface UseVoiceAssistantReturn {
  messages: ChatMessage[];
  state: AssistantState;
  transcript: string;
  error: string | null;
  isPermissionDenied: boolean;
  isSttSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  sendText: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  replay: (messageId: string) => void;
  clearHistory: () => Promise<void>;
}

export function useVoiceAssistant({
  language,
  location,
  userCoords,
  autoGreetOnMount = true,
}: UseVoiceAssistantOptions): UseVoiceAssistantReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<AssistantState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);

  // Services & Repositories (Singleton refs)
  const sttRef = useRef<SpeechToTextService>(new WebSpeechToTextService());
  const ttsRef = useRef<TextToSpeechService>(new WebTextToSpeechService());
  const routerRef = useRef<IntentRouter>(new RuleBasedIntentRouter());
  const repoRef = useRef<ConversationRepository>(new LocalConversationRepository());
  const registryRef = useRef<IntentRegistry>(new IntentRegistry());

  // Language & Location refs to avoid stale closures in event handlers
  const langRef = useRef(language);
  langRef.current = language;

  const locRef = useRef(location);
  locRef.current = location;

  const coordsRef = useRef(userCoords);
  coordsRef.current = userCoords;

  // Initialize Intent Handlers
  useEffect(() => {
    const reg = registryRef.current;
    reg.registerHandler('NEAREST_MANDI', new NearestMandiHandler());
    reg.registerHandler('UNKNOWN', new FallbackHandler());
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    ttsRef.current.stop();
    setState((prev) => (prev === 'speaking' ? 'idle' : prev));
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    sttRef.current.stop();
    setState((prev) => (prev === 'listening' ? 'idle' : prev));
  }, []);

  // Process text through router and handler
  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      stopSpeaking();
      stopListening();
      setError(null);
      setTranscript('');
      setState('thinking');

      // 1. Append user message
      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        text: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const next = [...prev, userMsg];
        repoRef.current.saveMessages(next);
        return next;
      });

      try {
        // 2. Classify intent
        const routeResult = await routerRef.current.route(trimmed, langRef.current);

        // 3. Resolve handler
        let handler = registryRef.current.getHandler(routeResult.intent);
        if (!handler) {
          handler = registryRef.current.getHandler('UNKNOWN');
        }

        // 4. Execute handler
        const response = await handler!.handle({
          rawText: trimmed,
          language: langRef.current,
          location: locRef.current,
          userCoords: coordsRef.current,
        });

        // 5. Append assistant messages
        setMessages((prev) => {
          const next = [...prev, ...response.chatMessages];
          repoRef.current.saveMessages(next);
          return next;
        });

        // 6. Speak response
        if (response.speechText) {
          setState('speaking');
          ttsRef.current.speak(response.speechText, {
            language: langRef.current,
            onStart: () => setState('speaking'),
            onEnd: () => setState('idle'),
            onError: () => setState('idle'),
          });
        } else {
          setState('idle');
        }
      } catch (err: any) {
        console.warn('Voice assistant execution error:', err);
        setError('Error processing request.');
        setState('idle');
      }
    },
    [stopSpeaking, stopListening]
  );

  // Start listening (mic tap)
  const startListening = useCallback(() => {
    // If speaking, tapping mic stops speech and starts listening
    stopSpeaking();
    setError(null);
    setTranscript('');
    setIsPermissionDenied(false);

    sttRef.current.start({
      language: langRef.current,
      onStart: () => {
        setState('listening');
      },
      onInterimResult: (partialText) => {
        setTranscript(partialText);
      },
      onFinalResult: (finalText) => {
        setTranscript(finalText);
        sendText(finalText);
      },
      onError: (err, isPermission) => {
        setState('idle');
        if (isPermission) {
          setIsPermissionDenied(true);
        } else if (err === 'no-speech') {
          setError(translations[langRef.current]?.assistantNothingHeard || 'Nothing heard.');
        } else {
          setError(err);
        }
      },
      onEnd: () => {
        setState((prev) => (prev === 'listening' ? 'idle' : prev));
      },
    });
  }, [stopSpeaking, sendText]);

  // Replay a message
  const replay = useCallback((messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg || !msg.speechText) return;

    ttsRef.current.stop();
    setState('speaking');
    ttsRef.current.speak(msg.speechText, {
      language: langRef.current,
      onStart: () => setState('speaking'),
      onEnd: () => setState('idle'),
      onError: () => setState('idle'),
    });
  }, [messages]);

  // Clear chat history
  const clearHistory = useCallback(async () => {
    await repoRef.current.clear();
    setMessages([]);
  }, []);

  // Initial load: restore messages and trigger session greeting if needed
  useEffect(() => {
    let isMounted = true;

    async function init() {
      const history = await repoRef.current.getMessages();
      if (!isMounted) return;

      const t = translations[language] || translations.en;
      const greetingText = t.assistantGreeting;

      if (history.length === 0) {
        const initialMsg: ChatMessage = {
          id: `greet_${Date.now()}`,
          role: 'assistant',
          text: greetingText,
          speechText: greetingText,
          timestamp: Date.now(),
          actions: [
            {
              id: 'chip_nearest_mandi',
              label: t.nearestMandiChip,
              actionType: 'query',
              payload: t.nearestMandiChip,
            },
          ],
        };
        setMessages([initialMsg]);
        await repoRef.current.saveMessages([initialMsg]);

        // Speak greeting once per session
        if (autoGreetOnMount && !repoRef.current.hasGreetedInSession()) {
          repoRef.current.markGreetedInSession();
          setState('speaking');
          ttsRef.current.speak(greetingText, {
            language,
            onStart: () => setState('speaking'),
            onEnd: () => setState('idle'),
            onError: () => setState('idle'),
          });
        }
      } else {
        setMessages(history);
      }
    }

    init();

    return () => {
      isMounted = false;
      ttsRef.current.stop();
      sttRef.current.stop();
    };
  }, [language, autoGreetOnMount]);

  return {
    messages,
    state,
    transcript,
    error,
    isPermissionDenied,
    isSttSupported: sttRef.current.isSupported(),
    startListening,
    stopListening,
    sendText,
    stopSpeaking,
    replay,
    clearHistory,
  };
}
