# KisanSetu Swappable LLM Layer

The `server/src/llm/` directory provides a **provider-agnostic, quota-aware LLM gateway** for KisanSetu. No business logic or feature code is tied to any specific model SDK or vendor.

---

## 1. Supported Providers

1. **Google Gemini** (`gemini`): Uses REST endpoints for Gemini 1.5 Flash, 1.5 Pro, and 2.0.
2. **OpenAI & Compatible** (`openai`): Supports official OpenAI (`gpt-4o`, `gpt-4o-mini`), Groq, Ollama, DeepSeek, and any endpoint via `OPENAI_BASE_URL`.
3. **Anthropic** (`anthropic`): Supports Claude 3.5 Haiku and Sonnet.

---

## 2. Model Catalog (`registry/models.config.ts`)

Models are configured as pure data entries:
```typescript
'gemini-1.5-flash': {
  id: 'gemini-1.5-flash',
  provider: 'gemini',
  modelName: 'gemini-1.5-flash',
  tier: 'fast',
  capabilities: ['vision', 'json_mode', 'streaming', 'embeddings'],
  contextWindow: 1048576,
  maxOutputTokens: 8192,
  costPer1kInputUsd: 0.000075,
  costPer1kOutputUsd: 0.0003,
  rateLimits: { tpm: 1000000, rpm: 15 },
  dailyTokenBudget: 5000000,
  enabled: true,
}
```

---

## 3. Dynamic Routing & Automatic Failover

### Tasks & Fallback Chains (`registry/routing.config.ts`)
Each task specifies required capabilities and an ordered chain of models:
```typescript
intent_classification: {
  preferredTier: 'fast',
  requiredCapabilities: ['json_mode'],
  modelChain: ['gemini-1.5-flash', 'gpt-4o-mini', 'claude-3-5-haiku']
}
```

### Quota, Budget & Resilience Policies:
1. **Circuit Breaker**: After 3 consecutive HTTP 429/5xx errors, a model is skipped for a 60-second cooldown period.
2. **Exponential Backoff**: Transient errors are retried up to 2 times with exponential delay before failing over to the next provider.
3. **80% Budget Scale-Down**: When a model consumes >= 80% of its `dailyTokenBudget`, the router dynamically scales down to a cheaper capable alternative in the chain.
4. **Global Daily Cost Cap**: When cumulative spend across all providers hits `LLM_DAILY_COST_CAP_USD` (from the `llm_usage` database table), the gateway rejects expensive queries with a clear budget notification and preserves critical offline fallback features.
5. **Response Caching**: Deterministic caching keyed by task and input with TTL (default 1 hour) using the database `response_cache` table.

---

## 4. How to Add a New Provider

1. Create `server/src/llm/providers/newprovider.ts` implementing `LLMProvider`.
2. Register the instance in `server/src/llm/router/selector.ts`.
3. Add model definitions into `server/src/llm/registry/models.config.ts`.
4. Add the provider's API key to `.env` and `config.ts`.
