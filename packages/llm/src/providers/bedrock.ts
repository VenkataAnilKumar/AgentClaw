import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
} from '@aws-sdk/client-bedrock-runtime';

import type { LLMAdapter, LLMResult } from '../adapter.js';

export class BedrockAdapter implements LLMAdapter {
  private readonly client: BedrockRuntimeClient;

  constructor(region: string = process.env.AWS_REGION ?? 'us-east-1') {
    this.client = new BedrockRuntimeClient({ region });
  }

  async run(system: string, user: string, model: string): Promise<LLMResult> {
    const response = await this.client.send(
      new ConverseCommand({
        modelId: model,
        system: [{ text: system }],
        messages: [
          {
            role: 'user',
            content: [{ text: user }],
          } satisfies Message,
        ],
      }),
    );

    const text =
      response.output?.message?.content
        ?.map((item) => ('text' in item ? item.text : ''))
        .join('')
        .trim() ?? '';

    return {
      text,
      inputTokens: response.usage?.inputTokens ?? 0,
      outputTokens: response.usage?.outputTokens ?? 0,
      model,
      provider: 'bedrock',
    };
  }

  async *stream(system: string, user: string, model: string): AsyncIterable<string> {
    const result = await this.run(system, user, model);
    if (result.text) {
      yield result.text;
    }
  }
}
