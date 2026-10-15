/**
 * Intent Handler for 'NEAREST_MANDI'.
 * Finds APMC and Mandi yards closest to the user's shared location coordinates,
 * expanding search radius (10km -> 25km -> 50km -> 100km).
 */

import type { IntentHandler, IntentHandlerContext, IntentHandlerResponse, MandiCardData } from '../types.ts';
import { getMarketRepository } from '../../../data/marketDataSource.ts';
import { LOCATION_COORDINATES } from '../../../data/mockData.ts';
import { expandSearchRadius, SEARCH_RADIUS_STEPS } from '../utils/distance.ts';
import { translations } from '../../../data/i18n.ts';

export class NearestMandiHandler implements IntentHandler {
  async handle(ctx: IntentHandlerContext): Promise<IntentHandlerResponse> {
    const t = translations[ctx.language] || translations.en;

    // 1. Resolve user coordinates from context or shared location
    let userLat = ctx.userCoords?.lat;
    let userLng = ctx.userCoords?.lng;

    if (userLat === undefined || userLng === undefined) {
      if (ctx.location?.id && LOCATION_COORDINATES[ctx.location.id]) {
        userLat = LOCATION_COORDINATES[ctx.location.id].lat;
        userLng = LOCATION_COORDINATES[ctx.location.id].lng;
      }
    }

    // 2. If no location available, prompt user politely with action to select location
    if (userLat === undefined || userLng === undefined) {
      return {
        chatMessages: [
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            text: t.missingLocationPrompt,
            speechText: t.missingLocationPrompt,
            timestamp: Date.now(),
            actions: [
              {
                id: 'act_location',
                label: t.selectLocationAction,
                actionType: 'open_location',
              },
            ],
          },
        ],
        speechText: t.missingLocationPrompt,
        actions: [
          {
            id: 'act_location',
            label: t.selectLocationAction,
            actionType: 'open_location',
          },
        ],
      };
    }

    // 3. Query repository with expanding radius: 10km -> 25km -> 50km -> 100km
    const repo = getMarketRepository();
    const { results } = await expandSearchRadius(SEARCH_RADIUS_STEPS, async (radiusKm) => {
      return repo.getNearby(userLat!, userLng!, radiusKm);
    });

    // 4. If no mandis found even at 100km
    if (!results || results.length === 0) {
      const noneFoundText = t.nearestMandiNoneFound;
      return {
        chatMessages: [
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            text: noneFoundText,
            speechText: noneFoundText,
            timestamp: Date.now(),
            actions: [
              {
                id: 'act_change_loc',
                label: t.selectLocationAction,
                actionType: 'open_location',
              },
            ],
          },
        ],
        speechText: noneFoundText,
        actions: [
          {
            id: 'act_change_loc',
            label: t.selectLocationAction,
            actionType: 'open_location',
          },
        ],
      };
    }

    // 5. Select nearest 3 results sorted by distance
    const top3 = results.slice(0, 3);
    const topMandi = top3[0];

    const cards: MandiCardData[] = top3.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      distanceKm: Math.round(m.distanceKm * 10) / 10,
      address: m.address,
      district: m.district,
      state: m.state,
      latitude: m.latitude,
      longitude: m.longitude,
      phone: m.phone,
      openingHours: m.openingHours,
    }));

    // 6. Build short speech text (Do not read addresses, phone numbers, or URLs aloud)
    const speech = t.nearestMandiSpeech
      .replace('{name}', topMandi.name)
      .replace('{distance}', String(Math.round(topMandi.distanceKm * 10) / 10));

    return {
      chatMessages: [
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          text: t.nearestMandiHeading,
          speechText: speech,
          timestamp: Date.now(),
          cards,
          actions: [
            {
              id: 'act_mandi_chip',
              label: t.nearestMandiChip,
              actionType: 'query',
              payload: t.nearestMandiChip,
            },
          ],
        },
      ],
      speechText: speech,
    };
  }
}
