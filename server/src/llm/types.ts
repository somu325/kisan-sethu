import { z } from 'zod';

export type LLMCapability = 'vision' | 'json_mode' | 'streaming' | 'embeddings';

export type LLMTier = 'fast' | 'balanced' | 'advanced';

export type LLMTask =
  | 'intent_classification'
  | 'answer_extraction'
  | 'pesticide_extraction'
  | 'image_diagnosis'
  | 'conversation_reply';

export interface ModelDefinition {
  id: string; // e.g. 'gemini-1.5-flash'
  provider: 'gemini' | 'openai' | 'anthropic';
  modelName: string; // Official provider model identifier
  tier: LLMTier;
  capabilities: LLMCapability[];
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInputUsd: number;
  costPer1kOutputUsd: number;
  rateLimits: {
    tpm: number; // Tokens per minute
    rpm: number; // Requests per minute
  };
  dailyTokenBudget: number;
  enabled: boolean;
}

export interface GenerateRequest {
  task: LLMTask;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  modelOverride?: string;
}

export interface GenerateStructuredRequest<T> {
  task: LLMTask;
  prompt: string;
  schema: z.ZodSchema<T>;
  systemInstruction?: string;
  temperature?: number;
  modelOverride?: string;
}

export interface AnalyzeImageRequest {
  task: LLMTask;
  prompt: string;
  imageBase64: string;
  mimeType: string;
  systemInstruction?: string;
  modelOverride?: string;
}

export interface LLMResponse {
  text: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costEstimateUsd: number;
}

export interface LLMStructuredResponse<T> extends LLMResponse {
  data: T;
}

export interface LLMProvider {
  readonly name: 'gemini' | 'openai' | 'anthropic';
  isConfigured(): boolean;
  getCapabilities(modelId: string): LLMCapability[];
  generate(req: GenerateRequest, model: ModelDefinition): Promise<LLMResponse>;
  generateStructured<T>(
    req: GenerateStructuredRequest<T>,
    model: ModelDefinition
  ): Promise<LLMStructuredResponse<T>>;
  stream(req: GenerateRequest, model: ModelDefinition): AsyncIterable<string>;
  analyzeImage(req: AnalyzeImageRequest, model: ModelDefinition): Promise<LLMResponse>;
  embed(text: string, model: ModelDefinition): Promise<number[]>;
}
