import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSprayPlan } from '../pesticides/dosageCalculator.ts';

test('1. Dosage Calculator: Thiamethoxam 25% WG per-litre calculation for 15L pump and 1 acre', () => {
  const plan = calculateSprayPlan({
    dosePerLitre: 0.33,
    waterPerAcreL: 150,
    pumpSizeL: 15,
    acres: 1.0,
    doseUnit: 'g',
    pricePerUnit: 2.8,
  });

  // 150L / 15L = 10 pumps
  assert.strictEqual(plan.totalPumps, 10);
  assert.strictEqual(plan.totalWaterL, 150);
  // 0.33 * 15 = 4.95g per tank (~5g)
  assert.strictEqual(plan.chemicalPerTank, '4.95 g');
  // Total qty: 4.95 * 10 = 49.5g (~50g)
  assert.strictEqual(plan.totalChemicalQty, '49.5 g');
  // Estimated cost: 49.5 * 2.8 = ~139
  assert.ok(plan.estimatedCost !== null && plan.estimatedCost > 0);
  assert.ok(plan.estimatedCostFormatted?.includes('₹'));
});

test('2. Dosage Calculator: All four pump sizes (15, 16, 20, 25 L)', () => {
  const p15 = calculateSprayPlan({ dosePerLitre: 0.3, waterPerAcreL: 200, pumpSizeL: 15, acres: 1 });
  const p16 = calculateSprayPlan({ dosePerLitre: 0.3, waterPerAcreL: 200, pumpSizeL: 16, acres: 1 });
  const p20 = calculateSprayPlan({ dosePerLitre: 0.3, waterPerAcreL: 200, pumpSizeL: 20, acres: 1 });
  const p25 = calculateSprayPlan({ dosePerLitre: 0.3, waterPerAcreL: 200, pumpSizeL: 25, acres: 1 });

  // 200 / 15 = 13.33 -> 14 pumps
  assert.strictEqual(p15.totalPumps, 14);
  // 200 / 16 = 12.5 -> 13 pumps
  assert.strictEqual(p16.totalPumps, 13);
  // 200 / 20 = 10 pumps
  assert.strictEqual(p20.totalPumps, 10);
  // 200 / 25 = 8 pumps
  assert.strictEqual(p25.totalPumps, 8);
});

test('3. Dosage Calculator: Fractional acres (0.5 acres, 2.5 acres)', () => {
  const pSmall = calculateSprayPlan({
    dosePerLitre: 0.5,
    waterPerAcreL: 160,
    pumpSizeL: 16,
    acres: 0.5,
    doseUnit: 'g',
  });
  // 0.5 * 160 = 80L; 80 / 16 = 5 pumps
  assert.strictEqual(pSmall.totalWaterL, 80);
  assert.strictEqual(pSmall.totalPumps, 5);

  const pMedium = calculateSprayPlan({
    dosePerLitre: 0.5,
    waterPerAcreL: 160,
    pumpSizeL: 16,
    acres: 2.5,
    doseUnit: 'g',
  });
  // 2.5 * 160 = 400L; 400 / 16 = 25 pumps
  assert.strictEqual(pMedium.totalWaterL, 400);
  assert.strictEqual(pMedium.totalPumps, 25);
});

test('4. Dosage Calculator: Per-Acre input mode (Chlorantraniliprole 60ml/acre)', () => {
  const plan = calculateSprayPlan({
    dosePerAcre: 60,
    waterPerAcreL: 200,
    pumpSizeL: 20,
    acres: 2,
    doseUnit: 'ml',
  });

  // Total water: 200 * 2 = 400L
  assert.strictEqual(plan.totalWaterL, 400);
  // Total pumps: 400 / 20 = 20 pumps
  assert.strictEqual(plan.totalPumps, 20);
  // Total chemical: 60ml * 2 acres = 120ml
  assert.strictEqual(plan.totalChemicalQty, '120 ml');
});

test('5. Dosage Calculator: Large area and Unit Conversion (g to kg, ml to L)', () => {
  // Mancozeb 500g/acre on 5 acres = 2500g -> 2.5 kg
  const planLarge = calculateSprayPlan({
    dosePerAcre: 500,
    waterPerAcreL: 200,
    pumpSizeL: 20,
    acres: 5,
    doseUnit: 'g',
  });
  assert.strictEqual(planLarge.totalChemicalQty, '2.5 kg');

  // Liquid: 600ml/acre on 3 acres = 1800ml -> 1.8 L
  const planLiquid = calculateSprayPlan({
    dosePerAcre: 600,
    waterPerAcreL: 200,
    pumpSizeL: 20,
    acres: 3,
    doseUnit: 'ml',
  });
  assert.strictEqual(planLiquid.totalChemicalQty, '1.8 L');
});

test('6. Dosage Calculator: Missing price hides cost instead of guessing', () => {
  const planNoPrice = calculateSprayPlan({
    dosePerLitre: 2.5,
    pumpSizeL: 15,
    acres: 1,
    // pricePerUnit omitted
  });
  assert.strictEqual(planNoPrice.estimatedCost, null);
  assert.strictEqual(planNoPrice.estimatedCostFormatted, null);
});
