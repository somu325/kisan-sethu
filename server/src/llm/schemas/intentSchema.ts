import { z } from 'zod';

export const IntentClassificationSchema = z.object({
  intent: z.enum([
    'NEAREST_MANDI',
    'PRICE_QUERY',
    'WEATHER_ADVISORY',
    'PESTICIDE_DOSAGE',
    'STORAGE_QUERY',
    'UNKNOWN',
  ]),
  confidence: z.number().min(0).max(1),
  language: z.enum(['en', 'hi', 'te']),
  extractedEntities: z.object({
    crop: z.string().optional(),
    location: z.string().optional(),
    quantity: z.number().optional(),
  }).optional(),
});

export type IntentClassificationResult = z.infer<typeof IntentClassificationSchema>;
