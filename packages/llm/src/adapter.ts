import type { LLMResult } from '@agentclaw/shared';

export interface LLMAdapter {
  run(system: string, user: string, model: string): Promise<LLMResult>;
  stream(system: string, user: string, model: string): AsyncIterable<string>;
}

export type { LLMResult };
