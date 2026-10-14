import type { Knex } from 'knex';

export interface LlmUsageRecord {
  id: string;
  provider: string;
  model: string;
  task: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: 'success' | 'error' | 'fallback';
  errorCode?: string;
  costEstimate: number;
  createdAt: string;
}

export interface ModelUsageSummary {
  provider: string;
  model: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgLatencyMs: number;
  totalCostEstimate: number;
}

export interface LlmUsageRepository {
  recordUsage(params: Omit<LlmUsageRecord, 'id' | 'createdAt'>): Promise<LlmUsageRecord>;
  getDailyCost(dateStr?: string): Promise<number>;
  getUsageSummary(days?: number): Promise<ModelUsageSummary[]>;
}

export class KnexLlmUsageRepository implements LlmUsageRepository {
  constructor(private knex: Knex) {}

  async recordUsage(params: Omit<LlmUsageRecord, 'id' | 'createdAt'>): Promise<LlmUsageRecord> {
    const id = `use_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    await this.knex('llm_usage').insert({
      id,
      provider: params.provider,
      model: params.model,
      task: params.task,
      input_tokens: params.inputTokens || 0,
      output_tokens: params.outputTokens || 0,
      latency_ms: params.latencyMs || 0,
      status: params.status,
      error_code: params.errorCode || null,
      cost_estimate: params.costEstimate || 0.0,
      created_at: now,
    });

    return {
      id,
      ...params,
      createdAt: now.toISOString(),
    };
  }

  async getDailyCost(dateStr?: string): Promise<number> {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

    const result = await this.knex('llm_usage')
      .whereBetween('created_at', [startOfDay, endOfDay])
      .sum('cost_estimate as totalCost')
      .first();

    return Number(result?.totalCost || 0);
  }

  async getUsageSummary(days: number = 7): Promise<ModelUsageSummary[]> {
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await this.knex('llm_usage')
      .where('created_at', '>=', sinceDate)
      .select('provider', 'model')
      .count('* as totalCalls')
      .select(
        this.knex.raw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as successfulCalls', ['success']),
        this.knex.raw('SUM(CASE WHEN status != ? THEN 1 ELSE 0 END) as failedCalls', ['success'])
      )
      .sum('input_tokens as totalInputTokens')
      .sum('output_tokens as totalOutputTokens')
      .avg('latency_ms as avgLatencyMs')
      .sum('cost_estimate as totalCostEstimate')
      .groupBy('provider', 'model');

    return rows.map((r: any) => ({
      provider: r.provider,
      model: r.model,
      totalCalls: Number(r.totalCalls || 0),
      successfulCalls: Number(r.successfulCalls || 0),
      failedCalls: Number(r.failedCalls || 0),
      totalInputTokens: Number(r.totalInputTokens || 0),
      totalOutputTokens: Number(r.totalOutputTokens || 0),
      avgLatencyMs: Math.round(Number(r.avgLatencyMs || 0)),
      totalCostEstimate: Math.round(Number(r.totalCostEstimate || 0) * 10000) / 10000,
    }));
  }
}
