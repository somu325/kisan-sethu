/**
 * Repository interface for Pesticide Knowledge and Spray Advisories.
 * Decouples the UI entirely from whether data comes from LocalStorage, SQLite, or backend APIs.
 */

import type {
  CropItem,
  CropProblem,
  SprayAdvisoryResult,
  VerifiedRecommendationItem,
  CandidateDiagnosisItem,
} from './types';

export interface SprayRequestParams {
  crop: string;
  stage?: string;
  soil?: string;
  problem: string;
  mode: 'chemical' | 'organic';
  pumpSizeL: number;
  acres: number;
  state?: string;
  district?: string;
}

export interface PesticideKnowledgeRepository {
  /**
   * Look up ground-truth verified recommendation by compound key
   * key = `${crop}:${stage}:${soil}:${problem}:${mode}:${state}` or `${crop}:${problem}:${mode}:${state}`
   */
  getVerifiedRecommendation(key: string): Promise<VerifiedRecommendationItem | null>;

  /**
   * Get cached recommendation from local storage (with expiry)
   */
  getCachedRecommendation(key: string): Promise<SprayAdvisoryResult | null>;

  /**
   * Persist recommendation into local cache with timestamp
   */
  saveRecommendation(key: string, result: SprayAdvisoryResult): Promise<void>;

  /**
   * Price lookup for a registered active ingredient / product
   */
  getProductPrice(productIdOrAi: string): Promise<{ pricePerUnit: number; unit: string } | null>;

  /**
   * Get list of Indian crops supported by the advisory system
   */
  getCropList(): Promise<CropItem[]>;

  /**
   * Get target pests and diseases for a specific crop
   */
  getProblemsForCrop(cropId: string): Promise<CropProblem[]>;

  /**
   * Get registered CIB&RC products
   */
  getRegisteredProducts(): Promise<any[]>;

  /**
   * Get banned and prohibited active ingredients
   */
  getBannedProducts(): Promise<string[]>;

  /**
   * Main recommendation dispatch (retrieves, verifies, and calculates spray plan)
   */
  getSprayRecommendation(params: SprayRequestParams): Promise<SprayAdvisoryResult>;

  /**
   * Screen plant leaf photo (returns top 3 candidates; never returns dosages)
   */
  diagnosePhoto(imageBase64: string, cropHint?: string): Promise<CandidateDiagnosisItem[]>;

  /**
   * Report an incorrect recommendation for expert KVK review
   */
  reportWrongRecommendation(report: {
    crop: string;
    problem: string;
    mode: string;
    reportedIssue: string;
  }): Promise<boolean>;
}
