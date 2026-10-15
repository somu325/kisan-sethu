import type { MarketPlace, MarketType } from '../types/market.ts';
import type { MarketRepository } from './marketRepository.ts';
import seedData from './seed/markets.json' with { type: 'json' };

/**
 * Calculates great-circle distance between two GPS coordinates in kilometers.
 */
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const roadKm = Math.round(R * c * 1.22); // ~1.22 factor for road route estimate
  return Math.max(1, roadKm);
}

export class MockMarketRepository implements MarketRepository {
  private markets: MarketPlace[];

  constructor() {
    this.markets = (seedData.markets as MarketPlace[]) || [];
  }

  async getAll(filter?: { type?: MarketType; search?: string }): Promise<MarketPlace[]> {
    // Simulate lightweight async database call
    await new Promise((resolve) => setTimeout(resolve, 120));

    let results = [...this.markets];

    if (filter?.type) {
      results = results.filter((m) => m.type === filter.type);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      results = results.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.district && m.district.toLowerCase().includes(q)) ||
          (m.state && m.state.toLowerCase().includes(q)) ||
          (m.commodities && m.commodities.some((c) => c.toLowerCase().includes(q)))
      );
    }

    return results;
  }

  async getNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    type?: MarketType
  ): Promise<(MarketPlace & { distanceKm: number })[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));

    let items = [...this.markets];
    if (type) {
      items = items.filter((m) => m.type === type);
    }

    const calculated = items
      .map((market) => {
        const distanceKm = haversineDistanceKm(lat, lng, market.latitude, market.longitude);
        return {
          ...market,
          distanceKm
        };
      })
      .filter((m) => radiusKm <= 0 || m.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return calculated;
  }

  async getById(id: string): Promise<MarketPlace | null> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const found = this.markets.find((m) => m.id === id);
    return found || null;
  }
}
