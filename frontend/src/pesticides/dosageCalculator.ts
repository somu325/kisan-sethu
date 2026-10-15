/**
 * Pure mathematical calculation engine for spray tanks, chemical quantities, and costs.
 * Strictly deterministic, zero LLM reliance.
 */

export interface CalculateSprayPlanInput {
  dosePerLitre?: number;
  dosePerAcre?: number;
  doseUnit?: string; // 'g' | 'ml' | 'kg' | 'L'
  waterPerAcreL?: number; // defaults to 150 L
  pumpSizeL: number; // 15, 16, 20, 25 L
  acres: number; // e.g. 0.5, 1.0, 2.5, 10
  pricePerUnit?: number; // price per g or per ml; undefined hides cost
}

export interface SprayPlanResult {
  chemicalPerTank: string; // e.g. "5 g" or "37.5 ml"
  chemicalPerTankNumeric: number;
  totalPumps: number; // Math.ceil(totalWaterL / pumpSizeL)
  totalWaterL: number; // acres * waterPerAcreL
  totalChemicalQty: string; // e.g. "50 g" or "1.2 kg"
  totalChemicalNumeric: number;
  doseUnit: string;
  estimatedCost: number | null; // null if no price available
  estimatedCostFormatted: string | null;
}

export function calculateSprayPlan(input: CalculateSprayPlanInput): SprayPlanResult {
  const {
    dosePerLitre,
    dosePerAcre,
    doseUnit = 'g',
    waterPerAcreL = 150,
    pumpSizeL,
    acres,
    pricePerUnit,
  } = input;

  if (pumpSizeL <= 0) {
    throw new Error('Pump size must be greater than 0');
  }
  if (acres <= 0) {
    throw new Error('Acres must be greater than 0');
  }

  const safeWaterPerAcre = waterPerAcreL > 0 ? waterPerAcreL : 150;
  const totalWaterL = Math.round(acres * safeWaterPerAcre * 10) / 10;
  const totalPumps = Math.ceil(totalWaterL / pumpSizeL);

  let chemicalPerTankVal: number;
  let totalChemicalVal: number;

  if (dosePerLitre !== undefined && dosePerLitre > 0) {
    chemicalPerTankVal = Math.round(dosePerLitre * pumpSizeL * 100) / 100;
    totalChemicalVal = Math.round(chemicalPerTankVal * totalPumps * 10) / 10;
  } else if (dosePerAcre !== undefined && dosePerAcre > 0) {
    const pumpsPerAcre = safeWaterPerAcre / pumpSizeL;
    chemicalPerTankVal = Math.round((dosePerAcre / pumpsPerAcre) * 100) / 100;
    totalChemicalVal = Math.round(dosePerAcre * acres * 10) / 10;
  } else {
    // Sane nominal default
    chemicalPerTankVal = 5.0;
    totalChemicalVal = Math.round(5.0 * totalPumps * 10) / 10;
  }

  // Format unit representations (e.g. >= 1000g -> kg, >= 1000ml -> L)
  const normUnit = doseUnit.toLowerCase();
  let totalChemicalQtyStr: string;

  if (normUnit === 'g') {
    if (totalChemicalVal >= 1000) {
      totalChemicalQtyStr = `${Math.round((totalChemicalVal / 1000) * 100) / 100} kg`;
    } else {
      totalChemicalQtyStr = `${totalChemicalVal} g`;
    }
  } else if (normUnit === 'ml') {
    if (totalChemicalVal >= 1000) {
      totalChemicalQtyStr = `${Math.round((totalChemicalVal / 1000) * 100) / 100} L`;
    } else {
      totalChemicalQtyStr = `${totalChemicalVal} ml`;
    }
  } else {
    totalChemicalQtyStr = `${totalChemicalVal} ${doseUnit}`;
  }

  // Cost estimation: ONLY when pricePerUnit is defined, otherwise null
  let estimatedCost: number | null = null;
  let estimatedCostFormatted: string | null = null;

  if (pricePerUnit !== undefined && pricePerUnit > 0) {
    estimatedCost = Math.round(totalChemicalVal * pricePerUnit);
    const costPerAcre = Math.round(estimatedCost / Math.max(0.5, acres));
    estimatedCostFormatted = `~₹${estimatedCost} (~₹${costPerAcre}/acre)`;
  }

  return {
    chemicalPerTank: `${chemicalPerTankVal} ${doseUnit}`,
    chemicalPerTankNumeric: chemicalPerTankVal,
    totalPumps,
    totalWaterL,
    totalChemicalQty: totalChemicalQtyStr,
    totalChemicalNumeric: totalChemicalVal,
    doseUnit,
    estimatedCost,
    estimatedCostFormatted,
  };
}
