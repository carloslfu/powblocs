import { createAnthropic } from "@ai-sdk/anthropic";

import { APIKeys, CodeStore } from "./model";
import { Block } from "./model";
import { generateText, LanguageModelV1 } from "ai";

import { fetch } from "@tauri-apps/plugin-http";
import { generateFunctionBlockPrompt } from "./prompts";

export class PowBlocksEngine {
  store: CodeStore;

  private model: LanguageModelV1;

  constructor({ store, apiKeys }: { store: CodeStore; apiKeys: APIKeys }) {
    this.store = store;

    const anthropic = createAnthropic({
      apiKey: apiKeys.ANTHROPIC_API_KEY,
      headers: {
        "anthropic-dangerous-direct-browser-access": "true",
      },
      fetch: async (input, init) => {
        return fetch(input, init);
      },
    });

    this.model = anthropic("claude-3-5-sonnet-20241022");
  }

  async generateFunctionBlock(description: string): Promise<Block> {
    const { text } = await generateText({
      model: this.model,
      temperature: 0,
      maxTokens: 8192,
      prompt: generateFunctionBlockPrompt(description),
    });

    // extract the code from the text
    let code = text.match(/<code>([\s\S]*?)<\/code>/)?.[1];

    if (!code) {
      code = `console.log('Error: No code generated')
RuntimeExtension.returnValue('Error: No code generated');`;
    }

    return this.store.createBlock({
      type: "function",
      description,
      code,
    });
  }
}
