import type { ModelDefinition } from '../types.js';

/**
 * EDITABLE MODEL CATALOG
 * Official model identifiers with pricing (per 1k tokens in USD), capabilities,
 * context windows, rate limits, and daily token budgets.
 */
export const MODEL_CATALOG: Record<string, ModelDefinition> = {
  // ==========================================
  // GOOGLE GEMINI MODELS
  // ==========================================
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    provider: 'gemini',
    modelName: 'gemini-1.5-flash', // Official Gemini Flash
    tier: 'fast',
    capabilities: ['vision', 'json_mode', 'streaming', 'embeddings'],
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    costPer1kInputUsd: 0.000075,
    costPer1kOutputUsd: 0.0003,
    rateLimits: { tpm: 1000000, rpm: 15 },
    dailyTokenBudget: 5000000,
    enabled: true,
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    provider: 'gemini',
    modelName: 'gemini-1.5-pro', // Official Gemini Pro
    tier: 'advanced',
    capabilities: ['vision', 'json_mode', 'streaming', 'embeddings'],
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    costPer1kInputUsd: 0.00125,
    costPer1kOutputUsd: 0.005,
    rateLimits: { tpm: 360000, rpm: 2 },
    dailyTokenBudget: 1000000,
    enabled: true,
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    provider: 'gemini',
    modelName: 'gemini-2.0-flash', // Next-gen Flash model
    tier: 'fast',
    capabilities: ['vision', 'json_mode', 'streaming'],
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    costPer1kInputUsd: 0.0001,
    costPer1kOutputUsd: 0.0004,
    rateLimits: { tpm: 1000000, rpm: 15 },
    dailyTokenBudget: 3000000,
    enabled: true,
  },

  // ==========================================
  // OPENAI & COMPATIBLE MODELS
  // ==========================================
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: 'openai',
    modelName: 'gpt-4o-mini', // Official lightweight GPT-4o
    tier: 'fast',
    capabilities: ['vision', 'json_mode', 'streaming', 'embeddings'],
    contextWindow: 128000,
    maxOutputTokens: 16384,
    costPer1kInputUsd: 0.00015,
    costPer1kOutputUsd: 0.0006,
    rateLimits: { tpm: 200000, rpm: 500 },
    dailyTokenBudget: 2000000,
    enabled: true,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    modelName: 'gpt-4o', // Flagship multimodal
    tier: 'advanced',
    capabilities: ['vision', 'json_mode', 'streaming', 'embeddings'],
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInputUsd: 0.0025,
    costPer1kOutputUsd: 0.01,
    rateLimits: { tpm: 80000, rpm: 100 },
    dailyTokenBudget: 500000,
    enabled: true,
  },

  // ==========================================
  // ANTHROPIC CLAUDE MODELS
  // ==========================================
  'claude-3-5-haiku': {
    id: 'claude-3-5-haiku',
    provider: 'anthropic',
    modelName: 'claude-3-5-haiku-20241022', // Official Claude 3.5 Haiku
    tier: 'fast',
    capabilities: ['json_mode', 'streaming'],
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInputUsd: 0.0008,
    costPer1kOutputUsd: 0.004,
    rateLimits: { tpm: 100000, rpm: 50 },
    dailyTokenBudget: 1000000,
    enabled: true,
  },
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet',
    provider: 'anthropic',
    modelName: 'claude-3-5-sonnet-20241022', // Official Claude 3.5 Sonnet
    tier: 'advanced',
    capabilities: ['vision', 'json_mode', 'streaming'],
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInputUsd: 0.003,
    costPer1kOutputUsd: 0.015,
    rateLimits: { tpm: 80000, rpm: 50 },
    dailyTokenBudget: 500000,
    enabled: true,
  },
};

export function getModelById(modelId: string): ModelDefinition | undefined {
  return MODEL_CATALOG[modelId];
}
