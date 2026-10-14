import test from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { circuitBreaker, withExponentialBackoff } from '../llm/router/fallback.js';
import { budgetTracker } from '../llm/router/budget.js';
import { MODEL_CATALOG } from '../llm/registry/models.config.js';
import { verifier } from '../verification/verifier.js';
import { isDomainAllowed } from '../retrieval/allowlist.js';

test('1. Circuit Breaker: Tracks consecutive failures and trips after threshold', () => {
  const modelId = 'test-model-cb';
  assert.strictEqual(circuitBreaker.isAvailable(modelId), true);

  // 1st and 2nd failure
  circuitBreaker.recordFailure(modelId, new Error('429 Too Many Requests'));
  assert.strictEqual(circuitBreaker.isAvailable(modelId), true);
  circuitBreaker.recordFailure(modelId, new Error('429 Too Many Requests'));
  assert.strictEqual(circuitBreaker.isAvailable(modelId), true);

  // 3rd failure trips the breaker
  circuitBreaker.recordFailure(modelId, new Error('500 Internal Error'));
  assert.strictEqual(circuitBreaker.isAvailable(modelId), false, 'Circuit should be open after 3 failures');

  // Reset on success
  circuitBreaker.recordSuccess(modelId);
  assert.strictEqual(circuitBreaker.isAvailable(modelId), true, 'Circuit should close on success');
});

test('2. Exponential Backoff: Retries on transient errors and succeeds', async () => {
  let attempts = 0;
  const testOp = async () => {
    attempts++;
    if (attempts < 2) {
      const err: any = new Error('Rate limit');
      err.status = 429;
      throw err;
    }
    return 'success_payload';
  };

  const res = await withExponentialBackoff(testOp, {
    maxRetries: 2,
    initialDelayMs: 10,
    modelId: 'test-retry-model',
  });

  assert.strictEqual(res, 'success_payload');
  assert.strictEqual(attempts, 2, 'Should succeed on attempt 2');
});

test('3. Budget Tracker: 80% daily budget scale-down trigger', () => {
  const testModel = {
    ...MODEL_CATALOG['gemini-1.5-flash'],
    id: 'test-budget-model',
    dailyTokenBudget: 10000,
  };

  assert.strictEqual(budgetTracker.isNearBudget(testModel), false);

  // Record 5000 tokens (50%)
  budgetTracker.recordUsage(testModel.id, 5000);
  assert.strictEqual(budgetTracker.isNearBudget(testModel), false);

  // Record 3500 more tokens (85%)
  budgetTracker.recordUsage(testModel.id, 3500);
  assert.strictEqual(budgetTracker.isNearBudget(testModel), true, 'Should trigger scale-down at >=80%');
});

test('4. Safety Verifier: Verbatim quote matching and banned substance checks', async () => {
  const sourceText = 'Apply Thiamethoxam 25% WG at 50 grams per acre for effective control of thrips in chilli.';

  // Case A: Valid quote and dosage
  const validRec = {
    cropName: 'Chilli',
    problemName: 'Thrips',
    chemicalName: 'Thiamethoxam',
    dosePerAcre: 50,
    doseUnit: 'g',
    evidenceQuote: 'Apply Thiamethoxam 25% WG at 50 grams per acre',
    sourceUrl: 'https://cibrc.nic.in/advisory',
  };

  // Case B: Phantom quote hallucinated by model
  const hallucinatedRec = {
    ...validRec,
    evidenceQuote: 'Apply 1500 grams of chemical immediately',
  };

  const checkHallucination = await verifier.verifyRecommendation(hallucinatedRec, sourceText);
  assert.strictEqual(checkHallucination.verified, false);
  assert.ok(checkHallucination.reasons.some((r) => r.includes('EVIDENCE_MISMATCH')));

  // Case C: Unsafe high dosage
  const unsafeDoseRec = {
    ...validRec,
    dosePerAcre: 15000, // 15kg / acre!
  };
  const checkDose = await verifier.verifyRecommendation(unsafeDoseRec, sourceText);
  assert.strictEqual(checkDose.verified, false);
  assert.ok(checkDose.reasons.some((r) => r.includes('UNSAFE_DOSAGE')));
});

test('5. Retrieval Allowlist: Restricts sources strictly to trusted government & university domains', () => {
  assert.strictEqual(isDomainAllowed('https://cibrc.nic.in/major_uses.pdf'), true);
  assert.strictEqual(isDomainAllowed('https://angrau.ac.in/bulletin'), true);
  assert.strictEqual(isDomainAllowed('https://agmarknet.gov.in/price_bulletin'), true);

  // Untrusted external blogs or random commercial websites
  assert.strictEqual(isDomainAllowed('https://random-farmer-blog.xyz/chemicals'), false);
  assert.strictEqual(isDomainAllowed('https://unverified-forum.com/thread'), false);
});

test('6. Structured Output Validation: Zod schema parsing and type enforcement', () => {
  const SampleSchema = z.object({
    intent: z.enum(['NEAREST_MANDI', 'UNKNOWN']),
    confidence: z.number().min(0).max(1),
  });

  const validJson = { intent: 'NEAREST_MANDI', confidence: 0.95 };
  const parsed = SampleSchema.parse(validJson);
  assert.strictEqual(parsed.intent, 'NEAREST_MANDI');
  assert.strictEqual(parsed.confidence, 0.95);

  const invalidJson = { intent: 'INVALID_TYPE', confidence: 5 };
  assert.throws(() => SampleSchema.parse(invalidJson));
});
