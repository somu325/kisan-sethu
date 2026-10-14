/**
 * Typed HTTP Client for KisanSetu Backend API.
 * Configured with timeout, retries, and offline-friendly error handling.
 * Zero secrets in the frontend app.
 */

export interface ApiClientOptions {
  timeoutMs?: number;
  retries?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  isOffline?: boolean;
}

const DEFAULT_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL as string) ||
  'http://localhost:8080';

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit & ApiClientOptions = {}
): Promise<ApiResponse<T>> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const maxRetries = options.retries ?? 1;
  const baseUrl = DEFAULT_BASE_URL.replace(/\/$/, '');
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  let attempt = 0;
  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(options.headers || {}),
        },
      });

      clearTimeout(timeoutId);

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: json?.error?.code || `HTTP_${response.status}`,
            message: json?.error?.message || response.statusText || 'Request failed',
            details: json?.error?.details,
          },
        };
      }

      return {
        success: true,
        data: (json?.data !== undefined ? json.data : json) as T,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      attempt++;

      const isNetworkError =
        err?.name === 'AbortError' ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError');

      if (attempt > maxRetries || !isNetworkError) {
        return {
          success: false,
          isOffline: isNetworkError,
          error: {
            code: isNetworkError ? 'OFFLINE_OR_TIMEOUT' : 'NETWORK_ERROR',
            message: isNetworkError
              ? 'Server unreachable or request timed out. Operating in offline mode.'
              : err?.message || 'Network request failed',
          },
        };
      }

      // Small backoff before retry
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return {
    success: false,
    isOffline: true,
    error: {
      code: 'OFFLINE_OR_TIMEOUT',
      message: 'Server unreachable. Operating in offline mode.',
    },
  };
}
