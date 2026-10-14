import { logger } from '../../logger.js';

interface CircuitState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

export class CircuitBreaker {
  private states: Map<string, CircuitState> = new Map();
  private readonly failureThreshold: number = 3;
  private readonly cooldownMs: number = 60000; // 60 seconds cooldown

  isAvailable(modelId: string): boolean {
    const state = this.states.get(modelId);
    if (!state || !state.isOpen) return true;

    // Check if cooldown has elapsed
    const elapsed = Date.now() - state.lastFailureTime;
    if (elapsed > this.cooldownMs) {
      logger.info({ modelId, elapsed }, 'Circuit breaker cooldown elapsed, testing half-open');
      state.isOpen = false;
      state.failures = 0;
      return true;
    }

    return false;
  }

  recordSuccess(modelId: string) {
    const state = this.states.get(modelId);
    if (state) {
      state.failures = 0;
      state.isOpen = false;
    }
  }

  recordFailure(modelId: string, err: any) {
    let state = this.states.get(modelId);
    if (!state) {
      state = { failures: 0, lastFailureTime: 0, isOpen: false };
      this.states.set(modelId, state);
    }

    state.failures += 1;
    state.lastFailureTime = Date.now();

    if (state.failures >= this.failureThreshold) {
      state.isOpen = true;
      logger.warn(
        { modelId, consecutiveFailures: state.failures, cooldownMs: this.cooldownMs },
        'Circuit breaker TRIPPED for model, entering cooldown'
      );
    }
  }
}

export const circuitBreaker = new CircuitBreaker();

/**
 * Executes an async operation with exponential backoff retry.
 */
export async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    backoffFactor?: number;
    modelId: string;
  }
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  const initialDelay = options.initialDelayMs ?? 500;
  const factor = options.backoffFactor ?? 2;

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const result = await operation();
      circuitBreaker.recordSuccess(options.modelId);
      return result;
    } catch (err: any) {
      attempt++;
      const isRetryable =
        err?.status === 429 ||
        err?.status >= 500 ||
        err?.code === 'ETIMEDOUT' ||
        err?.code === 'ECONNRESET' ||
        err?.name === 'TimeoutError';

      if (attempt > maxRetries || !isRetryable) {
        circuitBreaker.recordFailure(options.modelId, err);
        throw err;
      }

      const delay = initialDelay * Math.pow(factor, attempt - 1);
      logger.warn(
        { modelId: options.modelId, attempt, delayMs: delay, error: err.message },
        'Retrying model request with backoff'
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Unreachable retry loop exit');
}
