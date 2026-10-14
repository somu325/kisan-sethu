import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import knex, { type Knex } from 'knex';
import { up, down } from '../db/migrations/001_initial_schema.js';
import { seed } from '../db/seeds/seedData.js';
import { KnexMarketRepository } from '../db/repositories/marketRepository.js';
import { KnexConversationRepository } from '../db/repositories/conversationRepository.js';
import { KnexLlmUsageRepository } from '../db/repositories/llmUsageRepository.js';
import { KnexCacheRepository } from '../db/repositories/cacheRepository.js';
import { KnexPesticideKnowledgeRepository } from '../db/repositories/pesticideKnowledgeRepository.js';

async function runRepositorySuite(name: string, getDbInstance: () => Promise<Knex | null>) {
  test(`DB Repository Contract Suite [${name}]`, async (t) => {
    const db = await getDbInstance();
    if (!db) {
      t.skip(`Skipping ${name} (connection not configured)`);
      return;
    }

    // Setup fresh schema and seeds
    await down(db).catch(() => {});
    await up(db);
    await seed(db);

    const marketRepo = new KnexMarketRepository(db);
    const convRepo = new KnexConversationRepository(db);
    const llmRepo = new KnexLlmUsageRepository(db);
    const cacheRepo = new KnexCacheRepository(db);
    const pesticideRepo = new KnexPesticideKnowledgeRepository(db);

    // 1. Market Repository Tests
    await t.test('1. MarketRepository: getNearby finds APMC & Mandi in Guntur within 25km', async () => {
      // Guntur (16.3067, 80.4365)
      const nearby = await marketRepo.getNearby(16.3067, 80.4365, 25);
      assert.ok(nearby.length >= 2, 'Should find at least 2 markets near Guntur');
      assert.strictEqual(nearby[0].distanceKm <= nearby[1].distanceKm, true, 'Results must be sorted by distance');
      assert.ok(nearby.some((m) => m.name.includes('Guntur')), 'Should contain Guntur market');

      // Test type filter
      const onlyApmc = await marketRepo.getNearby(16.3067, 80.4365, 25, 'APMC');
      assert.ok(onlyApmc.length > 0);
      assert.ok(onlyApmc.every((m) => m.type === 'APMC'), 'Must contain only APMC');
    });

    await t.test('2. MarketRepository: getById and getAll', async () => {
      const guntur = await marketRepo.getById('mkt-guntur-apmc-1');
      assert.ok(guntur, 'Market should exist');
      assert.strictEqual(guntur?.district, 'Guntur');
      assert.strictEqual(guntur?.type, 'APMC');

      const searchResults = await marketRepo.getAll({ search: 'Tirupati' });
      assert.ok(searchResults.length >= 2, 'Should find Tirupati markets');
    });

    // 2. Conversation Repository Tests
    await t.test('3. ConversationRepository: full lifecycle with messages and feedback', async () => {
      const conv = await convRepo.createConversation('te');
      assert.ok(conv.id.startsWith('conv_'));
      assert.strictEqual(conv.language, 'te');

      const userMsg = await convRepo.addMessage({
        conversationId: conv.id,
        role: 'user',
        text: 'దగ్గర్లోని మండి ఎక్కడ ఉంది?',
        intent: 'NEAREST_MANDI',
      });
      assert.ok(userMsg.id.startsWith('msg_'));

      const assistantMsg = await convRepo.addMessage({
        conversationId: conv.id,
        role: 'assistant',
        text: 'మీకు సమీప మండి గుంటూరు మిర్చి యార్డ్.',
        intent: 'NEAREST_MANDI',
        payload: { nearestCount: 3 },
      });

      const messages = await convRepo.getMessages(conv.id);
      assert.strictEqual(messages.length, 2);
      assert.strictEqual(messages[0].text, 'దగ్గర్లోని మండి ఎక్కడ ఉంది?');
      assert.deepStrictEqual(messages[1].payload, { nearestCount: 3 });

      const fb = await convRepo.addFeedback(assistantMsg.id, true, 'Accurate mandi location');
      assert.strictEqual(fb.helpful, true);
    });

    // 3. LLM Usage Repository Tests
    await t.test('4. LlmUsageRepository: records usage and computes aggregate metrics', async () => {
      await llmRepo.recordUsage({
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        task: 'intent_classification',
        inputTokens: 120,
        outputTokens: 25,
        latencyMs: 340,
        status: 'success',
        costEstimate: 0.0001,
      });

      await llmRepo.recordUsage({
        provider: 'openai',
        model: 'gpt-4o-mini',
        task: 'answer_extraction',
        inputTokens: 450,
        outputTokens: 110,
        latencyMs: 580,
        status: 'success',
        costEstimate: 0.0005,
      });

      const summary = await llmRepo.getUsageSummary(1);
      assert.ok(summary.length >= 2, 'Should have entries for gemini and openai');
      const dailyCost = await llmRepo.getDailyCost();
      assert.ok(dailyCost > 0, 'Daily cost should be positive');
    });

    // 4. Cache Repository Tests
    await t.test('5. CacheRepository: set, get, and TTL expiration', async () => {
      await cacheRepo.set('test_key', { foo: 'bar', timestamp: 12345 }, 3600);
      const cached = await cacheRepo.get('test_key');
      assert.deepStrictEqual(cached, { foo: 'bar', timestamp: 12345 });

      // Expired key test
      await cacheRepo.set('expired_key', { dead: true }, -10);
      const expiredResult = await cacheRepo.get('expired_key');
      assert.strictEqual(expiredResult, null, 'Expired key should return null');
    });

    // 5. Pesticide Knowledge Repository Tests
    await t.test('6. PesticideKnowledgeRepository: crops, problems, verified recs, and banned check', async () => {
      const crops = await pesticideRepo.getCrops();
      assert.ok(crops.length >= 4, 'Should load sample crops');
      const chilli = crops.find((c) => c.id === 'crop-chilli');
      assert.ok(chilli, 'Chilli crop must exist');

      const problems = await pesticideRepo.getProblems('crop-chilli');
      assert.ok(problems.length >= 2, 'Chilli must have problems');

      const recs = await pesticideRepo.getVerifiedRecommendations('crop-chilli', 'prob-chilli-thrips');
      assert.ok(recs.length >= 1, 'Should return verified recommendations');
      assert.ok(recs[0].product.tradeName, 'Must have trade name');

      const banned = await pesticideRepo.isProductBanned('Monocrotophos', 'Chilli');
      assert.strictEqual(banned.banned, true, 'Monocrotophos should be flagged as banned on Chilli');
    });

    // Cleanup
    await db.destroy();
  });
}

// 1. Run for SQLite
const testSqlitePath = path.resolve(process.cwd(), './data/test_kisansetu.db');
if (fs.existsSync(testSqlitePath)) {
  fs.unlinkSync(testSqlitePath);
}

runRepositorySuite('SQLite', async () => {
  return knex({
    client: 'sqlite3',
    connection: { filename: testSqlitePath },
    useNullAsDefault: true,
  });
});

// 2. Run for PostgreSQL (only if DATABASE_URL or TEST_POSTGRES_URL is set)
const pgUrl = process.env.TEST_POSTGRES_URL || (process.env.DB_PROVIDER === 'postgres' ? process.env.DATABASE_URL : undefined);
runRepositorySuite('PostgreSQL', async () => {
  if (!pgUrl) return null;
  return knex({
    client: 'pg',
    connection: pgUrl,
    pool: { min: 1, max: 5 },
  });
});
