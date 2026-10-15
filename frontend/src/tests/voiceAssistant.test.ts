import test from 'node:test';
import assert from 'node:assert';
import { haversineDistanceKm, expandSearchRadius } from '../features/voiceAssistant/utils/distance.ts';
import { RuleBasedIntentRouter } from '../features/voiceAssistant/router/IntentRouter.ts';
import { NearestMandiHandler } from '../features/voiceAssistant/handlers/NearestMandiHandler.ts';
import { FallbackHandler } from '../features/voiceAssistant/handlers/FallbackHandler.ts';
import { MockMarketRepository } from '../data/mockMarketRepository.ts';
import { setMarketRepository } from '../data/marketDataSource.ts';

test('1. Distance Utility: Haversine distance calculations', () => {
  // Guntur (16.3067, 80.4365) to Vijayawada (16.5062, 80.6480)
  const distGunturVijayawada = haversineDistanceKm(16.3067, 80.4365, 16.5062, 80.6480);
  assert.ok(
    distGunturVijayawada >= 30 && distGunturVijayawada <= 36,
    `Expected distance between 30 and 36 km, got ${distGunturVijayawada}`
  );

  // Identical coordinates must be 0
  const zeroDist = haversineDistanceKm(16.3067, 80.4365, 16.3067, 80.4365);
  assert.strictEqual(zeroDist, 0, 'Distance between identical points must be 0');
});

test('2. Radius Expansion: Automatically steps 10km -> 25km -> 50km -> 100km', async () => {
  // Case A: Result found at 10km
  const res10 = await expandSearchRadius([10, 25, 50, 100], async (r) => {
    return r >= 10 ? ['Mandi A'] : [];
  });
  assert.strictEqual(res10.effectiveRadiusKm, 10);
  assert.deepStrictEqual(res10.results, ['Mandi A']);

  // Case B: Result found only at 50km
  const res50 = await expandSearchRadius([10, 25, 50, 100], async (r) => {
    return r >= 50 ? ['Mandi B'] : [];
  });
  assert.strictEqual(res50.effectiveRadiusKm, 50);
  assert.deepStrictEqual(res50.results, ['Mandi B']);

  // Case C: No results even at 100km
  const resEmpty = await expandSearchRadius([10, 25, 50, 100], async () => {
    return [];
  });
  assert.strictEqual(resEmpty.effectiveRadiusKm, 100);
  assert.strictEqual(resEmpty.results.length, 0);
});

test('3. Intent Router: Multilingual recognition (EN, HI, TE) and out-of-scope queries', async () => {
  const router = new RuleBasedIntentRouter();

  // English queries
  const enQueries = [
    'nearest mandi',
    'mandi near me',
    'where is the nearest market?',
    'find closest mandi',
    'nearby apmc yard',
  ];
  for (const q of enQueries) {
    const res = await router.route(q, 'en');
    assert.strictEqual(res.intent, 'NEAREST_MANDI', `Query "${q}" should route to NEAREST_MANDI`);
    assert.ok(res.confidence > 0.8);
  }

  // Hindi queries
  const hiQueries = [
    'पास की मंडी कहाँ है',
    'नजदीकी मंडी',
    'मंडी किधर है',
    'पास की मंडी',
    'निकटतम मंडी',
  ];
  for (const q of hiQueries) {
    const res = await router.route(q, 'hi');
    assert.strictEqual(res.intent, 'NEAREST_MANDI', `Query "${q}" should route to NEAREST_MANDI`);
    assert.ok(res.confidence > 0.8);
  }

  // Telugu queries
  const teQueries = [
    'మా దగ్గర మండి ఎక్కడ ఉంది',
    'దగ్గర్లోని మండి',
    'సమీప మార్కెట్',
    'మార్కెట్ ఎక్కడ ఉంది',
  ];
  for (const q of teQueries) {
    const res = await router.route(q, 'te');
    assert.strictEqual(res.intent, 'NEAREST_MANDI', `Query "${q}" should route to NEAREST_MANDI`);
    assert.ok(res.confidence > 0.8);
  }

  // Out-of-scope / unrelated queries
  const unrelatedQueries = [
    'how to make tea',
    'cricket score today',
    'play music',
    'tell me a joke',
  ];
  for (const q of unrelatedQueries) {
    const res = await router.route(q, 'en');
    assert.strictEqual(res.intent, 'UNKNOWN', `Query "${q}" should route to UNKNOWN`);
  }
});

test('4. NearestMandiHandler: Queries mock repository, returns sorted top 3 cards with short speech', async () => {
  setMarketRepository(new MockMarketRepository());
  const handler = new NearestMandiHandler();

  // Test with Guntur location
  const response = await handler.handle({
    rawText: 'nearest mandi',
    language: 'en',
    location: {
      id: 'guntur',
      name: { en: 'Guntur', hi: 'गुंटूर', te: 'గుంటూరు' },
      state: { en: 'Andhra Pradesh', hi: 'आंध्र प्रदेश', te: 'ఆంధ్రప్రదేశ్' },
      district: { en: 'Guntur', hi: 'गुंटूर', te: 'గుంటూరు' },
      mandiName: { en: 'Guntur Mirchi Yard', hi: 'गुंटूर मिर्ची यार्ड', te: 'గుంటూరు మిర్చి యార్డ్' },
      pincode: '522001',
    },
  });

  assert.ok(response.chatMessages.length > 0, 'Expected at least 1 chat message');
  const msg = response.chatMessages[0];
  assert.ok(msg.cards && msg.cards.length > 0, 'Expected mandi cards in response');
  assert.ok(msg.cards.length <= 3, 'Expected at most 3 cards');

  // Check card properties
  const firstCard = msg.cards[0];
  assert.ok(firstCard.name, 'Card must have name');
  assert.ok(firstCard.type === 'APMC' || firstCard.type === 'MANDI', 'Card must have type badge');
  assert.ok(typeof firstCard.distanceKm === 'number', 'Card must have numerical distance');
  assert.ok(firstCard.latitude && firstCard.longitude, 'Card must have GPS coordinates');

  // Verify speech is concise and grounded in data
  assert.ok(response.speechText.includes(firstCard.name), 'Speech must include the nearest mandi name');
  assert.ok(!response.speechText.includes('http'), 'Speech must not include URLs');
  assert.ok(!response.speechText.includes('undefined'), 'Speech must not have undefined');
});

test('5. FallbackHandler: Polite guidance and nearest mandi chip', async () => {
  const handler = new FallbackHandler();
  const response = await handler.handle({
    rawText: 'what is the weather',
    language: 'en',
  });

  assert.ok(response.chatMessages.length > 0);
  const msg = response.chatMessages[0];
  assert.ok(msg.text.includes('nearest mandi'), 'Expected fallback to mention nearest mandi');
  assert.ok(msg.actions && msg.actions.some((a) => a.actionType === 'query'), 'Expected quick action chip');
});
