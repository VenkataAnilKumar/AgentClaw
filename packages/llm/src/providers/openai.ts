import OpenAI, { AzureOpenAI } from 'openai';

import type { LLMAdapter, LLMResult } from '../adapter.js';

type OpenAICompatibleProvider = 'openai' | 'groq' | 'azure' | 'ollama';

export class OpenAICompatibleAdapter implements LLMAdapter {
  constructor(private readonly provider: OpenAICompatibleProvider) {}

  async run(system: string, user: string, model: string): Promise<LLMResult> {
    const client = this.createClient(model);

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: false,
    });

    const text = response.choices[0]?.message?.content ?? '';
    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;

    return {
      text,
      inputTokens,
      outputTokens,
      model,
      provider: this.provider,
    };
  }

  async *stream(system: string, user: string, model: string): AsyncIterable<string> {
    const client = this.createClient(model);

    const stream = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) {
        yield text;
      }
    }
  }

  private createClient(model: string): OpenAI | AzureOpenAI {
    if (this.provider === 'azure') {
      const apiKey = process.env.AZURE_OPENAI_API_KEY;
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
      if (!apiKey || !endpoint) {
        throw new Error('AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT are required for azure provider');
      }

      return new AzureOpenAI({
        apiKey,
        endpoint,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-10-21',
        deployment: model,
      });
    }

    if (this.provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required for openai provider');
      }
      return new OpenAI({ apiKey });
    }

    if (this.provider === 'groq') {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('GROQ_API_KEY is required for groq provider');
      }
      return new OpenAI({
        apiKey,
        baseURL: process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1',
      });
    }

    return new OpenAI({
      apiKey: process.env.OLLAMA_API_KEY ?? 'ollama',
      baseURL: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434/v1',
    });
  }
}
