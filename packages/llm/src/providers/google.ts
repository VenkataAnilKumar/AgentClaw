import { GoogleGenerativeAI } from '@google/generative-ai';

import type { LLMAdapter, LLMResult } from '../adapter.js';

export class GoogleAdapter implements LLMAdapter {
  private readonly client: GoogleGenerativeAI;

  constructor(apiKey: string = process.env.GEMINI_API_KEY ?? '') {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required for google provider');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async run(system: string, user: string, model: string): Promise<LLMResult> {
    const modelClient = this.client.getGenerativeModel({ model, systemInstruction: system });
    const response = await modelClient.generateContent(user);
    const text = response.response.text();
    const usage = response.response.usageMetadata;

    return {
      text,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      model,
      provider: 'google',
    };
  }

  async *stream(system: string, user: string, model: string): AsyncIterable<string> {
    const modelClient = this.client.getGenerativeModel({ model, systemInstruction: system });
    const stream = await modelClient.generateContentStream(user);

    for await (const chunk of stream.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }
}
