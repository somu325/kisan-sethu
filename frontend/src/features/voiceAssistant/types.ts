/**
 * Core types for KisanSetu Voice Assistant module.
 */

import type { Language, LocationOption } from '../../types/index.ts';

export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface MandiCardData {
  id: string;
  name: string;
  type: 'APMC' | 'MANDI';
  distanceKm: number;
  address?: string;
  district?: string;
  state?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  openingHours?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  actionType: 'query' | 'open_location' | 'open_map' | 'call';
  payload?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  speechText?: string;
  timestamp: number;
  cards?: MandiCardData[];
  actions?: QuickAction[];
}

export type IntentType = 'NEAREST_MANDI' | 'UNKNOWN';

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  normalizedText?: string;
}

export interface IntentHandlerContext {
  rawText: string;
  language: Language;
  location?: LocationOption;
  userCoords?: { lat: number; lng: number };
}

export interface IntentHandlerResponse {
  chatMessages: ChatMessage[];
  speechText: string;
  actions?: QuickAction[];
}

export interface IntentHandler {
  handle(ctx: IntentHandlerContext): Promise<IntentHandlerResponse>;
}
