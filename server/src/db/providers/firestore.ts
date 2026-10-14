/**
 * OPTIONAL Firestore Provider Stub
 *
 * This file serves as an architectural extension point for Google Cloud Firestore.
 * When DB_PROVIDER=firestore is selected in production:
 * 1. Initialize @google-cloud/firestore SDK with ADC (Application Default Credentials).
 * 2. Implement the repository interfaces (MarketRepository, etc.) mapping DocumentSnapshots
 *    to domain entities.
 */

import { logger } from '../../logger.js';
import type { DbConnectionConfig } from '../config.js';

export function createFirestoreStub(_cfg: DbConnectionConfig): never {
  logger.error('Firestore provider selected, but is currently an architectural stub.');
  throw new Error(
    'Firestore provider is not yet active. Please use DB_PROVIDER=sqlite or DB_PROVIDER=postgres.'
  );
}
