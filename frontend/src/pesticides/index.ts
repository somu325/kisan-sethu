/**
 * Main entry point for Pesticides & Spray Dosage Knowledge module.
 */

import type { PesticideKnowledgeRepository } from './PesticideKnowledgeRepository';
import { LocalPesticideRepository } from './LocalPesticideRepository';
import { ApiPesticideRepository } from './ApiPesticideRepository';

export * from './types';
export * from './dosageCalculator';
export * from './PesticideKnowledgeRepository';
export * from './LocalPesticideRepository';
export * from './ApiPesticideRepository';

let defaultRepo: PesticideKnowledgeRepository | null = null;

export function getPesticideRepository(): PesticideKnowledgeRepository {
  if (!defaultRepo) {
    const proc = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;
    const dataSource = proc?.env?.PESTICIDE_DATA_SOURCE || 'api';

    if (dataSource === 'local') {
      defaultRepo = new LocalPesticideRepository();
    } else {
      defaultRepo = new ApiPesticideRepository();
    }
  }
  return defaultRepo;
}
