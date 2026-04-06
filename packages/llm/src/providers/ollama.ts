import { OpenAICompatibleAdapter } from './openai.js';

export class OllamaAdapter extends OpenAICompatibleAdapter {
  constructor() {
    super('ollama');
  }
}
