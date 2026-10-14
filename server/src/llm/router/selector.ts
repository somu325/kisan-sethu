import { config } from '../../config.js';
import { MODEL_CATALOG, getModelById } from '../registry/models.config.js';
import { TASK_ROUTING_CONFIG } from '../registry/routing.config.js';
import { circuitBreaker } from './fallback.js';
import { budgetTracker } from './budget.js';
import type { LLMCapability, LLMProvider, LLMTask, ModelDefinition } from '../types.js';
import { GeminiProvider } from '../providers/gemini.js';
import { OpenAIProvider } from '../providers/openai.js';
import { AnthropicProvider } from '../providers/anthropic.js';
import { logger } from '../../logger.js';

export class LLMSelector {
  private providers: Map<string, LLMProvider> = new Map();

  constructor() {
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('anthropic', new AnthropicProvider());
  }

  getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Selects an ordered list of viable models to attempt in sequence for a task.
   */
  async selectModelsForTask(
    task: LLMTask,
    requiredCapOverride?: LLMCapability[]
  ): Promise<{ model: ModelDefinition; provider: LLMProvider }[]> {
    // Check global daily cost cap
    if (await budgetTracker.isCostCapExceeded()) {
      logger.warn('Global daily cost cap exceeded for LLM calls');
      throw new Error('LLM_DAILY_COST_CAP_EXCEEDED: Global budget reached. Falling back to non-LLM operations.');
    }

    const taskConfig = TASK_ROUTING_CONFIG[task] || {
      preferredTier: 'fast',
      requiredCapabilities: [],
      modelChain: ['gemini-1.5-flash', 'gpt-4o-mini', 'claude-3-5-haiku'],
    };

    const requiredCaps = requiredCapOverride || taskConfig.requiredCapabilities;

    // Check force override
    if (config.LLM_FORCE_MODEL) {
      const forceModel = getModelById(config.LLM_FORCE_MODEL);
      if (forceModel) {
        const prov = this.getProvider(forceModel.provider);
        if (prov && prov.isConfigured()) {
          return [{ model: forceModel, provider: prov }];
        }
      }
    }

    const candidates: { model: ModelDefinition; provider: LLMProvider }[] = [];

    for (const modelId of taskConfig.modelChain) {
      const model = getModelById(modelId);
      if (!model || !model.enabled) continue;

      const provider = this.getProvider(model.provider);
      if (!provider || !provider.isConfigured()) continue;

      // Capability check
      const hasAllCaps = requiredCaps.every((c) => model.capabilities.includes(c));
      if (!hasAllCaps) continue;

      // Circuit breaker check
      if (!circuitBreaker.isAvailable(model.id)) {
        logger.info({ modelId: model.id }, 'Skipping model due to open circuit breaker');
        continue;
      }

      // Rate limit and budget checks
      if (budgetTracker.isRateLimited(model)) {
        logger.info({ modelId: model.id }, 'Skipping model due to minute rate limit');
        continue;
      }

      if (budgetTracker.isBudgetExhausted(model)) {
        logger.info({ modelId: model.id }, 'Skipping model due to exhausted daily token budget');
        continue;
      }

      candidates.push({ model, provider });
    }

    // Scale DOWN behavior: If the first candidate is near 80% budget, check if a cheaper candidate exists
    if (candidates.length > 1 && budgetTracker.isNearBudget(candidates[0].model)) {
      logger.info(
        { modelId: candidates[0].model.id },
        'Model is at >=80% daily budget. Scaling DOWN to alternative candidate in chain.'
      );
      // Move 80% model to the end of the candidate list
      const first = candidates.shift()!;
      candidates.push(first);
    }

    if (candidates.length === 0) {
      throw new Error(
        `NO_VIABLE_LLM_MODEL: No configured, healthy provider with required capabilities found for task: ${task}`
      );
    }

    return candidates;
  }
}

export const selector = new LLMSelector();
