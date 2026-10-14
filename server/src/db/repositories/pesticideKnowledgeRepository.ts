import type { Knex } from 'knex';

export interface DbCrop {
  id: string;
  nameEn: string;
  nameHi: string;
  nameTe: string;
  scientificName?: string;
}

export interface DbProblem {
  id: string;
  cropId: string;
  nameEn: string;
  nameHi: string;
  nameTe: string;
  problemType: 'pest' | 'disease' | 'weed';
  description?: string;
}

export interface DbProduct {
  id: string;
  tradeName: string;
  chemicalName: string;
  formulation: string;
  type: 'chemical' | 'organic';
  defaultDosePerLitre?: number;
  defaultWaterPerAcreL: number;
  doseUnit: string;
  estimatedPricePerUnit?: number;
}

export interface DbVerifiedRecommendation {
  id: string;
  cropId: string;
  problemId: string;
  product: DbProduct;
  dosePerAcre?: number;
  doseUnit: string;
  waterPerAcreL: number;
  waitingPeriodDays?: number;
  sourceTitle?: string;
  verificationStatus: string;
  isSample: boolean;
}

export interface PesticideKnowledgeRepository {
  getCrops(): Promise<DbCrop[]>;
  getProblems(cropId: string): Promise<DbProblem[]>;
  getVerifiedRecommendations(cropId: string, problemId: string): Promise<DbVerifiedRecommendation[]>;
  isProductBanned(chemicalName: string, cropName: string): Promise<{ banned: boolean; reason?: string }>;
  isProductRegistered(chemicalName: string, cropName: string): Promise<boolean>;
}

export class KnexPesticideKnowledgeRepository implements PesticideKnowledgeRepository {
  constructor(private knex: Knex) {}

  async getCrops(): Promise<DbCrop[]> {
    const rows = await this.knex('crops').select('*').orderBy('name_en', 'asc');
    return rows.map((r) => ({
      id: r.id,
      nameEn: r.name_en,
      nameHi: r.name_hi,
      nameTe: r.name_te,
      scientificName: r.scientific_name || undefined,
    }));
  }

  async getProblems(cropId: string): Promise<DbProblem[]> {
    const rows = await this.knex('problems').where('crop_id', cropId).orderBy('name_en', 'asc');
    return rows.map((r) => ({
      id: r.id,
      cropId: r.crop_id,
      nameEn: r.name_en,
      nameHi: r.name_hi,
      nameTe: r.name_te,
      problemType: r.problem_type as 'pest' | 'disease' | 'weed',
      description: r.description || undefined,
    }));
  }

  async getVerifiedRecommendations(
    cropId: string,
    problemId: string
  ): Promise<DbVerifiedRecommendation[]> {
    const rows = await this.knex('verified_recommendations as vr')
      .join('products as p', 'vr.product_id', 'p.id')
      .leftJoin('sources as s', 'vr.source_id', 's.id')
      .where('vr.crop_id', cropId)
      .andWhere('vr.problem_id', problemId)
      .select(
        'vr.id as rec_id',
        'vr.crop_id',
        'vr.problem_id',
        'vr.dose_per_acre',
        'vr.dose_unit as rec_dose_unit',
        'vr.water_per_acre_l',
        'vr.waiting_period_days',
        'vr.verification_status',
        'vr.is_sample',
        's.title as source_title',
        'p.id as product_id',
        'p.trade_name',
        'p.chemical_name',
        'p.formulation',
        'p.type as product_type',
        'p.default_dose_per_litre',
        'p.default_water_per_acre_l',
        'p.dose_unit as product_dose_unit',
        'p.estimated_price_per_unit'
      );

    return rows.map((r: any) => ({
      id: r.rec_id,
      cropId: r.crop_id,
      problemId: r.problem_id,
      dosePerAcre: r.dose_per_acre ? Number(r.dose_per_acre) : undefined,
      doseUnit: r.rec_dose_unit || 'g',
      waterPerAcreL: Number(r.water_per_acre_l || 150),
      waitingPeriodDays: r.waiting_period_days ? Number(r.waiting_period_days) : undefined,
      sourceTitle: r.source_title || undefined,
      verificationStatus: r.verification_status || 'VERIFIED',
      isSample: Boolean(r.is_sample),
      product: {
        id: r.product_id,
        tradeName: r.trade_name,
        chemicalName: r.chemical_name,
        formulation: r.formulation,
        type: r.product_type as 'chemical' | 'organic',
        defaultDosePerLitre: r.default_dose_per_litre ? Number(r.default_dose_per_litre) : undefined,
        defaultWaterPerAcreL: Number(r.default_water_per_acre_l || 150),
        doseUnit: r.product_dose_unit || 'g',
        estimatedPricePerUnit: r.estimated_price_per_unit ? Number(r.estimated_price_per_unit) : undefined,
      },
    }));
  }

  async isProductBanned(
    chemicalName: string,
    cropName: string
  ): Promise<{ banned: boolean; reason?: string }> {
    const rows = await this.knex('banned_products')
      .whereILike('chemical_name', `%${chemicalName}%`);

    for (const row of rows) {
      try {
        const bannedCrops: string[] = JSON.parse(row.banned_on_crops);
        const match = bannedCrops.some((c) =>
          cropName.toLowerCase().includes(c.toLowerCase()) ||
          c.toLowerCase() === 'all' ||
          c.toLowerCase() === 'vegetables'
        );
        if (match) {
          return {
            banned: true,
            reason: row.reason || `Banned under gazette notification ${row.gazette_notification}`,
          };
        }
      } catch {
        // Fallback
      }
    }
    return { banned: false };
  }

  async isProductRegistered(chemicalName: string, cropName: string): Promise<boolean> {
    const rows = await this.knex('registered_products')
      .whereILike('chemical_name', `%${chemicalName}%`)
      .andWhere('status', 'Active');

    for (const row of rows) {
      try {
        const approvedCrops: string[] = JSON.parse(row.approved_crops);
        const match = approvedCrops.some((c) =>
          cropName.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase() === 'all'
        );
        if (match) return true;
      } catch {
        // Fallback
      }
    }
    return rows.length > 0;
  }
}
