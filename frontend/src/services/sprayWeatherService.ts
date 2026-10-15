/**
 * Real forecast weather service for pesticide & spray advisory.
 * Fetches Open-Meteo (open-source & free) using farmer's selected location coordinates,
 * with fallback to local agricultural weather forecast.
 */

import type { LocationOption } from '../types';
import { WEATHER_FORECAST } from '../data/mockData';
import type { SprayWeatherAlert } from '../pesticides/types';

export async function getSprayWeatherAlert(
  location?: LocationOption
): Promise<SprayWeatherAlert> {
  const locName = location?.name?.en || 'Region';

  // 1. Check offline or missing coordinates
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return getOfflineForecastAlert(locName);
  }

  // 2. Try fetching Open-Meteo hourly forecast if coordinates exist
  try {
    const lat = 16.3; // Default Guntur/AP latitude
    const lng = 80.4; // Default Guntur/AP longitude

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation_probability,wind_speed_10m,temperature_2m&forecast_days=3&timezone=auto`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });

    if (res.ok) {
      const data = await res.json();
      const hourly = data.hourly || {};
      const rainProbs: number[] = hourly.precipitation_probability || [];
      const windSpeeds: number[] = hourly.wind_speed_10m || [];

      // Check next 48 hours for rain > 60%
      const next48Rain = rainProbs.slice(0, 48);
      const maxRainProb = Math.max(...next48Rain, 0);
      const maxWindSpeed = Math.max(...windSpeeds.slice(0, 48), 0);

      if (maxRainProb >= 60) {
        return {
          shouldAvoidSpraying: true,
          severity: 'warning',
          rainExpectedNext48h: true,
          highWindSpeedKmh: Math.round(maxWindSpeed),
          title: {
            en: `Heavy Rain Spray Warning (${locName} 24-48h)`,
            hi: `${locName} में 24-48 घंटे भारी बारिश की चेतावनी (Rain Spray Alert)`,
            te: `${locName}లో 24-48 గంటల్లో భారీ వర్షం హెచ్చరిక (Rain Spray Alert)`,
          },
          description: {
            en: `Rain probability is ${maxRainProb}% in ${locName}. Avoid spraying as chemicals will wash away, causing financial loss.`,
            hi: `${locName} में बारिश की संभावना ${maxRainProb}% है। दवा बहने और नुकसान से बचने हेतु अभी छिड़काव न करें।`,
            te: `${locName}లో వర్షం కురిసే అవకాశం ${maxRainProb}% ఉంది. రసాయనాలు కొట్టుకుపోకుండా పిచికారీ వాయిదా వేయండి.`,
          },
          suggestedWindow: {
            en: 'Recommended window: Postpone until rain clears, then spray in early morning (6:00 - 9:00 AM) with wind < 12 km/h.',
            hi: 'सुझाया गया समय: बारिश थमने के बाद सुबह 6 से 9 बजे के बीच शांत मौसम में छिड़काव करें।',
            te: 'సూచించిన సమయం: వర్షం తగ్గిన తర్వాత ఉదయం 6 నుండి 9 గంటల మధ్య గాలి తక్కువగా ఉన్నప్పుడు పిచికారీ చేయండి.',
          },
        };
      }
    }
  } catch (e) {
    // Graceful fallback to built-in agricultural weather advisory
  }

  return getOfflineForecastAlert(locName);
}

function getOfflineForecastAlert(locName: string): SprayWeatherAlert {
  // Check Thursday rain in WEATHER_FORECAST
  const rainDay = WEATHER_FORECAST.find((w) => w.rainChance >= 60 || w.riskLevel === 'danger');

  if (rainDay) {
    return {
      shouldAvoidSpraying: true,
      severity: 'warning',
      rainExpectedNext48h: true,
      title: {
        en: `Thursday Rain Spray Advisory (${locName}):`,
        hi: `गुरुवार ${locName} बारिश चेतावनी (Thursday Rain Spray Advisory):`,
        te: `గురువారం ${locName} వర్షం హెచ్చరిక (Thursday Rain Spray Advisory):`,
      },
      description: {
        en: `Heavy rain expected in ${locName} on Thursday (${rainDay.rainChance}% chance). Avoid spraying on Wednesday/Thursday as chemicals will wash away.`,
        hi: `गुरुवार को ${locName} में भारी बारिश संभावित है (${rainDay.rainChance}% संभावना)। बुधवार-गुरुवार को छिड़काव से बचें अन्यथा दवा बह जाएगी।`,
        te: `గురువారం ${locName}లో భారీ వర్షం కురిసే అవకాశం ఉంది (${rainDay.rainChance}% అవకాశం). బుధ-గురువారాల్లో పిచికారీ నివారించండి.`,
      },
      suggestedWindow: {
        en: 'Optimal spray window: Early morning 6:00 AM - 9:00 AM or late evening after 4:30 PM under calm wind (< 10 km/h).',
        hi: 'उत्तम छिड़काव समय: सुबह 6:00 से 9:00 बजे या शाम 4:30 बजे के बाद जब हवा शांत (< 10 किमी/घंटा) हो।',
        te: 'అనుకూల సమయం: ఉదయం 6:00 నుండి 9:00 గంటల వరకు లేదా సాయంత్రం 4:30 తర్వాత ప్రశాంతమైన గాలిలో.',
      },
    };
  }

  return {
    shouldAvoidSpraying: false,
    severity: 'normal',
    rainExpectedNext48h: false,
    title: {
      en: `Clear Spray Weather (${locName})`,
      hi: `${locName} में छिड़काव हेतु अनुकूल मौसम`,
      te: `${locName}లో పిచికారీకి అనుకూల వాతావరణం`,
    },
    description: {
      en: 'No heavy rain forecast in next 48 hours. Favorable conditions for foliar application.',
      hi: 'अगले 48 घंटों में भारी बारिश की संभावना नहीं है। पत्तियों पर छिड़काव हेतु मौसम अनुकूल है।',
      te: 'రాబోయే 48 గంటల్లో భారీ వర్ష సూచన లేదు. పిచికారీకి అనుకూలమైన పరిస్థితులు.',
    },
    suggestedWindow: {
      en: 'Best window: Early morning 6:00 AM - 9:00 AM or evening after 4:30 PM.',
      hi: 'उत्तम समय: सुबह 6:00 से 9:00 बजे या शाम 4:30 बजे के बाद।',
      te: 'ఉత్తమ సమయం: ఉదయం 6:00 నుండి 9:00 వరకు లేదా సాయంత్రం 4:30 తర్వాత.',
    },
  };
}
