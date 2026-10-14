import { Router, type Request, type Response } from 'express';
import { getPesticideKnowledgeRepository } from '../db/index.js';
import { logger } from '../logger.js';

export const pesticidesRouter = Router();

/**
 * GET /pesticides/crops
 * Returns list of crops.
 */
pesticidesRouter.get('/crops', async (_req: Request, res: Response) => {
  try {
    const repo = getPesticideKnowledgeRepository();
    const crops = await repo.getCrops();
    res.status(200).json({ success: true, data: crops });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to fetch crops');
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch crops' } });
  }
});

/**
 * GET /pesticides/crops/:cropId/problems
 * Returns list of problems for a crop.
 */
pesticidesRouter.get('/crops/:cropId/problems', async (req: Request, res: Response) => {
  const { cropId } = req.params;
  try {
    const repo = getPesticideKnowledgeRepository();
    const problems = await repo.getProblems(cropId);
    res.status(200).json({ success: true, data: problems });
  } catch (err: any) {
    logger.error({ err: err.message, cropId }, 'Failed to fetch problems');
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch problems' } });
  }
});

/**
 * GET /pesticides/recommendations?cropId=&problemId=
 * Returns verified recommendations from the common database.
 */
pesticidesRouter.get('/recommendations', async (req: Request, res: Response) => {
  const cropId = req.query.cropId as string;
  const problemId = req.query.problemId as string;

  if (!cropId || !problemId) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Both cropId and problemId query params are required' },
    });
    return;
  }

  try {
    const repo = getPesticideKnowledgeRepository();
    const recs = await repo.getVerifiedRecommendations(cropId, problemId);
    res.status(200).json({ success: true, data: recs });
  } catch (err: any) {
    logger.error({ err: err.message, cropId, problemId }, 'Failed to fetch recommendations');
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch recommendations' } });
  }
});
