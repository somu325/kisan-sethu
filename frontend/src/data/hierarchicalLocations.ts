import type { Language, LocationOption } from '../types';
import { AGRICULTURAL_LOCATIONS } from './mockData';

export interface MandalItem {
  id: string;
  name: Record<Language, string>;
  pincode: string;
  mandiBenchmarkId: string;
}

export interface DistrictItem {
  id: string;
  name: Record<Language, string>;
  mandals: MandalItem[];
}

export interface StateItem {
  id: string;
  name: Record<Language, string>;
  districts: DistrictItem[];
}

export const HIERARCHICAL_LOCATIONS: StateItem[] = [
  {
    id: 'ap',
    name: { en: 'Andhra Pradesh', hi: 'आंध्र प्रदेश', te: 'ఆంధ్రప్రదేశ్' },
    districts: [
      {
        id: 'guntur',
        name: { en: 'Guntur District', hi: 'गुंटूर जिला', te: 'గుంటూరు జిల్లా' },
        mandals: [
          { id: 'guntur_city', name: { en: 'Guntur Urban', hi: 'गुंटूर शहर', te: 'గుంటూరు అర్బన్' }, pincode: '522001', mandiBenchmarkId: 'guntur' },
          { id: 'tenali', name: { en: 'Tenali', hi: 'तेनाली', te: 'తెనాలి' }, pincode: '522201', mandiBenchmarkId: 'guntur' },
          { id: 'duggirala', name: { en: 'Duggirala Turmeric', hi: 'दुग्गिराला हल्दी', te: 'దుగ్గిరాల పసుపు యార్డ్' }, pincode: '522330', mandiBenchmarkId: 'guntur' },
          { id: 'mangalagiri', name: { en: 'Mangalagiri', hi: 'मंगलगिरि', te: 'మంగళగిరి' }, pincode: '522503', mandiBenchmarkId: 'guntur' },
          { id: 'sattenapalle', name: { en: 'Sattenapalle', hi: 'सत्तेनापल्ले', te: 'సత్తెనపల్లి' }, pincode: '522403', mandiBenchmarkId: 'guntur' }
        ]
      },
      {
        id: 'kurnool',
        name: { en: 'Kurnool District', hi: 'कर्नूल जिला', te: 'కర్నూలు జిల్లా' },
        mandals: [
          { id: 'kurnool_yard', name: { en: 'Kurnool APMC', hi: 'कर्नूल मंडी', te: 'కర్నూలు మార్కెట్' }, pincode: '518001', mandiBenchmarkId: 'kurnool' },
          { id: 'adoni_cotton', name: { en: 'Adoni Cotton Yard', hi: 'अदोनी कपास यार्ड', te: 'ఆదోని పత్తి యార్డ్' }, pincode: '518301', mandiBenchmarkId: 'adoni' },
          { id: 'yemmiganur', name: { en: 'Yemmiganur', hi: 'येम्मिगनूर', te: 'ఎమ్మిగనూరు' }, pincode: '518360', mandiBenchmarkId: 'kurnool' },
          { id: 'dhone', name: { en: 'Dhone', hi: 'डोन', te: 'డోన్' }, pincode: '518222', mandiBenchmarkId: 'kurnool' }
        ]
      },
      {
        id: 'chittoor',
        name: { en: 'Chittoor District', hi: 'चित्तूर जिला', te: 'చిత్తూరు జిల్లా' },
        mandals: [
          { id: 'madanapalle_tomato', name: { en: 'Madanapalle Tomato', hi: 'मदनपल्ले टमाटर मंडी', te: 'మదనపల్లె టమోటా' }, pincode: '517325', mandiBenchmarkId: 'chittoor' },
          { id: 'chittoor_rural', name: { en: 'Chittoor Rural', hi: 'चित्तूर ग्रामीण', te: 'చిత్తూరు రూరల్' }, pincode: '517001', mandiBenchmarkId: 'chittoor' },
          { id: 'palamaner', name: { en: 'Palamaner', hi: 'पलामानेरू', te: 'పలమనేరు' }, pincode: '517408', mandiBenchmarkId: 'chittoor' },
          { id: 'kuppam', name: { en: 'Kuppam', hi: 'कुप्पम', te: 'కుప్పం' }, pincode: '517425', mandiBenchmarkId: 'chittoor' }
        ]
      },
      {
        id: 'tirupati',
        name: { en: 'Tirupati District', hi: 'तिरुपति जिला', te: 'తిరుపతి జిల్లా' },
        mandals: [
          { id: 'tirupati_mandi', name: { en: 'Tirupati Agri Yard', hi: 'तिरुपति कृषि मंडी', te: 'తిరుపతి వ్యవసాయ మార్కెట్' }, pincode: '517501', mandiBenchmarkId: 'tirupati' },
          { id: 'chandragiri', name: { en: 'Chandragiri', hi: 'चंद्रगिरि', te: 'చంద్రగిరి' }, pincode: '517101', mandiBenchmarkId: 'tirupati' },
          { id: 'srikalahasti', name: { en: 'Srikalahasti', hi: 'श्रीकालहस्ती', te: 'శ్రీకాళహస్తి' }, pincode: '517644', mandiBenchmarkId: 'tirupati' }
        ]
      },
      {
        id: 'kadapa',
        name: { en: 'YSR Kadapa District', hi: 'कडपा जिला', te: 'వైఎస్ఆర్ కడప జిల్లా' },
        mandals: [
          { id: 'kadapa_city', name: { en: 'Kadapa Krishna Nagar', hi: 'कडपा कृष्णा नगर', te: 'కడప కృష్ణా నగర్' }, pincode: '516001', mandiBenchmarkId: 'kadapa' },
          { id: 'proddatur', name: { en: 'Proddatur Gold & Agri', hi: 'प्र Proddatur', te: 'ప్రొద్దుటూరు' }, pincode: '516360', mandiBenchmarkId: 'kadapa' },
          { id: 'pulivendula', name: { en: 'Pulivendula Banana', hi: 'पुलिवेंदुला केला यार्ड', te: 'పులివెందుల అరటి యార్డ్' }, pincode: '516390', mandiBenchmarkId: 'kadapa' }
        ]
      },
      {
        id: 'anantapur',
        name: { en: 'Anantapur District', hi: 'अनंतपुर जिला', te: 'అనంతపురం జిల్లా' },
        mandals: [
          { id: 'anantapur_groundnut', name: { en: 'Anantapur Groundnut', hi: 'अनंतपुर मूंगफली यार्ड', te: 'అనంతపురం వేరుశనగ యార్డ్' }, pincode: '515001', mandiBenchmarkId: 'anantapur' },
          { id: 'dharmavaram', name: { en: 'Dharmavaram', hi: 'धर्मावरम', te: 'ధర్మవరం' }, pincode: '515671', mandiBenchmarkId: 'anantapur' },
          { id: 'kadiri', name: { en: 'Kadiri Market', hi: 'कादिरी मंडी', te: 'కదిరి మార్కెట్' }, pincode: '515591', mandiBenchmarkId: 'anantapur' }
        ]
      },
      {
        id: 'krishna',
        name: { en: 'NTR Krishna District', hi: 'एनटीआर कृष्णा जिला', te: 'ఎన్టీఆర్ కృష్ణా జిల్లా' },
        mandals: [
          { id: 'gollapudi', name: { en: 'Gollapudi Wholesale', hi: 'गोल्लापुडी थोक मंडी', te: 'గొల్లపూడి టోకు మార్కెట్' }, pincode: '520001', mandiBenchmarkId: 'vijayawada' },
          { id: 'nandigama', name: { en: 'Nandigama Chilli & Cotton', hi: 'नंदीगामा', te: 'నందిగామ' }, pincode: '521185', mandiBenchmarkId: 'vijayawada' }
        ]
      }
    ]
  },
  {
    id: 'tg',
    name: { en: 'Telangana', hi: 'तेलंगाना', te: 'తెలంగాణ' },
    districts: [
      {
        id: 'warangal',
        name: { en: 'Warangal District', hi: 'वारंगल जिला', te: 'వరంగల్ జిల్లా' },
        mandals: [
          { id: 'warangal_grain', name: { en: 'Warangal Grain & Chilli', hi: 'वारंगल ग्रेन व मिर्च मंडी', te: 'వరంగల్ వ్యవసాయ మార్కెట్' }, pincode: '506002', mandiBenchmarkId: 'warangal' },
          { id: 'narsampet', name: { en: 'Narsampet Maize', hi: 'नरसमपेट मक्का यार्ड', te: 'నర్సంపేట మార్కెట్' }, pincode: '506132', mandiBenchmarkId: 'warangal' }
        ]
      },
      {
        id: 'khammam',
        name: { en: 'Khammam District', hi: 'खम्मम जिला', te: 'ఖమ్మం జిల్లా' },
        mandals: [
          { id: 'khammam_cotton', name: { en: 'Khammam Cotton Yard', hi: 'खम्मम कॉटन यार्ड', te: 'ఖమ్మం కాటన్ యార్డ్' }, pincode: '507001', mandiBenchmarkId: 'khammam' },
          { id: 'sathupally', name: { en: 'Sathupally', hi: 'सतुपल्ली', te: 'సత్తుపల్లి' }, pincode: '507303', mandiBenchmarkId: 'khammam' }
        ]
      }
    ]
  },
  {
    id: 'mh',
    name: { en: 'Maharashtra', hi: 'महाराष्ट्र', te: 'మహారాష్ట్ర' },
    districts: [
      {
        id: 'nashik',
        name: { en: 'Nashik District', hi: 'नासिक जिला', te: 'నాసిక్ జిల్లా' },
        mandals: [
          { id: 'lasalgaon', name: { en: 'Lasalgaon Onion Mandi', hi: 'लासलगांव प्याज मंडी', te: 'లాసల్గావ్ ఉల్లి మార్కెట్' }, pincode: '422306', mandiBenchmarkId: 'nashik' },
          { id: 'pimpalgaon', name: { en: 'Pimpalgaon Baswant', hi: 'पिंपलगांव बसवंत', te: 'పింపాల్‌గావ్' }, pincode: '422209', mandiBenchmarkId: 'nashik' }
        ]
      },
      {
        id: 'nagpur',
        name: { en: 'Nagpur District', hi: 'नागपुर जिला', te: 'నాగ్‌పూర్ జిల్లా' },
        mandals: [
          { id: 'nagpur_orange', name: { en: 'Kalamna Orange & Cotton', hi: 'कलमना संतरा व कपास', te: 'కలమ్నా మార్కెట్' }, pincode: '440001', mandiBenchmarkId: 'nagpur' }
        ]
      }
    ]
  },
  {
    id: 'mp',
    name: { en: 'Madhya Pradesh', hi: 'मध्य प्रदेश', te: 'మధ్యప్రదేశ్' },
    districts: [
      {
        id: 'indore',
        name: { en: 'Indore District', hi: 'इंदौर जिला', te: 'ఇండోర్ జిల్లా' },
        mandals: [
          { id: 'indore_soybean', name: { en: 'Indore APMC Yard', hi: 'इंदौर कृषि उपज मंडी', te: 'ఇండోర్ మార్కెట్ యార్డ్' }, pincode: '452001', mandiBenchmarkId: 'indore' }
        ]
      }
    ]
  }
];

export function buildLocationFromMandal(
  state: StateItem,
  district: DistrictItem,
  mandal: MandalItem
): LocationOption {
  const benchmark =
    AGRICULTURAL_LOCATIONS.find((l) => l.id === mandal.mandiBenchmarkId) ||
    AGRICULTURAL_LOCATIONS[0];

  return {
    id: `mandal_${mandal.id}`,
    name: mandal.name,
    district: district.name,
    state: state.name,
    mandiName: benchmark.mandiName,
    pincode: mandal.pincode
  };
}
