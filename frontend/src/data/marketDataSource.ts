import type { MarketRepository } from './marketRepository.ts';
import { MockMarketRepository } from './mockMarketRepository.ts';
import { ApiMarketRepository } from './apiMarketRepository.ts';

// Determines data source from Vite environment or defaults to 'api' (with automatic mock fallback)
const DATA_SOURCE =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_MARKET_DATA_SOURCE as string || import.meta.env?.MARKET_DATA_SOURCE as string)) ||
  'api';

let activeRepo: MarketRepository | null = null;

export function getMarketRepository(): MarketRepository {
  if (!activeRepo) {
    if (DATA_SOURCE === 'mock') {
      activeRepo = new MockMarketRepository();
    } else {
      activeRepo = new ApiMarketRepository();
    }
  }
  return activeRepo;
}

/**
 * Allows overriding repository at runtime (useful for unit testing or QA toggle)
 */
export function setMarketRepository(repo: MarketRepository): void {
  activeRepo = repo;
}
