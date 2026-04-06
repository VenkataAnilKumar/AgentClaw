import Anthropic from '@anthropic-ai/sdk';

import type { LLMAdapter, LLMResult } from '../adapter.js';

export class AnthropicAdapter implements LLMAdapter {
  private readonly client: Anthropic;

  constructor(apiKey: string = process.env.ANTHROPIC_API_KEY ?? '') {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for anthropic provider');
    }
    this.client = new Anthropic({ apiKey });
  }

  async run(system: string, user: string, model: string): Promise<LLMResult> {
    const response = await this.client.messages.create({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    });

    const text = response.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')
      .trim();

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model,
      provider: 'anthropic',
    };
  }

  async *stream(system: string, user: string, model: string): AsyncIterable<string> {
    const stream = await this.client.messages.create({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text;
        if (text) {
          yield text;
        }
      }
    }
  }
}
