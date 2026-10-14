import { isDomainAllowed } from './allowlist.js';
import { logger } from '../logger.js';

export interface RetrievedDocument {
  sourceId: string;
  title: string;
  url: string;
  content: string;
  isTrusted: boolean;
}

export interface RetrievalResult {
  documents: RetrievedDocument[];
  hasTrustedSources: boolean;
}

export class IndependentRetriever {
  /**
   * Filters and validates documents against the trusted domain allowlist.
   */
  filterTrustedSources(docs: RetrievedDocument[]): RetrievalResult {
    const trusted = docs.filter((d) => {
      const allowed = isDomainAllowed(d.url);
      if (!allowed) {
        logger.warn({ url: d.url, title: d.title }, 'Source rejected: domain not on trusted allowlist');
      }
      return allowed;
    });

    return {
      documents: trusted,
      hasTrustedSources: trusted.length > 0,
    };
  }
}

export const retriever = new IndependentRetriever();
