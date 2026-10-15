export type MarketType = 'APMC' | 'MANDI';

export interface MarketPlace {
  id: string;
  name: string;
  type: MarketType;
  latitude: number;
  longitude: number;
  address?: string;
  district?: string;
  state?: string;
  phone?: string;
  openingHours?: string;
  commodities?: string[];
  updatedAt?: string;
}

export interface MarketFilter {
  type?: MarketType | 'ALL';
  search?: string;
  userLat?: number;
  userLng?: number;
  radiusKm?: number;
}

export interface MarketWithDistance extends MarketPlace {
  distanceKm?: number;
}
