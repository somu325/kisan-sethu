import { config } from '../../config.js';
import { getLlmUsageRepository } from '../../db/index.js';
import type { ModelDefinition } from '../types.js';
import { logger } from '../../logger.js';

interface ModelMinuteCounter {
  minuteTimestamp: number;
  tokens: number;
  requests: number;
}

interface ModelDailyCounter {
  dateStr: string;
  tokens: number;
}

export class LLMBudgetTracker {
  private minuteCounters: Map<string, ModelMinuteCounter> = new Map();
  private dailyCounters: Map<string, ModelDailyCounter> = new Map();

  private getMinuteKey(modelId: string): string {
    return modelId;
  }

  recordUsage(modelId: string, tokens: number) {
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Minute counter
    let minCounter = this.minuteCounters.get(modelId);
    if (!minCounter || minCounter.minuteTimestamp !== currentMinute) {
      minCounter = { minuteTimestamp: currentMinute, tokens: 0, requests: 0 };
      this.minuteCounters.set(modelId, minCounter);
    }
    minCounter.tokens += tokens;
    minCounter.requests += 1;

    // 2. Daily counter
    let dayCounter = this.dailyCounters.get(modelId);
    if (!dayCounter || dayCounter.dateStr !== todayStr) {
      dayCounter = { dateStr: todayStr, tokens: 0 };
      this.dailyCounters.set(modelId, dayCounter);
    }
    dayCounter.tokens += tokens;
  }

  isRateLimited(model: ModelDefinition): boolean {
    const currentMinute = Math.floor(Date.now() / 60000);
    const counter = this.minuteCounters.get(model.id);

    if (!counter || counter.minuteTimestamp !== currentMinute) {
      return false;
    }

    if (counter.requests >= model.rateLimits.rpm) {
      logger.warn({ modelId: model.id, rpm: counter.requests }, 'Model exceeded requests/min rate limit');
      return true;
    }

    if (counter.tokens >= model.rateLimits.tpm) {
      logger.warn({ modelId: model.id, tpm: counter.tokens }, 'Model exceeded tokens/min rate limit');
      return true;
    }

    return false;
  }

  isNearBudget(model: ModelDefinition): boolean {
    const todayStr = new Date().toISOString().split('T')[0];
    const counter = this.dailyCounters.get(model.id);
    if (!counter || counter.dateStr !== todayStr) return false;

    // True if >= 80% of daily budget is consumed
    return counter.tokens >= model.dailyTokenBudget * 0.8;
  }

  isBudgetExhausted(model: ModelDefinition): boolean {
    const todayStr = new Date().toISOString().split('T')[0];
    const counter = this.dailyCounters.get(model.id);
    if (!counter || counter.dateStr !== todayStr) return false;

    return counter.tokens >= model.dailyTokenBudget;
  }

  async isCostCapExceeded(): Promise<boolean> {
    try {
      const repo = getLlmUsageRepository();
      const dailyCost = await repo.getDailyCost();
      return dailyCost >= config.LLM_DAILY_COST_CAP_USD;
    } catch {
      return false;
    }
  }
}

export const budgetTracker = new LLMBudgetTracker();
