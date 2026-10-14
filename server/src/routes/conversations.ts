import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getConversationRepository } from '../db/index.js';
import { logger } from '../logger.js';

export const conversationsRouter = Router();

const createConversationSchema = z.object({
  language: z.string().default('en'),
  userId: z.string().optional(),
});

/**
 * POST /conversations
 * Initializes a new conversation session.
 */
conversationsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createConversationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.format() },
    });
    return;
  }

  try {
    const repo = getConversationRepository();
    const conv = await repo.createConversation(parsed.data.language, parsed.data.userId);
    res.status(201).json({ success: true, data: conv });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to create conversation');
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create conversation' } });
  }
});

const addMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  text: z.string().min(1),
  intent: z.string().optional(),
  payload: z.any().optional(),
});

/**
 * POST /conversations/:id/messages
 * Appends a message to the conversation.
 */
conversationsRouter.post('/:id/messages', async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = addMessageSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid message payload', details: parsed.error.format() },
    });
    return;
  }

  try {
    const repo = getConversationRepository();
    const message = await repo.addMessage({
      conversationId: id,
      role: parsed.data.role,
      text: parsed.data.text,
      intent: parsed.data.intent,
      payload: parsed.data.payload,
    });
    res.status(201).json({ success: true, data: message });
  } catch (err: any) {
    logger.error({ err: err.message, conversationId: id }, 'Failed to append message');
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to append message' } });
  }
});

/**
 * GET /conversations/:id/messages
 * Retrieves message history for a conversation.
 */
conversationsRouter.get('/:id/messages', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const repo = getConversationRepository();
    const messages = await repo.getMessages(id);
    res.status(200).json({ success: true, data: messages });
  } catch (err: any) {
    logger.error({ err: err.message, conversationId: id }, 'Failed to fetch conversation messages');
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch messages' } });
  }
});
