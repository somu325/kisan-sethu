import { useState, useEffect, useCallback, useRef } from 'react';
import type { Language, LocationOption } from '../types';
import { AGRICULTURAL_LOCATIONS, getLanguageForLocation } from '../data/mockData';
import { geocodingService } from '../services/geocodingService';

export type LocationMode = 'gps' | 'manual';
export type LocationStatus = 'detecting' | 'gps' | 'manual' | 'denied' | 'error';

const TEN_MINUTES_MS = 10 * 60 * 1000;

export interface UseUserLocationReturn {
  currentLocation: LocationOption;
  locationMode: LocationMode;
  locationStatus: LocationStatus;
  recentLocations: LocationOption[];
  isDetecting: boolean;
  requestGpsLocation: (userInitiated?: boolean) => void;
  selectManualLocation: (loc: LocationOption) => void;
  switchToGpsMode: () => void;
}

export function useUserLocation(
  _currentLang?: Language,
  onLanguageAutoSync?: (geoLang: Language) => void
): UseUserLocationReturn {
  // 1. Initial State: Mode ('gps' default, unless saved 'manual')
  const [locationMode, setLocationMode] = useState<LocationMode>(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('ks_location_mode');
      if (savedMode === 'manual') return 'manual';
    }
    return 'gps';
  });

  // 2. Initial Location: Show saved location instantly while fresh fix loads
  const [currentLocation, setCurrentLocation] = useState<LocationOption>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedData = localStorage.getItem('ks_user_location_data');
        if (savedData) {
          const parsed = JSON.parse(savedData) as LocationOption;
          if (parsed && parsed.id && parsed.name) return parsed;
        }
      } catch {
        // Fallback
      }
      const savedId = localStorage.getItem('ks_user_location_id');
      if (savedId) {
        const found = AGRICULTURAL_LOCATIONS.find((l) => l.id === savedId);
        if (found) return found;
      }
    }
    // Default to Tirupati AP
    return AGRICULTURAL_LOCATIONS[6] || AGRICULTURAL_LOCATIONS[0];
  });

  // 3. Status
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('ks_location_mode');
      if (savedMode === 'manual') return 'manual';
    }
    return 'detecting';
  });

  // 4. Recent Locations (Persisted in localStorage)
  const [recentLocations, setRecentLocations] = useState<LocationOption[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedRecents = localStorage.getItem('ks_recent_locations');
        if (savedRecents) {
          return JSON.parse(savedRecents) as LocationOption[];
        }
      } catch {
        // Ignore
      }
    }
    return AGRICULTURAL_LOCATIONS.slice(0, 3);
  });

  const lastFixTimeRef = useRef<number>(Date.now());
  const isMountedRef = useRef<boolean>(true);

  // Request fresh GPS position
  const requestGpsLocation = useCallback(
    (userInitiated = false) => {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        setLocationStatus('error');
        return;
      }

      setLocationStatus('detecting');

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (!isMountedRef.current) return;
          const { latitude, longitude } = pos.coords;

          try {
            const resolvedLoc = await geocodingService.reverseGeocode(latitude, longitude);
            if (!isMountedRef.current) return;

            const finalLoc = resolvedLoc || AGRICULTURAL_LOCATIONS[0];
            setCurrentLocation(finalLoc);
            setLocationMode('gps');
            setLocationStatus('gps');
            lastFixTimeRef.current = Date.now();

            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('ks_location_mode', 'gps');
              localStorage.setItem('ks_user_location_id', finalLoc.id);
              localStorage.setItem('ks_user_location_data', JSON.stringify(finalLoc));
              localStorage.setItem('ks_last_fix_time', Date.now().toString());
            }

            // Sync regional language if language wasn't manually overridden
            const hasManualLang = localStorage.getItem('ks_lang_manual') === 'true';
            if (!hasManualLang && onLanguageAutoSync) {
              const geoLang = getLanguageForLocation(finalLoc);
              onLanguageAutoSync(geoLang);
            }
          } catch (e) {
            console.warn('Geocoding error after GPS fix:', e);
            setLocationStatus('gps');
          }
        },
        (err) => {
          if (!isMountedRef.current) return;
          console.warn('GPS position error:', err.code, err.message);

          if (err.code === 1) {
            // PERMISSION_DENIED
            setLocationStatus('denied');
          } else {
            // POSITION_UNAVAILABLE or TIMEOUT
            setLocationStatus('error');
          }

          if (userInitiated) {
            // If user clicked GPS but it failed, show last known place
          }
        },
        { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
      );
    },
    [onLanguageAutoSync]
  );

  // Select a manual location
  const selectManualLocation = useCallback((loc: LocationOption) => {
    setCurrentLocation(loc);
    setLocationMode('manual');
    setLocationStatus('manual');

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ks_location_mode', 'manual');
      localStorage.setItem('ks_user_location_id', loc.id);
      localStorage.setItem('ks_user_location_data', JSON.stringify(loc));

      // Append to recent locations (deduplicating by id and name)
      setRecentLocations((prev) => {
        const filtered = prev.filter((p) => p.id !== loc.id && p.name.en !== loc.name.en);
        const updated = [loc, ...filtered].slice(0, 5);
        try {
          localStorage.setItem('ks_recent_locations', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  }, []);

  // Switch back to GPS mode
  const switchToGpsMode = useCallback(() => {
    setLocationMode('gps');
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ks_location_mode', 'gps');
    }
    requestGpsLocation(true);
  }, [requestGpsLocation]);

  // Initial mount: if mode is 'gps', request fresh fix
  useEffect(() => {
    isMountedRef.current = true;
    if (locationMode === 'gps') {
      requestGpsLocation(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle App Resume: Request fresh position when app returns from background after >10 minutes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const now = Date.now();
        const elapsed = now - lastFixTimeRef.current;
        const currentMode = localStorage.getItem('ks_location_mode') || locationMode;

        if (elapsed > TEN_MINUTES_MS && currentMode === 'gps') {
          console.log('[Location] App resumed after >10m, requesting fresh GPS fix...');
          requestGpsLocation(false);
        }
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleVisibilityChange);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleVisibilityChange);
      }
    };
  }, [locationMode, requestGpsLocation]);

  return {
    currentLocation,
    locationMode,
    locationStatus,
    recentLocations,
    isDetecting: locationStatus === 'detecting',
    requestGpsLocation,
    selectManualLocation,
    switchToGpsMode
  };
}
