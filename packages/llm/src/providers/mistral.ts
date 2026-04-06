import { Mistral } from '@mistralai/mistralai';

import type { LLMAdapter, LLMResult } from '../adapter.js';

export class MistralAdapter implements LLMAdapter {
  private readonly client: Mistral;

  constructor(apiKey: string = process.env.MISTRAL_API_KEY ?? '') {
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY is required for mistral provider');
    }
    this.client = new Mistral({ apiKey });
  }

  async run(system: string, user: string, model: string): Promise<LLMResult> {
    const response = await this.client.chat.complete({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const text = response.choices?.[0]?.message?.content?.toString() ?? '';
    const inputTokens = response.usage?.promptTokens ?? 0;
    const outputTokens = response.usage?.completionTokens ?? 0;

    return {
      text,
      inputTokens,
      outputTokens,
      model,
      provider: 'mistral',
    };
  }

  async *stream(system: string, user: string, model: string): AsyncIterable<string> {
    const stream = await this.client.chat.stream({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    for await (const event of stream) {
      const text = event.data.choices?.[0]?.delta?.content?.toString();
      if (text) {
        yield text;
      }
    }
  }
}
