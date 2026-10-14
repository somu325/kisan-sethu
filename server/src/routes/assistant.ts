import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getMarketRepository } from '../db/index.js';
import { logger } from '../logger.js';

export const assistantRouter = Router();

const mandiQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radiusKm: z.coerce.number().default(50),
  language: z.string().default('en'),
});

/**
 * POST /assistant/nearest-mandi
 * Deterministic API endpoint for voice assistant Phase 1 nearest mandi queries.
 * Grounded strictly in repository data. Zero LLM hallucinations.
 */
assistantRouter.post('/nearest-mandi', async (req: Request, res: Response) => {
  const parsed = mandiQuerySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid coordinates', details: parsed.error.format() },
    });
    return;
  }

  const { lat, lng, radiusKm, language } = parsed.data;

  try {
    const repo = getMarketRepository();
    // Progressive radius expansion: 10km -> 25km -> 50km -> 100km
    const radiusSteps = [10, 25, 50, 100];
    let markets: any[] = [];
    let effectiveRadius = radiusKm;

    for (const step of radiusSteps) {
      markets = await repo.getNearby(lat, lng, step);
      if (markets.length > 0) {
        effectiveRadius = step;
        break;
      }
    }

    const top3 = markets.slice(0, 3);

    res.status(200).json({
      success: true,
      data: {
        nearestMarkets: top3,
        totalFound: markets.length,
        effectiveRadiusKm: effectiveRadius,
        language,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to process nearest mandi request');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to find nearest mandi' },
    });
  }
});
