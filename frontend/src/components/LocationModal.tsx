import { useState, useEffect, useRef, type FC } from 'react';
import { Linking } from 'react-native';
import type { Language, LocationOption } from '../types';
import type { LocationMode, LocationStatus } from '../hooks/useUserLocation';
import { AGRICULTURAL_LOCATIONS } from '../data/mockData';
import { translations } from '../data/i18n';
import { geocodingService } from '../services/geocodingService';
import {
  HIERARCHICAL_LOCATIONS,
  buildLocationFromMandal,
  type StateItem,
  type DistrictItem
} from '../data/hierarchicalLocations';
import {
  MapPin,
  Search,
  Check,
  X,
  Building2,
  LocateFixed,
  LocateOff,
  Loader2,
  Clock,
  Layers,
  ChevronRight,
  AlertTriangle,
  Settings
} from 'lucide-react';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationOption;
  onSelectLocation: (loc: LocationOption) => void;
  currentLang: Language;
  locationMode: LocationMode;
  locationStatus: LocationStatus;
  recentLocations: LocationOption[];
  onUseGpsLocation: () => void;
}

export const LocationModal: FC<LocationModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
  currentLang,
  locationMode,
  locationStatus,
  recentLocations,
  onUseGpsLocation
}) => {
  const t = translations[currentLang];

  // Active view tab: 'search' | 'browse'
  const [activeTab, setActiveTab] = useState<'search' | 'browse'>('search');

  // Search state with debouncing
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<LocationOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Browse hierarchy state: State -> District -> Mandal
  const [selectedState, setSelectedState] = useState<StateItem | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictItem | null>(null);

  // Debounced search effect
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await geocodingService.searchPlaces(searchTerm);
        setSearchResults(results);
      } catch (err) {
        console.warn('Location search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 320);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchTerm]);

  if (!isOpen) return null;

  const handleOpenSettings = () => {
    if (typeof Linking !== 'undefined' && Linking.openSettings) {
      Linking.openSettings().catch(() => {
        alert(
          currentLang === 'hi'
            ? 'कृपया अपने ब्राउज़र की URL पट्टी में स्थित ताला (Lock) आइकन दबाकर स्थान अनुमति चालू करें।'
            : currentLang === 'te'
            ? 'దయచేసి మీ బ్రౌజర్ URL బార్‌లోని లాక్ ఐకాన్ నొక్కి లొకేషన్ అనుమతించండి.'
            : 'Please click the lock icon in your browser URL bar to allow Location permission.'
        );
      });
    } else {
      alert(
        currentLang === 'hi'
          ? 'कृपया अपने ब्राउज़र या फोन सेटिंग्स में जाकर स्थान अनुमति चालू करें।'
          : currentLang === 'te'
          ? 'దయచేసి మీ బ్రౌజర్ సెట్టింగ్స్‌లో లొకేషన్ అనుమతి ఆన్ చేయండి.'
          : 'Please enable Location permission in your browser or device settings.'
      );
    }
  };

  const handleSelectAndClose = (loc: LocationOption) => {
    onSelectLocation(loc);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="location-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <MapPin className="modal-title-icon" size={20} />
            <h3 className="modal-title">{t.selectLocationTitle}</h3>
          </div>
          <button type="button" onClick={onClose} className="modal-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Current Location Badge Banner */}
        <div className="current-location-chip-banner">
          <div className="cur-loc-info">
            <span className="cur-label">{t.activeAgriZone}:</span>
            <strong className="cur-name">
              {currentLocation.name[currentLang]} ({currentLocation.district[currentLang] || ''}, {currentLocation.state[currentLang] || ''})
            </strong>
          </div>
          <span className={`cur-mode-pill ${locationMode === 'gps' ? 'gps' : 'manual'}`}>
            {locationMode === 'gps' ? (
              <>
                <LocateFixed size={12} />
                <span>{t.gpsAutoModeActive || 'GPS Active'}</span>
              </>
            ) : (
              <>
                <MapPin size={12} />
                <span>{t.manualLocationMode || 'Manual'}</span>
              </>
            )}
          </span>
        </div>

        {/* Top Action: Use My Current Location (GPS) Button */}
        <div className="loc-gps-action-wrap">
          <button
            type="button"
            onClick={() => {
              onUseGpsLocation();
              onClose();
            }}
            disabled={locationStatus === 'detecting'}
            className={`loc-gps-detect-btn ${locationMode === 'gps' && locationStatus === 'gps' ? 'active-gps' : ''}`}
          >
            {locationStatus === 'detecting' ? (
              <Loader2 size={18} className="spin-icon" />
            ) : locationStatus === 'denied' || locationStatus === 'error' ? (
              <LocateOff size={18} />
            ) : (
              <LocateFixed size={18} />
            )}
            <span>
              {locationStatus === 'detecting'
                ? t.detectingLocation || 'Detecting...'
                : t.useCurrentGpsLocation || 'Use my current location (GPS)'}
            </span>
          </button>

          {/* Permission Denied Notice */}
          {(locationStatus === 'denied' || locationStatus === 'error') && (
            <div className="loc-permission-alert" role="alert">
              <div className="alert-text-row">
                <AlertTriangle size={15} className="alert-icon" />
                <span>
                  {locationStatus === 'denied'
                    ? t.permissionDeniedNotice || 'Location permission denied. Showing last known place.'
                    : t.gpsServicesOff || 'GPS is turned off. Please enable GPS or choose manually.'}
                </span>
              </div>
              <button type="button" onClick={handleOpenSettings} className="open-settings-btn">
                <Settings size={13} />
                <span>{t.openAppSettings || 'Open Settings'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal View Tabs: Search vs Browse Region */}
        <div className="loc-modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'search'}
            onClick={() => setActiveTab('search')}
            className={`loc-tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          >
            <Search size={14} />
            <span>Search & Mandis</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'browse'}
            onClick={() => setActiveTab('browse')}
            className={`loc-tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
          >
            <Layers size={14} />
            <span>{t.browseRegionTitle || 'Browse State → District → Mandal'}</span>
          </button>
        </div>

        {/* TAB 1: Search & Major Mandis */}
        {activeTab === 'search' && (
          <div className="loc-search-tab-content">
            {/* Search Input */}
            <div className="location-search-wrap">
              <Search size={16} className="loc-search-icon" />
              <input
                type="text"
                placeholder={t.searchPlacePlaceholder || 'Search village, town, district or PIN...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="loc-search-input"
                autoFocus
              />
              {isSearching && <Loader2 size={14} className="spin-icon searching-spinner" />}
              {searchTerm && !isSearching && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="loc-clear-btn"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Recent Locations Section (shown when search is empty) */}
            {!searchTerm && recentLocations && recentLocations.length > 0 && (
              <div className="recent-locations-section">
                <div className="section-title-row">
                  <Clock size={13} />
                  <span>{t.recentLocationsTitle || 'Recent Locations'}</span>
                </div>
                <div className="recent-chips-wrap">
                  {recentLocations.map((rec) => (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => handleSelectAndClose(rec)}
                      className="recent-loc-chip"
                    >
                      <MapPin size={12} />
                      <span>{rec.name[currentLang]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* List of Search Results or Major Mandis */}
            <div className="locations-list">
              {searchTerm ? (
                // Live Search Results
                searchResults.length > 0 ? (
                  searchResults.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleSelectAndClose(loc)}
                      className="location-list-item"
                    >
                      <div className="loc-item-left">
                        <div className="loc-pin-box">
                          <Building2 size={16} />
                        </div>
                        <div className="loc-text-col">
                          <span className="loc-mandi-name">{loc.name[currentLang]}</span>
                          <span className="loc-sub-detail">
                            {loc.district[currentLang]}, {loc.state[currentLang]} {loc.pincode ? `· PIN ${loc.pincode}` : ''}
                          </span>
                        </div>
                      </div>
                      <span className="loc-select-arrow">➔</span>
                    </button>
                  ))
                ) : !isSearching ? (
                  <div className="loc-empty-search">
                    <p>
                      {currentLang === 'hi'
                        ? 'कोई स्थान नहीं मिला। कृपया दूसरा नाम या जिला खोजें।'
                        : currentLang === 'te'
                        ? 'ఫలితాలు లేవు. వేరొక పేరు వెతకండి.'
                        : 'No locations found. Try searching by district or PIN code.'}
                    </p>
                  </div>
                ) : null
              ) : (
                // Major Agricultural Mandi Yards
                AGRICULTURAL_LOCATIONS.map((loc) => {
                  const isSelected = loc.id === currentLocation.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleSelectAndClose(loc)}
                      className={`location-list-item ${isSelected ? 'active-location' : ''}`}
                    >
                      <div className="loc-item-left">
                        <div className="loc-pin-box">
                          <Building2 size={16} />
                        </div>
                        <div className="loc-text-col">
                          <span className="loc-mandi-name">{loc.mandiName[currentLang]}</span>
                          <span className="loc-sub-detail">
                            {loc.name[currentLang]} · {loc.district[currentLang]}, {loc.state[currentLang]} · PIN {loc.pincode}
                          </span>
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="loc-check-badge">
                          <Check size={14} />
                        </span>
                      ) : (
                        <span className="loc-select-arrow">➔</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Browse State -> District -> Mandal */}
        {activeTab === 'browse' && (
          <div className="loc-browse-tab-content">
            {/* Step Breadcrumbs Navigation */}
            <div className="browse-breadcrumb-bar">
              <button
                type="button"
                onClick={() => {
                  setSelectedState(null);
                  setSelectedDistrict(null);
                }}
                className={`breadcrumb-step ${!selectedState ? 'active' : ''}`}
              >
                <span>{t.selectState || '1. State'}</span>
              </button>

              {selectedState && (
                <>
                  <ChevronRight size={14} className="breadcrumb-arrow" />
                  <button
                    type="button"
                    onClick={() => setSelectedDistrict(null)}
                    className={`breadcrumb-step ${selectedState && !selectedDistrict ? 'active' : ''}`}
                  >
                    <span>{selectedState.name[currentLang]}</span>
                  </button>
                </>
              )}

              {selectedDistrict && (
                <>
                  <ChevronRight size={14} className="breadcrumb-arrow" />
                  <span className="breadcrumb-step active">
                    {selectedDistrict.name[currentLang]}
                  </span>
                </>
              )}
            </div>

            {/* Step 1: Select State */}
            {!selectedState && (
              <div className="browse-step-container">
                <span className="step-prompt-text">{t.selectState || 'Select State:'}</span>
                <div className="browse-grid-pills">
                  {HIERARCHICAL_LOCATIONS.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedState(st)}
                      className="browse-pill-card"
                    >
                      <span className="pill-title">{st.name[currentLang]}</span>
                      <span className="pill-meta">{st.districts.length} Districts</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Select District */}
            {selectedState && !selectedDistrict && (
              <div className="browse-step-container">
                <div className="step-header-row">
                  <span className="step-prompt-text">
                    {t.selectDistrict || 'Select District in'} {selectedState.name[currentLang]}:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedState(null)}
                    className="step-back-btn"
                  >
                    ← Back
                  </button>
                </div>
                <div className="browse-grid-pills">
                  {selectedState.districts.map((dist) => (
                    <button
                      key={dist.id}
                      type="button"
                      onClick={() => setSelectedDistrict(dist)}
                      className="browse-pill-card"
                    >
                      <span className="pill-title">{dist.name[currentLang]}</span>
                      <span className="pill-meta">{dist.mandals.length} Mandals / Yards</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Select Mandal */}
            {selectedState && selectedDistrict && (
              <div className="browse-step-container">
                <div className="step-header-row">
                  <span className="step-prompt-text">
                    {t.selectMandal || 'Select Mandal in'} {selectedDistrict.name[currentLang]}:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDistrict(null)}
                    className="step-back-btn"
                  >
                    ← Back
                  </button>
                </div>
                <div className="browse-grid-pills mandals">
                  {selectedDistrict.mandals.map((mandal) => (
                    <button
                      key={mandal.id}
                      type="button"
                      onClick={() => {
                        const loc = buildLocationFromMandal(selectedState, selectedDistrict, mandal);
                        handleSelectAndClose(loc);
                      }}
                      className="browse-pill-card mandal"
                    >
                      <div className="mandal-pill-left">
                        <MapPin size={14} color="#2D5A27" />
                        <span className="pill-title">{mandal.name[currentLang]}</span>
                      </div>
                      <span className="pill-pin">PIN {mandal.pincode}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
