import { useState, useRef, useEffect, type FC } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import type { Language, LocationOption } from '../types';
import { translations } from '../data/i18n';
import { CROP_CHIPS, AGRICULTURAL_LOCATIONS } from '../data/mockData';
import { Search, Mic, Globe, User, MapPin, Sparkles, ChevronDown, Check, Building2, LocateFixed, LocateOff, Loader2 } from 'lucide-react';
import type { LocationMode, LocationStatus } from '../hooks/useUserLocation';

interface HeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  isAiModeEnabled: boolean;
  onToggleAiMode: (enabled: boolean) => void;
  onOpenAiAssistant: () => void;
  onOpenLogin: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectCrop: (cropKey: string) => void;
  isLoggedIn: boolean;
  userName?: string;
  currentLocation: LocationOption;
  onOpenLocationModal: () => void;
  onSelectLocation?: (loc: LocationOption) => void;
  locationStatus?: LocationStatus;
  locationMode?: LocationMode;
}

export const Header: FC<HeaderProps> = ({
  currentLang,
  onLanguageChange,
  isAiModeEnabled,
  onToggleAiMode: _onToggleAiMode,
  onOpenAiAssistant,
  onOpenLogin,
  searchQuery,
  onSearchChange,
  onSelectCrop,
  isLoggedIn,
  userName,
  currentLocation,
  onOpenLocationModal,
  onSelectLocation,
  locationStatus = 'gps',
  locationMode = 'gps'
}) => {
  const t = translations[currentLang];
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [locationSearchFilter, setLocationSearchFilter] = useState('');

  const locationDropdownRef = useRef<any>(null);
  const langDropdownRef = useRef<any>(null);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(target)) {
        setShowLocationDropdown(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(target)) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);

  const handleVoiceSearch = () => {
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = currentLang === 'te' ? 'te-IN' : currentLang === 'hi' ? 'hi-IN' : 'en-IN';
        setIsListening(true);
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          onSearchChange(transcript);
          const matchedCrop = CROP_CHIPS.find(
            (c) =>
              c.name[currentLang].toLowerCase().includes(transcript.toLowerCase()) ||
              c.key.toLowerCase().includes(transcript.toLowerCase())
          );
          if (matchedCrop) {
            onSelectCrop(matchedCrop.key);
          }
          setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
      } catch (e) {
        console.warn('Voice recognition error', e);
        setIsListening(false);
      }
    } else {
      alert(currentLang === 'hi' ? 'बोलकर खोजने की सुविधा उपलब्ध नहीं है।' : 'Voice search is not supported in this browser.');
    }
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    const matchedCrop = CROP_CHIPS.find(
      (c) =>
        c.name[currentLang].toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.key.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (matchedCrop) {
      onSelectCrop(matchedCrop.key);
    }
    setShowSuggestions(false);
  };

  const filteredCrops = searchQuery.trim()
    ? CROP_CHIPS.filter(
        (c) =>
          c.name[currentLang].toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.key.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : CROP_CHIPS.slice(0, 5);

  const filteredLocations = AGRICULTURAL_LOCATIONS.filter((loc) => {
    if (!locationSearchFilter.trim()) return true;
    const term = locationSearchFilter.toLowerCase();
    return (
      loc.name[currentLang].toLowerCase().includes(term) ||
      loc.state[currentLang].toLowerCase().includes(term) ||
      loc.district[currentLang].toLowerCase().includes(term) ||
      loc.mandiName[currentLang].toLowerCase().includes(term) ||
      loc.pincode.includes(term)
    );
  });

  const verifiedBadgeText =
    currentLang === 'hi' ? 'सत्यापित किसान' : currentLang === 'te' ? 'ధృవీకరించిన రైతు' : 'Verified Farmer';

  const langDisplay = currentLang === 'hi' ? 'हिन्दी' : currentLang === 'te' ? 'తెలుగు' : 'EN';

  return (
    <View style={styles.header}>
      {/* Brand Row */}
      <View style={styles.headerInner}>
        <View style={styles.brandRow}>
          <Text style={styles.brandIcon}>🌾</Text>
          <View>
            <Text style={styles.brandTitle}>{t.appName}</Text>
            <Text style={styles.brandTagline}>{t.tagline}</Text>
          </View>
        </View>

        {/* Search Bar Wrap */}
        <View style={styles.searchBarWrap}>
          <View style={styles.searchBox}>
            <Search size={18} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder={t.searchPlaceholder}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onFocus={() => setShowSuggestions(true)}
              onChangeText={(txt) => {
                onSearchChange(txt);
                setShowSuggestions(true);
              }}
              onSubmitEditing={handleSearchSubmit}
            />
            <TouchableOpacity
              onPress={handleVoiceSearch}
              style={[styles.micBtn, isListening && styles.micBtnListening]}
              activeOpacity={0.7}
            >
              <Mic size={16} color={isListening ? '#DC2626' : '#2D5A27'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSearchSubmit}
              style={styles.searchSubmitBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.searchSubmitText}>{t.searchBtn}</Text>
            </TouchableOpacity>
          </View>

          {/* Autocomplete Suggestions Popup */}
          {showSuggestions && (
            <View style={styles.suggestionsDropdown}>
              <View style={styles.suggestionsHeader}>
                <Text style={styles.suggestionsHeaderText}>{t.popularCropsLabel}</Text>
                <TouchableOpacity onPress={() => setShowSuggestions(false)} style={styles.closeSuggBtn}>
                  <Text style={styles.closeSuggText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.suggestionsGrid}>
                {filteredCrops.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => {
                      onSelectCrop(c.key);
                      onSearchChange(c.name[currentLang]);
                      setShowSuggestions(false);
                    }}
                    style={styles.suggestionItem}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggIcon}>{c.icon}</Text>
                    <Text style={styles.suggName}>{c.name[currentLang]}</Text>
                    <Text style={styles.suggCount}>{c.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Actions Wrap: Location, Language, AI Mode, and Login */}
        <View style={styles.actionsWrap}>
          {/* Location Chip */}
          <View ref={locationDropdownRef} style={styles.dropdownContainer}>
            <TouchableOpacity
              onPress={() => {
                onOpenLocationModal();
                setShowLanguageDropdown(false);
              }}
              style={styles.locationBtn}
              activeOpacity={0.7}
              accessibilityLabel={t.selectLocationTitle}
              accessibilityHint={
                locationStatus === 'gps'
                  ? t.gpsAutoModeActive || 'Auto GPS Mode Active'
                  : locationStatus === 'denied' || locationStatus === 'error'
                  ? t.permissionDeniedNotice || 'Location permission denied'
                  : t.manualLocationMode || 'Manual Location'
              }
              {...({
                title:
                  locationStatus === 'gps'
                    ? t.gpsAutoModeActive || 'Auto GPS Mode Active'
                    : locationStatus === 'denied' || locationStatus === 'error'
                    ? t.permissionDeniedNotice || 'Location permission denied'
                    : t.manualLocationMode || 'Manual Location'
              } as any)}
            >
              {locationStatus === 'detecting' ? (
                <Loader2
                  size={14}
                  color="#2D5A27"
                  className="spin-icon"
                  style={{ animation: 'spin 1s linear infinite' } as any}
                />
              ) : locationStatus === 'denied' || locationStatus === 'error' ? (
                <LocateOff size={14} color="#94A3B8" />
              ) : locationStatus === 'gps' || (locationMode === 'gps' && locationStatus !== 'manual') ? (
                <LocateFixed size={14} color="#2D5A27" />
              ) : (
                <MapPin size={14} color="#2D5A27" />
              )}

              <Text style={styles.locName} numberOfLines={1}>
                {locationStatus === 'detecting'
                  ? t.detectingLocation || 'Detecting...'
                  : currentLocation.name[currentLang]}
              </Text>

              <ChevronDown
                size={13}
                color={
                  locationStatus === 'denied' || locationStatus === 'error'
                    ? '#94A3B8'
                    : '#2D5A27'
                }
              />
            </TouchableOpacity>

            {showLocationDropdown && (
              <View style={styles.locationMenuDropdown}>
                <View style={styles.dropdownHeaderRow}>
                  <View style={styles.dropdownTitleWrap}>
                    <MapPin size={14} color="#2D5A27" />
                    <Text style={styles.dropdownHeaderTitle}>
                      {currentLang === 'hi'
                        ? 'मंडी व स्थान चुनें'
                        : currentLang === 'te'
                        ? 'మార్కెట్ యార్డ్ ఎంచుకోండి'
                        : 'Select Mandi Yard'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowLocationDropdown(false)}
                    style={styles.closeDropdownBtn}
                    accessibilityLabel="Close"
                  >
                    <Text style={styles.closeDropdownText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick Search inside Location Dropdown */}
                <View style={styles.locSearchBox}>
                  <Search size={13} color="#64748B" />
                  <TextInput
                    style={styles.locSearchInput}
                    placeholder={
                      currentLang === 'hi'
                        ? 'मंडी, जिला या पिन खोजें...'
                        : currentLang === 'te'
                        ? 'యార్డ్ లేదా పిన్ కోడ్...'
                        : 'Filter mandi or PIN...'
                    }
                    placeholderTextColor="#94A3B8"
                    value={locationSearchFilter}
                    onChangeText={setLocationSearchFilter}
                  />
                  {locationSearchFilter ? (
                    <TouchableOpacity onPress={() => setLocationSearchFilter('')}>
                      <Text style={styles.locClearFilterText}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Scrollable list of Mandi Locations */}
                <ScrollView
                  style={styles.locListScroll}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {filteredLocations.map((loc) => {
                    const isSelected = loc.id === currentLocation.id;
                    const handleSelectThisLocation = () => {
                      if (onSelectLocation) {
                        onSelectLocation(loc);
                      }
                      setShowLocationDropdown(false);
                      setLocationSearchFilter('');
                    };
                    return (
                      <TouchableOpacity
                        key={loc.id}
                        onPress={handleSelectThisLocation}
                        {...({
                          onClick: (e: any) => {
                            e.stopPropagation();
                            handleSelectThisLocation();
                          }
                        } as any)}
                        style={[styles.locMenuItem, isSelected && styles.locMenuItemActive]}
                        activeOpacity={0.7}
                      >
                        <Building2 size={14} color={isSelected ? '#2D5A27' : '#64748B'} />
                        <View style={styles.locTextColumn}>
                          <Text
                            style={[styles.locItemMandi, isSelected && styles.locItemMandiActive]}
                            numberOfLines={1}
                          >
                            {loc.mandiName[currentLang]}
                          </Text>
                          <Text style={styles.locItemSub} numberOfLines={1}>
                            {loc.name[currentLang]} · {loc.district[currentLang]}, {loc.state[currentLang]} ({loc.pincode})
                          </Text>
                        </View>
                        {isSelected && <Check size={14} color="#2D5A27" />}
                      </TouchableOpacity>
                    );
                  })}
                  {filteredLocations.length === 0 && (
                    <Text style={styles.noLocFoundText}>
                      {currentLang === 'hi'
                        ? 'कोई मंडी नहीं मिली'
                        : currentLang === 'te'
                        ? 'ఫలితాలు లేవు'
                        : 'No mandi found'}
                    </Text>
                  )}
                </ScrollView>

                {/* Footer to open advanced modal search */}
                <TouchableOpacity
                  onPress={() => {
                    setShowLocationDropdown(false);
                    onOpenLocationModal();
                  }}
                  style={styles.locMenuFooter}
                  activeOpacity={0.8}
                >
                  <Text style={styles.locMenuFooterText}>
                    🔍 {currentLang === 'hi' ? 'सभी मंडियां व नक्शा देखें...' : currentLang === 'te' ? 'మరిన్ని మార్కెట్లు & మ్యాప్...' : 'All Mandis & Map search...'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Language Dropdown */}
          <View ref={langDropdownRef} style={styles.dropdownContainer}>
            <TouchableOpacity
              onPress={() => {
                setShowLanguageDropdown((prev) => !prev);
                setShowLocationDropdown(false);
              }}
              style={[styles.langBtn, showLanguageDropdown && styles.dropdownBtnActive]}
              activeOpacity={0.7}
              accessibilityLabel="Select Language"
            >
              <Globe size={14} color="#334155" />
              <Text style={styles.langText}>{langDisplay}</Text>
              <ChevronDown
                size={13}
                color="#334155"
                style={{
                  transform: showLanguageDropdown ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease'
                }}
              />
            </TouchableOpacity>

            {showLanguageDropdown && (
              <View style={styles.langMenuDropdown}>
                <View style={styles.dropdownHeaderRow}>
                  <Text style={styles.dropdownHeaderTitle}>
                    {currentLang === 'hi' ? 'भाषा चुनें' : currentLang === 'te' ? 'భాషను ఎంచుకోండి' : 'Language'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowLanguageDropdown(false)}
                    style={styles.closeDropdownBtn}
                    accessibilityLabel="Close"
                  >
                    <Text style={styles.closeDropdownText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {[
                  { code: 'hi' as Language, label: 'हिन्दी', sub: 'Hindi', flag: '🇮🇳' },
                  { code: 'te' as Language, label: 'తెలుగు', sub: 'Telugu', flag: '🇮🇳' },
                  { code: 'en' as Language, label: 'English', sub: 'EN', flag: '🌐' }
                ].map((item) => {
                  const isSelected = item.code === currentLang;
                  const handleSelectThisLang = () => {
                    onLanguageChange(item.code);
                    setShowLanguageDropdown(false);
                  };
                  return (
                    <TouchableOpacity
                      key={item.code}
                      onPress={handleSelectThisLang}
                      {...({
                        onClick: (e: any) => {
                          e.stopPropagation();
                          handleSelectThisLang();
                        }
                      } as any)}
                      style={[styles.langMenuItem, isSelected && styles.langMenuItemActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 14 }}>{item.flag}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.langItemLabel, isSelected && styles.langItemLabelActive]}>
                          {item.label}
                        </Text>
                        <Text style={styles.langItemSub}>{item.sub}</Text>
                      </View>
                      {isSelected && <Check size={14} color="#2D5A27" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* AI Voice Assistant Mode Quick Launcher */}
          <TouchableOpacity
            onPress={onOpenAiAssistant}
            style={[styles.aiModeBtn, isAiModeEnabled ? styles.aiModeActive : styles.aiModeDisabled]}
            activeOpacity={0.8}
          >
            <Sparkles size={14} color={isAiModeEnabled ? '#FFE600' : '#94A3B8'} />
            <Text style={[styles.aiModeText, isAiModeEnabled && styles.aiModeTextActive]}>
              {isAiModeEnabled
                ? (currentLang === 'hi' ? 'एआई चालू' : currentLang === 'te' ? 'AI ఆన్' : 'AI Mode')
                : (currentLang === 'hi' ? 'एआई बंद' : currentLang === 'te' ? 'AI ఆఫ్' : 'AI Off')}
            </Text>
            <View style={[styles.aiStatusDot, isAiModeEnabled ? styles.aiDotOn : styles.aiDotOff]} />
          </TouchableOpacity>

          {/* Profile / Login Button */}
          <TouchableOpacity
            onPress={onOpenLogin}
            style={[styles.authBtn, isLoggedIn && styles.authBtnLoggedIn]}
            activeOpacity={0.8}
            accessibilityLabel={isLoggedIn ? verifiedBadgeText : t.loginBtn}
          >
            <User size={15} color={isLoggedIn ? '#2D5A27' : '#FFFFFF'} />
            <Text style={[styles.authBtnText, isLoggedIn && styles.authBtnTextLoggedIn]}>
              {isLoggedIn
                ? (userName || (currentLang === 'hi' ? 'किसान प्रोफाइल' : currentLang === 'te' ? 'రైతు ప్రొఫైల్' : 'Farmer Profile'))
                : t.loginBtn}
            </Text>
            {isLoggedIn && <View style={styles.authDot} />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    zIndex: 100,
    flexShrink: 0,
    position: 'sticky' as any,
    top: 0,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    fontSize: 26,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E3F1A',
    letterSpacing: -0.3,
  },
  brandTagline: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  searchBarWrap: {
    flex: 1,
    minWidth: 260,
    position: 'relative',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    paddingVertical: 4,
  },
  micBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#EFF7EE',
  },
  micBtnListening: {
    backgroundColor: '#FEE2E2',
  },
  searchSubmitBtn: {
    backgroundColor: '#2D5A27',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  searchSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    zIndex: 200,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionsHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  closeSuggBtn: {
    padding: 2,
  },
  closeSuggText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  suggIcon: {
    fontSize: 14,
  },
  suggName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  suggCount: {
    fontSize: 10,
    color: '#94A3B8',
  },
  actionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  locName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    maxWidth: 130,
  },
  locChange: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2D5A27',
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  langText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  aiModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  aiModeActive: {
    backgroundColor: '#2D5A27',
    borderColor: '#2D5A27',
  },
  aiModeDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  aiModeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  aiModeTextActive: {
    color: '#FFFFFF',
  },
  aiStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  aiDotOn: {
    backgroundColor: '#00E676',
  },
  aiDotOff: {
    backgroundColor: '#94A3B8',
  },
  authBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2D5A27',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  authBtnLoggedIn: {
    backgroundColor: '#EFF7EE',
    borderWidth: 1,
    borderColor: '#2D5A27',
  },
  authBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  authBtnTextLoggedIn: {
    color: '#2D5A27',
  },
  authDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 110,
  },
  dropdownBtnActive: {
    backgroundColor: '#E2E8F0',
  },
  locationMenuDropdown: {
    position: 'absolute' as any,
    top: 36,
    right: 0,
    width: 290,
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 8,
    zIndex: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 6,
  },
  dropdownTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropdownHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeDropdownBtn: {
    padding: 3,
  },
  closeDropdownText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
  },
  locSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
    marginBottom: 6,
  },
  locSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    padding: 0,
  },
  locClearFilterText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  locListScroll: {
    maxHeight: 220,
  },
  locMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  locMenuItemActive: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  locTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  locItemMandi: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  locItemMandiActive: {
    color: '#2D5A27',
  },
  locItemSub: {
    fontSize: 10,
    color: '#64748B',
  },
  noLocFoundText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 10,
  },
  locMenuFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 6,
    paddingTop: 6,
    paddingHorizontal: 6,
  },
  locMenuFooterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2D5A27',
    textAlign: 'center',
  },
  langMenuDropdown: {
    position: 'absolute' as any,
    top: 36,
    right: 0,
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 6,
    zIndex: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  langMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  langMenuItemActive: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  langItemLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  langItemLabelActive: {
    color: '#2D5A27',
  },
  langItemSub: {
    fontSize: 10,
    color: '#64748B',
  },
});
