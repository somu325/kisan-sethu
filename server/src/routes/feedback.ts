import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getConversationRepository } from '../db/index.js';
import { logger } from '../logger.js';

export const feedbackRouter = Router();

const feedbackSchema = z.object({
  messageId: z.string().min(1),
  helpful: z.boolean(),
  reason: z.string().optional(),
});

/**
 * POST /feedback
 * Stores farmer feedback on an answer or recommendation.
 */
feedbackRouter.post('/', async (req: Request, res: Response) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid feedback payload', details: parsed.error.format() },
    });
    return;
  }

  try {
    const repo = getConversationRepository();
    const fb = await repo.addFeedback(parsed.data.messageId, parsed.data.helpful, parsed.data.reason);
    res.status(201).json({ success: true, data: fb });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to record feedback');
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to record feedback' } });
  }
});
