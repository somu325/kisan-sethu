import type { LocationOption } from '../types';
import { AGRICULTURAL_LOCATIONS, getNearestLocationFromCoords } from '../data/mockData';

export interface GeocodingResult {
  displayName: string;
  lat: number;
  lng: number;
  villageOrTown: string;
  district: string;
  state: string;
  pincode: string;
}

export interface IGeocodingService {
  reverseGeocode(lat: number, lng: number): Promise<LocationOption | null>;
  searchPlaces(query: string): Promise<LocationOption[]>;
}

// In-memory cache for fast repeated lookups
const memoryCache = new Map<string, any>();

// Rate limiter queue for OpenStreetMap Nominatim (Policy: max 1 req/sec)
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 1050;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_INTERVAL_MS) {
    const delay = MIN_INTERVAL_MS - timeSinceLast;
    await new Promise((res) => setTimeout(res, delay));
  }
  lastRequestTime = Date.now();
}

/**
 * OpenStreetMap Nominatim Geocoding Service
 * Free, open-source, rate-limited, and cached.
 */
export class NominatimGeocodingService implements IGeocodingService {
  readonly userAgent = 'KisanSetu-AgriTerminal/1.0 (contact@kisansethu.org)';

  /**
   * Reverse Geocode (lat, lng) -> LocationOption
   */
  async reverseGeocode(lat: number, lng: number): Promise<LocationOption | null> {
    const cacheKey = `rev_${lat.toFixed(3)}_${lng.toFixed(3)}`;

    // 1. Check in-memory & localStorage cache
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey);
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(`ks_geo_${cacheKey}`);
        if (stored) {
          const parsed = JSON.parse(stored) as LocationOption;
          memoryCache.set(cacheKey, parsed);
          return parsed;
        }
      } catch {
        // Ignore JSON error
      }
    }

    // 2. Check offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return getNearestLocationFromCoords(lat, lng);
    }

    try {
      await waitForRateLimit();

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1&email=contact@kisansethu.org`;
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim error: ${response.status}`);
      }

      const data = await response.json();
      const addr = data.address || {};

      const townOrVillage =
        addr.village ||
        addr.town ||
        addr.city ||
        addr.suburb ||
        addr.hamlet ||
        addr.neighbourhood ||
        addr.state_district ||
        'My Location';

      const district = addr.state_district || addr.county || addr.district || addr.city || townOrVillage;
      const state = addr.state || 'India';
      const pincode = addr.postcode || '500001';

      // Find nearest benchmark mandi from agricultural database
      const nearestMandi = getNearestLocationFromCoords(lat, lng);

      const locOption: LocationOption = {
        id: `gps_${lat.toFixed(3)}_${lng.toFixed(3)}`,
        name: {
          en: townOrVillage,
          hi: townOrVillage,
          te: townOrVillage
        },
        district: {
          en: district,
          hi: nearestMandi.district.hi || district,
          te: nearestMandi.district.te || district
        },
        state: {
          en: state,
          hi: nearestMandi.state.hi || state,
          te: nearestMandi.state.te || state
        },
        mandiName: nearestMandi.mandiName,
        pincode
      };

      // Store in caches
      memoryCache.set(cacheKey, locOption);
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(`ks_geo_${cacheKey}`, JSON.stringify(locOption));
        } catch {
          // Ignore storage quota
        }
      }

      return locOption;
    } catch (err) {
      console.warn('Reverse geocode fallback to nearest benchmark location:', err);
      return getNearestLocationFromCoords(lat, lng);
    }
  }

  /**
   * Search places by text query with country=India filter
   */
  async searchPlaces(query: string): Promise<LocationOption[]> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2) return [];

    const cacheKey = `search_${trimmed}`;
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey);
    }

    // First filter local agricultural locations for instant offline response
    const localMatches = AGRICULTURAL_LOCATIONS.filter(
      (loc) =>
        loc.name.en.toLowerCase().includes(trimmed) ||
        loc.name.hi.toLowerCase().includes(trimmed) ||
        loc.name.te.toLowerCase().includes(trimmed) ||
        loc.district.en.toLowerCase().includes(trimmed) ||
        loc.mandiName.en.toLowerCase().includes(trimmed) ||
        loc.pincode.includes(trimmed)
    );

    // If offline, return local matches
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return localMatches;
    }

    try {
      await waitForRateLimit();

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        trimmed
      )}&countrycodes=in&limit=6&addressdetails=1&email=contact@kisansethu.org`;

      const response = await fetch(url, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        return localMatches;
      }

      const results = await response.json();
      const nominatimLocations: LocationOption[] = results.map((item: any) => {
        const addr = item.address || {};
        const town =
          addr.village ||
          addr.town ||
          addr.city ||
          addr.suburb ||
          item.name ||
          trimmed;
        const dist = addr.state_district || addr.county || addr.district || town;
        const st = addr.state || 'India';
        const pin = addr.postcode || '';

        const itemLat = parseFloat(item.lat);
        const itemLng = parseFloat(item.lon);
        const nearest = !isNaN(itemLat) && !isNaN(itemLng)
          ? getNearestLocationFromCoords(itemLat, itemLng)
          : AGRICULTURAL_LOCATIONS[0];

        return {
          id: `search_${item.place_id || Math.random().toString(36).slice(2, 8)}`,
          name: { en: town, hi: town, te: town },
          district: {
            en: dist,
            hi: nearest.district.hi || dist,
            te: nearest.district.te || dist
          },
          state: {
            en: st,
            hi: nearest.state.hi || st,
            te: nearest.state.te || st
          },
          mandiName: nearest.mandiName,
          pincode: pin || nearest.pincode
        };
      });

      // Combine local matches first, followed by nominatim matches (deduping)
      const combined = [...localMatches];
      nominatimLocations.forEach((nLoc) => {
        if (!combined.some((c) => c.name.en.toLowerCase() === nLoc.name.en.toLowerCase())) {
          combined.push(nLoc);
        }
      });

      memoryCache.set(cacheKey, combined);
      return combined;
    } catch (e) {
      console.warn('Geocoding search fallback to local places:', e);
      return localMatches;
    }
  }
}

export const geocodingService = new NominatimGeocodingService();
