import type { Knex } from 'knex';

export interface MarketPlace {
  id: string;
  name: string;
  type: 'APMC' | 'MANDI';
  latitude: number;
  longitude: number;
  address?: string;
  district: string;
  state: string;
  phone?: string;
  opening_hours?: string;
  commodities?: string[];
  updated_at?: string;
  is_sample: boolean;
}

export interface MarketNearbyResult extends MarketPlace {
  distanceKm: number;
}

export interface MarketFilter {
  type?: 'APMC' | 'MANDI';
  search?: string;
  state?: string;
  district?: string;
}

export interface MarketRepository {
  getAll(filter?: MarketFilter): Promise<MarketPlace[]>;
  getById(id: string): Promise<MarketPlace | null>;
  getNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    type?: 'APMC' | 'MANDI'
  ): Promise<MarketNearbyResult[]>;
  create(market: MarketPlace): Promise<MarketPlace>;
}

/**
 * Calculates great-circle distance between two coordinates in kilometers (Haversine formula).
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
  return Math.round(R * c * 10) / 10;
}

export class KnexMarketRepository implements MarketRepository {
  constructor(private knex: Knex) {}

  private mapRow(row: any): MarketPlace {
    let commodities: string[] = [];
    if (row.commodities_json) {
      try {
        commodities = JSON.parse(row.commodities_json);
      } catch {
        commodities = [];
      }
    }
    return {
      id: row.id,
      name: row.name,
      type: row.type as 'APMC' | 'MANDI',
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      address: row.address || undefined,
      district: row.district,
      state: row.state,
      phone: row.phone || undefined,
      opening_hours: row.opening_hours || undefined,
      commodities,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      is_sample: Boolean(row.is_sample),
    };
  }

  async getAll(filter?: MarketFilter): Promise<MarketPlace[]> {
    let query = this.knex('markets').select('*');

    if (filter?.type) {
      query = query.where('type', filter.type);
    }
    if (filter?.state) {
      query = query.whereILike('state', `%${filter.state}%`);
    }
    if (filter?.district) {
      query = query.whereILike('district', `%${filter.district}%`);
    }
    if (filter?.search) {
      const s = `%${filter.search}%`;
      query = query.where((builder) => {
        builder
          .whereILike('name', s)
          .orWhereILike('district', s)
          .orWhereILike('state', s)
          .orWhereILike('commodities_json', s);
      });
    }

    const rows = await query.orderBy('name', 'asc');
    return rows.map((r) => this.mapRow(r));
  }

  async getById(id: string): Promise<MarketPlace | null> {
    const row = await this.knex('markets').where('id', id).first();
    if (!row) return null;
    return this.mapRow(row);
  }

  /**
   * Bounding box prefilter in SQL (using idx_markets_lat_lng index),
   * followed by exact Haversine distance in code.
   * Portable across SQLite and PostgreSQL with identical behavior.
   */
  async getNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    type?: 'APMC' | 'MANDI'
  ): Promise<MarketNearbyResult[]> {
    // 1 degree latitude is approx 111 km
    const latDelta = radiusKm / 111.0;
    // 1 degree longitude is approx 111 * cos(lat) km
    const cosLat = Math.cos((lat * Math.PI) / 180.0);
    const lngDelta = radiusKm / (111.0 * Math.max(cosLat, 0.001));

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    let query = this.knex('markets')
      .whereBetween('latitude', [minLat, maxLat])
      .andWhereBetween('longitude', [minLng, maxLng]);

    if (type) {
      query = query.andWhere('type', type);
    }

    const candidates = await query;

    const results: MarketNearbyResult[] = [];
    for (const row of candidates) {
      const distance = haversineDistanceKm(lat, lng, Number(row.latitude), Number(row.longitude));
      if (distance <= radiusKm) {
        results.push({
          ...this.mapRow(row),
          distanceKm: distance,
        });
      }
    }

    // Sort ascending by proximity
    results.sort((a, b) => a.distanceKm - b.distanceKm);
    return results;
  }

  async create(market: MarketPlace): Promise<MarketPlace> {
    const row = {
      id: market.id,
      name: market.name,
      type: market.type,
      latitude: market.latitude,
      longitude: market.longitude,
      address: market.address || null,
      district: market.district,
      state: market.state,
      phone: market.phone || null,
      opening_hours: market.opening_hours || null,
      commodities_json: market.commodities ? JSON.stringify(market.commodities) : null,
      is_sample: market.is_sample,
      updated_at: new Date(),
    };

    await this.knex('markets').insert(row);
    return market;
  }
}
