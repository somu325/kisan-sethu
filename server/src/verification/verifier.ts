import { getPesticideKnowledgeRepository } from '../db/index.js';
import { logger } from '../logger.js';

export interface ExtractedRecommendation {
  cropName: string;
  problemName: string;
  chemicalName: string;
  dosePerAcre: number;
  doseUnit: string;
  waitingPeriodDays?: number;
  evidenceQuote: string;
  sourceUrl: string;
}

export interface VerificationResult {
  verified: boolean;
  status: 'VERIFIED' | 'REJECTED' | 'NEEDS_EXPERT_REVIEW';
  reasons: string[];
}

export class SafetyVerifier {
  /**
   * Verifies an LLM extraction against safety rules, grounding text, and government registries.
   * Strictly abstains by default if any check fails.
   */
  async verifyRecommendation(
    rec: ExtractedRecommendation,
    retrievedContent: string
  ): Promise<VerificationResult> {
    const reasons: string[] = [];

    // 1. Evidence quote match: The quote cited by the model must appear in retrieved source text
    const cleanQuote = rec.evidenceQuote.trim().toLowerCase().replace(/\s+/g, ' ');
    const cleanSource = retrievedContent.trim().toLowerCase().replace(/\s+/g, ' ');

    if (!cleanQuote || !cleanSource.includes(cleanQuote)) {
      reasons.push('EVIDENCE_MISMATCH: The model output cited a quote not found in the verified source text.');
    }

    // 2. Check if product is legally banned on this crop
    const db = getPesticideKnowledgeRepository();
    const banCheck = await db.isProductBanned(rec.chemicalName, rec.cropName);
    if (banCheck.banned) {
      reasons.push(`BANNED_SUBSTANCE: ${rec.chemicalName} is prohibited on ${rec.cropName} (${banCheck.reason})`);
    }

    // 3. Check CIBRC registration
    const isRegistered = await db.isProductRegistered(rec.chemicalName, rec.cropName);
    if (!isRegistered) {
      reasons.push(`REGISTRATION_MISSING: ${rec.chemicalName} is not found on CIBRC registered label claim list for ${rec.cropName}`);
    }

    // 4. Dose bounds safety check
    if (rec.dosePerAcre <= 0 || rec.dosePerAcre > 5000) {
      reasons.push(`UNSAFE_DOSAGE: Dose of ${rec.dosePerAcre} ${rec.doseUnit}/acre exceeds safe agronomic thresholds.`);
    }

    if (reasons.length > 0) {
      logger.warn({ rec, reasons }, 'Safety verification REJECTED recommendation');
      return {
        verified: false,
        status: 'REJECTED',
        reasons,
      };
    }

    return {
      verified: true,
      status: 'VERIFIED',
      reasons: ['Passed verbatim evidence match, CIBRC registration, and non-banned check.'],
    };
  }
}

export const verifier = new SafetyVerifier();
