import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getMarketRepository } from '../db/index.js';
import { logger } from '../logger.js';

export const marketsRouter = Router();

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(500).default(50),
  type: z.enum(['APMC', 'MANDI']).optional(),
});

/**
 * GET /markets/nearby?lat=&lng=&radiusKm=&type=
 * Returns APMC/Mandi locations within radiusKm, sorted by proximity.
 */
marketsRouter.get('/nearby', async (req: Request, res: Response) => {
  const parsed = nearbyQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters for nearby markets',
        details: parsed.error.format(),
      },
    });
    return;
  }

  const { lat, lng, radiusKm, type } = parsed.data;

  try {
    const repo = getMarketRepository();
    const markets = await repo.getNearby(lat, lng, radiusKm, type);

    res.status(200).json({
      success: true,
      data: markets,
      meta: {
        count: markets.length,
        centerLat: lat,
        centerLng: lng,
        radiusKm,
        typeFilter: type || null,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message, lat, lng, radiusKm }, 'Failed to fetch nearby markets');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve nearby markets',
      },
    });
  }
});

const listFilterSchema = z.object({
  type: z.enum(['APMC', 'MANDI']).optional(),
  search: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
});

/**
 * GET /markets
 * Lists markets matching optional text search and filters.
 */
marketsRouter.get('/', async (req: Request, res: Response) => {
  const parsed = listFilterSchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid query filters',
        details: parsed.error.format(),
      },
    });
    return;
  }

  try {
    const repo = getMarketRepository();
    const markets = await repo.getAll(parsed.data);

    res.status(200).json({
      success: true,
      data: markets,
      meta: {
        count: markets.length,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to list markets');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve markets list',
      },
    });
  }
});

/**
 * GET /markets/:id
 * Retrieves single market by ID.
 */
marketsRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const repo = getMarketRepository();
    const market = await repo.getById(id);

    if (!market) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Market with id "${id}" not found`,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: market,
    });
  } catch (err: any) {
    logger.error({ err: err.message, id }, 'Failed to retrieve market by ID');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve market details',
      },
    });
  }
});
