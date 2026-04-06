import type { LLMAdapter } from './adapter.js';
import { AnthropicAdapter } from './providers/anthropic.js';
import { BedrockAdapter } from './providers/bedrock.js';
import { GoogleAdapter } from './providers/google.js';
import { MistralAdapter } from './providers/mistral.js';
import { OllamaAdapter } from './providers/ollama.js';
import { OpenAICompatibleAdapter } from './providers/openai.js';

const adapterCache = new Map<string, LLMAdapter>();

export function resolveAdapter(modelRef: string): { adapter: LLMAdapter; modelId: string } {
  const trimmed = modelRef.trim();
  const splitIndex = trimmed.indexOf('/');
  if (splitIndex <= 0 || splitIndex === trimmed.length - 1) {
    throw new Error(`Invalid model reference: ${modelRef}. Expected provider/model format.`);
  }

  const provider = trimmed.slice(0, splitIndex).toLowerCase();
  const modelId = trimmed.slice(splitIndex + 1);

  const adapter = getAdapter(provider);
  return { adapter, modelId };
}

function getAdapter(provider: string): LLMAdapter {
  const cached = adapterCache.get(provider);
  if (cached) {
    return cached;
  }

  const created = createAdapter(provider);
  adapterCache.set(provider, created);
  return created;
}

function createAdapter(provider: string): LLMAdapter {
  switch (provider) {
    case 'anthropic':
      return new AnthropicAdapter();
    case 'openai':
      return new OpenAICompatibleAdapter('openai');
    case 'google':
      return new GoogleAdapter();
    case 'ollama':
      return new OllamaAdapter();
    case 'groq':
      return new OpenAICompatibleAdapter('groq');
    case 'azure':
      return new OpenAICompatibleAdapter('azure');
    case 'bedrock':
      return new BedrockAdapter();
    case 'mistral':
      return new MistralAdapter();
    default:
      throw new Error(`Unsupported model provider: ${provider}`);
  }
}
