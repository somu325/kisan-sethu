/**
 * Types for Pesticide & Spray Dosage module.
 */

import type { Language } from '../types';

export type TreatmentMode = 'chemical' | 'organic';
export type GrowthStage = 'seedling' | 'vegetative' | 'flowering' | 'fruiting';
export type SoilType = 'red' | 'black' | 'sandy' | 'loamy' | 'clay' | 'alluvial';

export interface CropProblem {
  id: string;
  name: Record<Language, string>;
  type: 'pest' | 'disease' | 'weed' | 'deficiency';
}

export interface CropItem {
  id: string;
  name: Record<Language, string>;
  icon: string;
  defaultSoil?: SoilType;
  stages: GrowthStage[];
  problems: CropProblem[];
}

export interface SourceCitationItem {
  publisher: string;
  source_url: string;
  published_or_accessed_date: string;
  evidence_quote: string;
}

export interface VerifiedRecommendationItem {
  product: string;
  formulation: string;
  trade_name?: string;
  active_ingredient: string;
  chemical_group: string;
  target_pest: string;
  dose_per_litre?: number;
  dose_per_acre?: number;
  dose_unit: string;
  water_per_acre_l: number;
  spray_interval_days?: string;
  max_sprays?: number;
  phi_days?: number;
  reentry_period_hours?: number;
  mode_of_action_group: string;
  safety_precautions: string;
  organic_alternative?: string;
  badge: 'Verified (expert-reviewed)' | 'From official source';
  evidence_quote: string;
  source_url: string;
  publisher: string;
  published_or_accessed_date: string;
}

export interface SprayAdvisoryResult {
  abstain: boolean;
  abstainReason?: string;
  helplineNumber: string;
  sourcesFound: SourceCitationItem[];
  recommendation?: VerifiedRecommendationItem;
  sprayPlan?: {
    chemicalPerTank: string;
    totalPumps: number;
    totalWaterL: number;
    totalChemicalQty: string;
    estimatedCost?: number | null;
    estimatedCostFormatted?: string | null;
  };
  verificationChecksPassed?: string[];
  verificationFailures?: string[];
  conflictingSources?: Array<{ source: string; claimed_dose: string }>;
  isCached?: boolean;
}

export interface CandidateDiagnosisItem {
  problem_name: string;
  category: 'pest' | 'disease' | 'deficiency' | 'weed';
  confidence: number;
  symptoms_observed: string;
  what_to_verify: string;
}

export interface SprayWeatherAlert {
  shouldAvoidSpraying: boolean;
  severity: 'normal' | 'caution' | 'warning';
  title: Record<Language, string>;
  description: Record<Language, string>;
  suggestedWindow: Record<Language, string>;
  rainExpectedNext48h: boolean;
  highWindSpeedKmh?: number;
}
