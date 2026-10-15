import type { Language } from '../../types';

export interface MarketTranslationStrings {
  screenTitle: string;
  screenSubtitle: string;
  allChip: string;
  apmcChip: string;
  mandiChip: string;
  searchPlaceholder: string;
  mapView: string;
  listView: string;
  myLocationBtn: string;
  locatingText: string;
  locationPermissionDenied: string;
  apmcBadge: string;
  mandiBadge: string;
  addressLabel: string;
  hoursLabel: string;
  phoneLabel: string;
  commoditiesLabel: string;
  getDirectionsBtn: string;
  callBtn: string;
  distanceAway: string;
  emptyTitle: string;
  emptySubtitle: string;
  errorTitle: string;
  errorSubtitle: string;
  retryBtn: string;
  legendApmc: string;
  legendMandi: string;
  legendCluster: string;
  attribution: string;
  closeSheet: string;
}

export const MARKETS_I18N: Record<Language, MarketTranslationStrings> = {
  en: {
    screenTitle: 'Nearby Markets',
    screenSubtitle: 'Explore APMC market yards and local grain & vegetable mandis across India',
    allChip: 'All Markets',
    apmcChip: 'APMC Yards',
    mandiChip: 'Local Mandis',
    searchPlaceholder: 'Search by market, district, state, or crop...',
    mapView: 'Map View',
    listView: 'List View',
    myLocationBtn: 'My Location',
    locatingText: 'Locating farm...',
    locationPermissionDenied: 'Location access was not granted. Showing national market overview.',
    apmcBadge: 'APMC Yard',
    mandiBadge: 'Local Mandi',
    addressLabel: 'Address',
    hoursLabel: 'Auction & Trading Hours',
    phoneLabel: 'Helpline / APMC Office',
    commoditiesLabel: 'Main Traded Commodities',
    getDirectionsBtn: 'Get Directions',
    callBtn: 'Call Office',
    distanceAway: 'away',
    emptyTitle: 'No markets found matching your criteria',
    emptySubtitle: 'Try expanding your search, changing the filter chip, or zooming out.',
    errorTitle: 'Unable to load market data',
    errorSubtitle: 'There was a problem loading market locations. Please try again.',
    retryBtn: 'Retry Loading',
    legendApmc: 'APMC Yard',
    legendMandi: 'Local Mandi',
    legendCluster: 'Multiple Markets',
    attribution: '© OpenStreetMap contributors',
    closeSheet: 'Close Details'
  },
  hi: {
    screenTitle: 'निकटतम मंडियां व एपीएमसी',
    screenSubtitle: 'पूरे भारत में सरकारी एपीएमसी यार्ड एवं स्थानीय अनाज व सब्जी मंडियों का नक्शा',
    allChip: 'सभी मंडियां',
    apmcChip: 'एपीएमसी यार्ड',
    mandiChip: 'स्थानीय मंडियां',
    searchPlaceholder: 'मंडी, जिला, राज्य या फसल के नाम से खोजें...',
    mapView: 'नक्शा देखें',
    listView: 'सूची देखें',
    myLocationBtn: 'मेरी लोकेशन',
    locatingText: 'स्थान खोज रहे हैं...',
    locationPermissionDenied: 'स्थान अनुमति नहीं मिली। भारत का सामान्य दृश्य दिखाया जा रहा है।',
    apmcBadge: 'सरकारी एपीएमसी यार्ड',
    mandiBadge: 'स्थानीय मंडी',
    addressLabel: 'पता व स्थल',
    hoursLabel: 'नीलामी व कार्य समय',
    phoneLabel: 'मंडी कार्यालय / फोन',
    commoditiesLabel: 'प्रमुख व्यापारिक फसलें',
    getDirectionsBtn: 'रास्ता देखें (दिशा-निर्देश)',
    callBtn: 'फोन लगाएं',
    distanceAway: 'दूरी पर',
    emptyTitle: 'कोई मंडी नहीं मिली',
    emptySubtitle: 'कृपया दूसरा नाम खोजें या फिल्टर बदलकर देखें।',
    errorTitle: 'मंडी डेटा लोड नहीं हो सका',
    errorSubtitle: 'नेटवर्क में समस्या हो सकती है। कृपया पुनः प्रयास करें।',
    retryBtn: 'पुनः प्रयास करें',
    legendApmc: 'एपीएमसी यार्ड',
    legendMandi: 'स्थानीय मंडी',
    legendCluster: 'मंडी समूह',
    attribution: '© OpenStreetMap contributors',
    closeSheet: 'बंद करें'
  },
  te: {
    screenTitle: 'సమీప మార్కెట్ యార్డులు',
    screenSubtitle: 'భారతదేశ వ్యాప్తంగా ప్రభుత్వ ఏపీఎంసీ మార్కెట్లు మరియు స్థానిక వ్యవసాయ మండీల మ్యాప్',
    allChip: 'అన్ని మార్కెట్లు',
    apmcChip: 'ఏపీఎంసీ యార్డులు',
    mandiChip: 'స్థానిక మండీలు',
    searchPlaceholder: 'మార్కెట్, జిల్లా, రాష్ట్రం లేదా పంట పేరుతో వెతకండి...',
    mapView: 'మ్యాప్ వీక్షణ',
    listView: 'జాబితా వీక్షణ',
    myLocationBtn: 'నా స్థానం',
    locatingText: 'లొకేషన్ శోధిస్తోంది...',
    locationPermissionDenied: 'లొకేషన్ అనుమతి లభించలేదు. సాధారణ మ్యాప్ చూపబడుతోంది.',
    apmcBadge: 'ఏపీఎంసీ యార్డ్',
    mandiBadge: 'స్థానిక మార్కెట్',
    addressLabel: 'చిరునామా',
    hoursLabel: 'వేలం & పని వేళలు',
    phoneLabel: 'మార్కెట్ కార్యాలయం',
    commoditiesLabel: 'ప్రధాన వాణిజ్య పంటలు',
    getDirectionsBtn: 'రూట్ మ్యాప్ (దిశలు)',
    callBtn: 'కాల్ చేయండి',
    distanceAway: 'దూరంలో',
    emptyTitle: 'ఎలాంటి మార్కెట్లు కనుగొనబడలేదు',
    emptySubtitle: 'దయచేసి సెర్చ్ పదం లేదా ఫిల్టర్‌ని మార్చి ప్రయత్నించండి.',
    errorTitle: 'డేటా లోడ్ కాలేదు',
    errorSubtitle: 'మార్కెట్ల సమాచారం లోడ్ చేయడంలో సమస్య ఏర్పడింది.',
    retryBtn: 'మళ్లీ ప్రయత్నించండి',
    legendApmc: 'ఏపీఎంసీ యార్డ్',
    legendMandi: 'స్థానిక మండీ',
    legendCluster: 'మార్కెట్ క్లస్టర్',
    attribution: '© OpenStreetMap contributors',
    closeSheet: 'మూసివేయి'
  }
};
