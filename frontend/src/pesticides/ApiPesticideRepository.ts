/**
 * API implementation of PesticideKnowledgeRepository.
 * Proxies calls through backend FastAPI service (/v1/pesticide/*),
 * shielding the frontend from LLM keys and providing offline local fallback.
 */

import type {
  PesticideKnowledgeRepository,
  SprayRequestParams,
} from './PesticideKnowledgeRepository';
import type {
  CropItem,
  CropProblem,
  SprayAdvisoryResult,
  VerifiedRecommendationItem,
  CandidateDiagnosisItem,
} from './types';
import { LocalPesticideRepository } from './LocalPesticideRepository';
import { calculateSprayPlan } from './dosageCalculator';

const API_BASE_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

export class ApiPesticideRepository implements PesticideKnowledgeRepository {
  private localFallback = new LocalPesticideRepository();

  async getVerifiedRecommendation(key: string): Promise<VerifiedRecommendationItem | null> {
    return this.localFallback.getVerifiedRecommendation(key);
  }

  async getCachedRecommendation(key: string): Promise<SprayAdvisoryResult | null> {
    return this.localFallback.getCachedRecommendation(key);
  }

  async saveRecommendation(key: string, result: SprayAdvisoryResult): Promise<void> {
    return this.localFallback.saveRecommendation(key, result);
  }

  async getProductPrice(productIdOrAi: string): Promise<{ pricePerUnit: number; unit: string } | null> {
    return this.localFallback.getProductPrice(productIdOrAi);
  }

  async getCropList(): Promise<CropItem[]> {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return this.localFallback.getCropList();
      }
      const res = await fetch(`${API_BASE_URL}/v1/pesticide/crops-and-problems`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.crops || this.localFallback.getCropList();
    } catch {
      return this.localFallback.getCropList();
    }
  }

  async getProblemsForCrop(cropId: string): Promise<CropProblem[]> {
    return this.localFallback.getProblemsForCrop(cropId);
  }

  async getRegisteredProducts(): Promise<any[]> {
    return this.localFallback.getRegisteredProducts();
  }

  async getBannedProducts(): Promise<string[]> {
    return this.localFallback.getBannedProducts();
  }

  async getSprayRecommendation(params: SprayRequestParams): Promise<SprayAdvisoryResult> {
    const { crop, stage, soil, problem, mode, pumpSizeL, acres, state, district } = params;
    const cacheKey = `${crop}:${stage || ''}:${soil || ''}:${problem}:${mode}:${state || ''}`.toLowerCase();

    // 1. Check local cache first
    const cached = await this.localFallback.getCachedRecommendation(cacheKey);
    if (cached) {
      if (cached.recommendation) {
        const priceInfo = await this.localFallback.getProductPrice(cached.recommendation.active_ingredient);
        const plan = calculateSprayPlan({
          dosePerLitre: cached.recommendation.dose_per_litre,
          dosePerAcre: cached.recommendation.dose_per_acre,
          doseUnit: cached.recommendation.dose_unit,
          waterPerAcreL: cached.recommendation.water_per_acre_l,
          pumpSizeL,
          acres,
          pricePerUnit: priceInfo?.pricePerUnit,
        });
        return { ...cached, sprayPlan: plan, isCached: true };
      }
      return cached;
    }

    // 2. If offline, use local repository directly
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return this.localFallback.getSprayRecommendation(params);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/v1/pesticide/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop,
          growth_stage: stage,
          soil_type: soil,
          problem,
          mode,
          pump_size_l: pumpSizeL,
          acres,
          state: state || 'andhra_pradesh',
          district,
        }),
      });

      if (!res.ok) {
        throw new Error(`Backend error: ${res.status}`);
      }

      const data = await res.json();
      const result: SprayAdvisoryResult = {
        abstain: data.abstain,
        abstainReason: data.abstain_reason,
        helplineNumber: data.helpline_number || '1800-180-1551',
        sourcesFound: data.sources_found || [],
        recommendation: data.recommendation,
        sprayPlan: data.spray_plan
          ? {
              chemicalPerTank: data.spray_plan.chemical_per_tank,
              totalPumps: data.spray_plan.total_pumps,
              totalWaterL: data.spray_plan.total_water_l,
              totalChemicalQty: data.spray_plan.total_chemical_qty,
              estimatedCost: data.spray_plan.estimated_cost,
              estimatedCostFormatted: data.spray_plan.estimated_cost_text,
            }
          : undefined,
        verificationChecksPassed: data.verification_checks_passed,
        verificationFailures: data.verification_failures,
        conflictingSources: data.conflicting_sources,
      };

      await this.localFallback.saveRecommendation(cacheKey, result);
      return result;
    } catch (err) {
      console.warn('Backend proxy unavailable, falling back to local pesticide repository:', err);
      return this.localFallback.getSprayRecommendation(params);
    }
  }

  async diagnosePhoto(imageBase64: string, cropHint?: string): Promise<CandidateDiagnosisItem[]> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return this.localFallback.diagnosePhoto(imageBase64, cropHint);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/v1/pesticide/diagnose-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageBase64,
          crop: cropHint,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return this.localFallback.diagnosePhoto(imageBase64, cropHint);
    }
  }

  async reportWrongRecommendation(report: {
    crop: string;
    problem: string;
    mode: string;
    reportedIssue: string;
  }): Promise<boolean> {
    try {
      await fetch(`${API_BASE_URL}/v1/pesticide/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch {
      // Offline fallback logs locally
      await this.localFallback.reportWrongRecommendation(report);
    }
    return true;
  }
}
