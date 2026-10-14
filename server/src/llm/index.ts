import crypto from 'crypto';
import { config } from '../config.js';
import { selector } from './router/selector.js';
import { withExponentialBackoff } from './router/fallback.js';
import { budgetTracker } from './router/budget.js';
import { getCacheRepository, getLlmUsageRepository } from '../db/index.js';
import type {
  AnalyzeImageRequest,
  GenerateRequest,
  GenerateStructuredRequest,
  LLMResponse,
  LLMStructuredResponse,
} from './types.js';
import { logger } from '../logger.js';

function computeCacheKey(prefix: string, data: any): string {
  const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').substring(0, 16);
  return `${prefix}:${hash}`;
}

export class LLMGateway {
  /**
   * Generates text response using swappable provider with automatic failover.
   */
  async generate(req: GenerateRequest): Promise<LLMResponse> {
    const cacheKey = computeCacheKey(`llm_gen:${req.task}`, req);

    if (config.LLM_CACHE_ENABLED) {
      try {
        const cached = await getCacheRepository().get<LLMResponse>(cacheKey);
        if (cached) {
          logger.debug({ task: req.task }, 'Returning cached LLM response');
          return cached;
        }
      } catch {
        // Cache miss
      }
    }

    const candidates = await selector.selectModelsForTask(req.task);
    const usageRepo = getLlmUsageRepository();

    let lastError: any = null;

    for (const { model, provider } of candidates) {
      try {
        logger.info({ task: req.task, model: model.id, provider: provider.name }, 'Attempting LLM call');
        const response = await withExponentialBackoff(
          () => provider.generate(req, model),
          { modelId: model.id }
        );

        // Record usage in DB and budget tracker
        budgetTracker.recordUsage(model.id, response.inputTokens + response.outputTokens);
        await usageRepo.recordUsage({
          provider: provider.name,
          model: model.id,
          task: req.task,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          latencyMs: response.latencyMs,
          status: 'success',
          costEstimate: response.costEstimateUsd,
        });

        if (config.LLM_CACHE_ENABLED) {
          await getCacheRepository().set(cacheKey, response, config.LLM_CACHE_TTL_SECONDS);
        }

        return response;
      } catch (err: any) {
        lastError = err;
        logger.warn(
          { model: model.id, err: err.message },
          'Model invocation failed. Logging fallback attempt...'
        );

        await usageRepo.recordUsage({
          provider: provider.name,
          model: model.id,
          task: req.task,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: 0,
          status: 'fallback',
          errorCode: err?.status?.toString() || err?.code || 'ERROR',
          costEstimate: 0,
        });
      }
    }

    throw new Error(`All LLM models in fallback chain failed for task ${req.task}. Last error: ${lastError?.message}`);
  }

  /**
   * Generates structured output validated with Zod.
   */
  async generateStructured<T>(req: GenerateStructuredRequest<T>): Promise<LLMStructuredResponse<T>> {
    const cacheKey = computeCacheKey(`llm_struct:${req.task}`, { prompt: req.prompt, task: req.task });

    if (config.LLM_CACHE_ENABLED) {
      try {
        const cached = await getCacheRepository().get<LLMStructuredResponse<T>>(cacheKey);
        if (cached) {
          logger.debug({ task: req.task }, 'Returning cached structured LLM response');
          return cached;
        }
      } catch {
        // Cache miss
      }
    }

    const candidates = await selector.selectModelsForTask(req.task, ['json_mode']);
    const usageRepo = getLlmUsageRepository();

    let lastError: any = null;

    for (const { model, provider } of candidates) {
      try {
        logger.info({ task: req.task, model: model.id, provider: provider.name }, 'Attempting structured LLM call');
        const response = await withExponentialBackoff(
          () => provider.generateStructured(req, model),
          { modelId: model.id }
        );

        budgetTracker.recordUsage(model.id, response.inputTokens + response.outputTokens);
        await usageRepo.recordUsage({
          provider: provider.name,
          model: model.id,
          task: req.task,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          latencyMs: response.latencyMs,
          status: 'success',
          costEstimate: response.costEstimateUsd,
        });

        if (config.LLM_CACHE_ENABLED) {
          await getCacheRepository().set(cacheKey, response, config.LLM_CACHE_TTL_SECONDS);
        }

        return response;
      } catch (err: any) {
        lastError = err;
        logger.warn({ model: model.id, err: err.message }, 'Structured model invocation failed, falling back...');

        await usageRepo.recordUsage({
          provider: provider.name,
          model: model.id,
          task: req.task,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: 0,
          status: 'fallback',
          errorCode: err?.status?.toString() || err?.code || 'ERROR',
          costEstimate: 0,
        });
      }
    }

    throw new Error(`All structured models failed. Last error: ${lastError?.message}`);
  }

  /**
   * Multimodal vision analysis.
   */
  async analyzeImage(req: AnalyzeImageRequest): Promise<LLMResponse> {
    const candidates = await selector.selectModelsForTask(req.task, ['vision']);
    const usageRepo = getLlmUsageRepository();

    for (const { model, provider } of candidates) {
      try {
        const response = await withExponentialBackoff(
          () => provider.analyzeImage(req, model),
          { modelId: model.id }
        );

        budgetTracker.recordUsage(model.id, response.inputTokens + response.outputTokens);
        await usageRepo.recordUsage({
          provider: provider.name,
          model: model.id,
          task: req.task,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          latencyMs: response.latencyMs,
          status: 'success',
          costEstimate: response.costEstimateUsd,
        });

        return response;
      } catch (err: any) {
        logger.warn({ model: model.id, err: err.message }, 'Vision model invocation failed');
      }
    }

    throw new Error('All vision models failed to process image');
  }

  /**
   * Generates embedding vectors.
   */
  async embed(text: string): Promise<number[]> {
    const candidates = await selector.selectModelsForTask('intent_classification', ['embeddings']);
    for (const { model, provider } of candidates) {
      try {
        return await provider.embed(text, model);
      } catch (err: any) {
        logger.warn({ model: model.id, err: err.message }, 'Embedding call failed, attempting fallback');
      }
    }
    throw new Error('Embedding models unavailable');
  }
}

export const llm = new LLMGateway();
