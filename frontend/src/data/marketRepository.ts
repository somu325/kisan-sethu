import type { MarketPlace, MarketType } from '../types/market';

export interface MarketRepository {
  /**
   * Retrieves all markets matching optional category and text search query.
   */
  getAll(filter?: { type?: MarketType; search?: string }): Promise<MarketPlace[]>;

  /**
   * Retrieves markets within a given radius (km) from a central coordinate.
   * Results are sorted in ascending order of proximity to (lat, lng).
   */
  getNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    type?: MarketType
  ): Promise<(MarketPlace & { distanceKm: number })[]>;

  /**
   * Retrieves a single market record by its unique identifier.
   */
  getById(id: string): Promise<MarketPlace | null>;
}
