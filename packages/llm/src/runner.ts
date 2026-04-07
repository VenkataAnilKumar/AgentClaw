import type { LLMResult } from './adapter.js';
import { resolveAdapter } from './registry.js';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

export const PRICING: Record<string, { input: number; output: number }> = {
  'anthropic/claude-sonnet-4-6': { input: 0.000003, output: 0.000015 },
  'anthropic/claude-opus-4-6': { input: 0.000015, output: 0.000075 },
  'anthropic/claude-haiku-4-5-20251001': { input: 0.00000025, output: 0.00000125 },
  'openai/gpt-4o': { input: 0.000005, output: 0.000015 },
  'openai/gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },
  'google/gemini-2.0-flash': { input: 0.000000075, output: 0.0000003 },
  'groq/llama-3.3-70b-versatile': { input: 0.00000059, output: 0.00000079 },
  'ollama/*': { input: 0, output: 0 },
};

export function estimateCostUsd(modelRef: string, inputTokens: number, outputTokens: number): number {
  const price = resolvePricing(modelRef);
  if (!price) return 0;

  const total = inputTokens * price.input + outputTokens * price.output;
  return Math.round(total * 1_000_000) / 1_000_000;
}

export async function runWithFallback(
  modelRef: string,
  fallbacks: string[],
  system: string,
  user: string,
): Promise<LLMResult> {
  const candidates = [modelRef, ...fallbacks.filter((value) => value && value.trim().length > 0)];
  let lastError: unknown;
  const startedAtMs = Date.now();

  logger.info({
    modelRef,
    fallbackCount: candidates.length - 1,
  }, 'llm.run.start');

  for (const candidate of candidates) {
    const ref = candidate.trim();
    try {
      const { adapter, modelId } = resolveAdapter(ref);
      logger.info({ model: ref, provider: extractProvider(ref) }, 'llm.run.attempt');
      const result = await adapter.run(system, user, modelId);
      logger.info({
        model: ref,
        provider: extractProvider(ref),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: Date.now() - startedAtMs,
      }, 'llm.run.success');
      return {
        ...result,
        model: ref,
      };
    } catch (error) {
      lastError = error;
      logger.warn({
        model: ref,
        error: String(error),
      }, 'llm.run.failure');
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

function resolvePricing(modelRef: string): { input: number; output: number } | null {
  if (PRICING[modelRef]) return PRICING[modelRef];
  if (modelRef.startsWith('ollama/')) return PRICING['ollama/*'] ?? null;
  return null;
}

function extractProvider(modelRef: string): string {
  const [provider] = modelRef.split('/');
  return provider ?? 'unknown';
}
