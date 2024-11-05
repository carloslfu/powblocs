import { anthropic, createAnthropic } from "@ai-sdk/anthropic";

import { APIKeys, CodeStore } from "./model";
import { Block } from "./model";
import { generateText, LanguageModelV1 } from "ai";

import { fetch } from "@tauri-apps/plugin-http";

export class PowBlocksEngine {
  private store: CodeStore;

  private model: LanguageModelV1;

  constructor({ store, apiKeys }: { store: CodeStore; apiKeys: APIKeys }) {
    this.store = store;

    const anthropic = createAnthropic({
      apiKey: apiKeys.ANTHROPIC_API_KEY,
      headers: {
        "anthropic-dangerous-direct-browser-access": "true",
        "anthropic-beta": "computer-use-2024-10-22",
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
      prompt: `Generate JavaScript Code that runs on Deno that fulfills the following description:
<description>${description}</description>

Put all of the code in a single function and run it. As the final line be sure to use \`RuntimeExtension.returnValue(JSON.stringify(result))\`, where result is the value you want to return.`,
    });

    return this.store.createBlock({
      type: "function",
      description,
      code: text,
    });
  }
}
