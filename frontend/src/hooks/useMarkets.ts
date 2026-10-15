import { useState, useEffect, useCallback, useRef } from 'react';
import type { MarketFilter, MarketWithDistance } from '../types/market';
import { getMarketRepository } from '../data/marketDataSource';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1.22);
}

export function useMarkets(filter: MarketFilter) {
  const [markets, setMarkets] = useState<MarketWithDistance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const repo = getMarketRepository();
      const rawMarkets = await repo.getAll({
        type: filter.type && filter.type !== 'ALL' ? filter.type : undefined,
        search: filter.search
      });

      // Augment each market with distance relative to user GPS if available
      let results: MarketWithDistance[] = rawMarkets.map((m) => {
        if (filter.userLat !== undefined && filter.userLng !== undefined) {
          const dist = calculateDistanceKm(filter.userLat, filter.userLng, m.latitude, m.longitude);
          return { ...m, distanceKm: dist };
        }
        return m;
      });

      // Filter by radius if specified
      if (
        filter.radiusKm &&
        filter.radiusKm > 0 &&
        filter.userLat !== undefined &&
        filter.userLng !== undefined
      ) {
        results = results.filter((m) => m.distanceKm !== undefined && m.distanceKm <= filter.radiusKm!);
      }

      // Sort by proximity when user location is known
      if (filter.userLat !== undefined && filter.userLng !== undefined) {
        results.sort((a, b) => (a.distanceKm || 99999) - (b.distanceKm || 99999));
      }

      setMarkets(results);
    } catch (err: any) {
      console.error('Error loading markets:', err);
      setError(err?.message || 'Failed to load markets');
    } finally {
      setLoading(false);
    }
  }, [filter.type, filter.search, filter.userLat, filter.userLng, filter.radiusKm]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce search input by 250ms for responsive typing
    debounceTimerRef.current = setTimeout(() => {
      fetchMarkets();
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fetchMarkets]);

  return {
    markets,
    loading,
    error,
    isEmpty: !loading && !error && markets.length === 0,
    refresh: fetchMarkets
  };
}
