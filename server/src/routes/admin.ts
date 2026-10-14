import { Router, type Request, type Response, type NextFunction } from 'express';
import { getLlmUsageRepository } from '../db/index.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

export const adminRouter = Router();

// Middleware: Simple API-Key Auth
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKey || apiKey !== config.ADMIN_API_KEY) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Valid x-api-key header required' },
    });
    return;
  }
  next();
}

/**
 * GET /admin/llm/usage
 * Summarizes LLM token and cost usage by model and day.
 */
adminRouter.get('/llm/usage', requireAdminAuth, async (req: Request, res: Response) => {
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;

  try {
    const repo = getLlmUsageRepository();
    const summary = await repo.getUsageSummary(days);
    const todayCost = await repo.getDailyCost();

    res.status(200).json({
      success: true,
      data: {
        summary,
        todayCostUsd: todayCost,
        dailyCostCapUsd: config.LLM_DAILY_COST_CAP_USD,
        isUnderCap: todayCost < config.LLM_DAILY_COST_CAP_USD,
        activePrimaryProvider: config.LLM_PRIMARY_PROVIDER,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to fetch LLM usage summary');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve usage stats' },
    });
  }
});
