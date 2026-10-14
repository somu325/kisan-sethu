import type { MarketPlace, MarketType } from '../types/market.ts';
import type { MarketRepository } from './marketRepository.ts';
import { MockMarketRepository } from './mockMarketRepository.ts';
import { apiClient } from '../services/api/client.ts';

/**
 * ApiMarketRepository
 *
 * Connects to the KisanSetu backend server (`GET /markets/nearby`).
 * If the server is offline or unreachable, seamlessly falls back to MockMarketRepository
 * to guarantee uninterrupted offline operation for farmers in the field.
 */
export class ApiMarketRepository implements MarketRepository {
  private fallbackRepo = new MockMarketRepository();

  async getAll(filter?: { type?: MarketType; search?: string }): Promise<MarketPlace[]> {
    const params = new URLSearchParams();
    if (filter?.type) params.append('type', filter.type);
    if (filter?.search) params.append('search', filter.search);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient<MarketPlace[]>(`/markets${queryStr}`);

    if (res.success && res.data) {
      return res.data;
    }

    // Fallback to local mock data on server error or offline
    return this.fallbackRepo.getAll(filter);
  }

  async getNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    type?: MarketType
  ): Promise<(MarketPlace & { distanceKm: number })[]> {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radiusKm: radiusKm.toString(),
    });
    if (type) params.append('type', type);

    const res = await apiClient<(MarketPlace & { distanceKm: number })[]>(
      `/markets/nearby?${params.toString()}`
    );

    if (res.success && res.data) {
      return res.data;
    }

    // Graceful offline fallback
    return this.fallbackRepo.getNearby(lat, lng, radiusKm, type);
  }

  async getById(id: string): Promise<MarketPlace | null> {
    const res = await apiClient<MarketPlace>(`/markets/${id}`);
    if (res.success && res.data) {
      return res.data;
    }

    return this.fallbackRepo.getById(id);
  }
}
