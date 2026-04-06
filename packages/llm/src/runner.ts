import type { LLMResult } from './adapter.js';
import { resolveAdapter } from './registry.js';

export async function runWithFallback(
  modelRef: string,
  fallbacks: string[],
  system: string,
  user: string,
): Promise<LLMResult> {
  const candidates = [modelRef, ...fallbacks.filter((value) => value && value.trim().length > 0)];
  let lastError: unknown;

  for (const candidate of candidates) {
    const ref = candidate.trim();
    try {
      const { adapter, modelId } = resolveAdapter(ref);
      const result = await adapter.run(system, user, modelId);
      return {
        ...result,
        model: ref,
      };
    } catch (error) {
      lastError = error;
      if (!isRetryableProviderError(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('All providers failed while running runWithFallback');
}

function isRetryableProviderError(error: unknown): boolean {
  const err = error as {
    status?: number;
    code?: string;
    cause?: { code?: string };
    message?: string;
  };

  const status = err.status;
  if (typeof status === 'number' && (status === 429 || status >= 500)) {
    return true;
  }

  const code = (err.code ?? err.cause?.code ?? '').toString().toUpperCase();
  if (['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENOTFOUND'].includes(code)) {
    return true;
  }

  const message = (err.message ?? '').toLowerCase();
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return true;
  }

  return false;
}
