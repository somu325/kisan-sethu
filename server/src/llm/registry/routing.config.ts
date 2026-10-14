import type { LLMCapability, LLMTask, LLMTier } from '../types.js';

export interface TaskRoutingConfig {
  preferredTier: LLMTier;
  requiredCapabilities: LLMCapability[];
  modelChain: string[]; // Ordered list of model IDs to attempt
}

/**
 * Task-to-Model Routing Configuration
 * Maps each task to an ordered fallback chain across providers.
 */
export const TASK_ROUTING_CONFIG: Record<LLMTask, TaskRoutingConfig> = {
  intent_classification: {
    preferredTier: 'fast',
    requiredCapabilities: ['json_mode'],
    modelChain: ['gemini-1.5-flash', 'gpt-4o-mini', 'claude-3-5-haiku'],
  },
  answer_extraction: {
    preferredTier: 'balanced',
    requiredCapabilities: ['json_mode'],
    modelChain: ['gemini-1.5-flash', 'gpt-4o-mini', 'claude-3-5-sonnet'],
  },
  pesticide_extraction: {
    preferredTier: 'balanced',
    requiredCapabilities: ['json_mode'],
    modelChain: ['gemini-1.5-pro', 'gpt-4o', 'claude-3-5-sonnet'],
  },
  image_diagnosis: {
    preferredTier: 'advanced',
    requiredCapabilities: ['vision', 'json_mode'],
    modelChain: ['gemini-1.5-flash', 'gpt-4o', 'gemini-1.5-pro', 'claude-3-5-sonnet'],
  },
  conversation_reply: {
    preferredTier: 'fast',
    requiredCapabilities: [],
    modelChain: ['gemini-1.5-flash', 'gpt-4o-mini', 'claude-3-5-haiku'],
  },
};
