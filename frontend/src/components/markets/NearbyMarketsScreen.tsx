import { useState, useMemo, type FC } from 'react';
import type { Language, LocationOption } from '../../types';
import type { MarketType, MarketWithDistance } from '../../types/market';
import { MARKETS_I18N } from '../../data/i18n/marketsTranslations';
import { useMarkets } from '../../hooks/useMarkets';
import { LOCATION_COORDINATES } from '../../data/mockData';
import { MapViewWrapper } from './MapViewWrapper';
import { MarketFilterChips } from './MarketFilterChips';
import { MarketSearchBar } from './MarketSearchBar';
import { MarketBottomSheet } from './MarketBottomSheet';
import { MarketListItem } from './MarketListItem';
import { MarketLegend } from './MarketLegend';
import {
  Map as MapIcon,
  List as ListIcon,
  Store,
  RefreshCw,
  AlertTriangle,
  Inbox
} from 'lucide-react';

interface NearbyMarketsScreenProps {
  currentLang: Language;
  currentLocation?: LocationOption;
}

export const NearbyMarketsScreen: FC<NearbyMarketsScreenProps> = ({
  currentLang,
  currentLocation
}) => {
  const i18n = MARKETS_I18N[currentLang] || MARKETS_I18N.en;

  // View state: 'map' or 'list'
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedType, setSelectedType] = useState<MarketType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMarket, setSelectedMarket] = useState<MarketWithDistance | null>(null);

  // Initialize GPS coordinates from currentLocation prop if available
  const defaultCoords = useMemo(() => {
    if (currentLocation && LOCATION_COORDINATES[currentLocation.id]) {
      return LOCATION_COORDINATES[currentLocation.id];
    }
    return { lat: 15.8281, lng: 78.0373 }; // Default Kurnool AP
  }, [currentLocation]);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(defaultCoords);

  // Use Markets Hook with debounced filter
  const { markets, loading, error, isEmpty, refresh } = useMarkets({
    type: selectedType,
    search: searchQuery,
    userLat: userCoords?.lat,
    userLng: userCoords?.lng
  });

  // Calculate market counts for filter chip badges
  const apmcCount = useMemo(() => markets.filter((m) => m.type === 'APMC').length, [markets]);
  const mandiCount = useMemo(() => markets.filter((m) => m.type === 'MANDI').length, [markets]);

  return (
    <div className="nearby-markets-screen-container">
      {/* 1. Header Section */}
      <div className="markets-screen-header">
        <div className="header-info-box">
          <div className="header-title-row">
            <Store size={26} className="title-icon" />
            <h1 className="header-title">{i18n.screenTitle}</h1>
          </div>
          <p className="header-subtitle">{i18n.screenSubtitle}</p>
        </div>

        {/* Map / List View Toggle Switch */}
        <div className="view-mode-toggle-group" role="group" aria-label="View toggle">
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
            aria-pressed={viewMode === 'map'}
          >
            <MapIcon size={16} />
            <span>{i18n.mapView}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            aria-pressed={viewMode === 'list'}
          >
            <ListIcon size={16} />
            <span>{i18n.listView}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Filter Controls: Search & Category Chips */}
      <div className="markets-controls-bar">
        <MarketSearchBar value={searchQuery} onChange={setSearchQuery} i18n={i18n} />

        <MarketFilterChips
          selectedType={selectedType}
          onSelectType={setSelectedType}
          i18n={i18n}
          apmcCount={apmcCount}
          mandiCount={mandiCount}
          totalCount={markets.length}
        />
      </div>

      {/* 3. Main Content: Map View or List View */}
      <div className="markets-display-area">
        {/* Loading Skeleton */}
        {loading && (
          <div className="markets-loading-overlay" aria-busy="true">
            <div className="loading-spinner" />
            <p className="loading-text">{i18n.locatingText}</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="markets-error-state" role="alert">
            <AlertTriangle size={36} className="error-icon" />
            <h3 className="error-heading">{i18n.errorTitle}</h3>
            <p className="error-desc">{i18n.errorSubtitle}</p>
            <button type="button" onClick={refresh} className="error-retry-btn">
              <RefreshCw size={16} />
              <span>{i18n.retryBtn}</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && isEmpty && (
          <div className="markets-empty-state">
            <Inbox size={40} className="empty-icon" />
            <h3 className="empty-heading">{i18n.emptyTitle}</h3>
            <p className="empty-desc">{i18n.emptySubtitle}</p>
            <button
              type="button"
              onClick={() => {
                setSelectedType('ALL');
                setSearchQuery('');
              }}
              className="empty-reset-btn"
            >
              <span>Reset Filters</span>
            </button>
          </div>
        )}

        {/* Active Display: Map vs List */}
        {!error && (
          <>
            {viewMode === 'map' ? (
              <div className="map-view-frame">
                <MapViewWrapper
                  markets={markets}
                  selectedMarket={selectedMarket}
                  onSelectMarket={setSelectedMarket}
                  userCoords={userCoords}
                  onUpdateUserCoords={setUserCoords}
                  i18n={i18n}
                />
                <MarketLegend i18n={i18n} />
              </div>
            ) : (
              <div className="list-view-frame">
                <div className="markets-list-grid">
                  {markets.map((market) => (
                    <MarketListItem
                      key={market.id}
                      market={market}
                      onSelect={setSelectedMarket}
                      i18n={i18n}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. Bottom Sheet Modal for Tapped Marker */}
      <MarketBottomSheet
        market={selectedMarket}
        onClose={() => setSelectedMarket(null)}
        i18n={i18n}
      />
    </div>
  );
};
