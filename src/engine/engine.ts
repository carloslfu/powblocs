import { createAnthropic } from "@ai-sdk/anthropic";
import { generateHTML, JSONContent } from "@tiptap/react";
import { textEditorExtensions } from "@/components/TextEditor";
import { generateObject, generateText, LanguageModelV1 } from "ai";
import { fetch } from "@tauri-apps/plugin-http";
import TurndownService from "turndown";
import { z } from "zod";

import { APIKeys, CodeStore } from "./model";
import { Block } from "./model";
import { generateFunctionBlockPrompt } from "./prompts";

export const actionSchema = z.array(
  z.object({
    name: z.string(),
    description: z.string(),
    schema: z.record(z.any()),
  })
);

export type ActionSchema = z.infer<typeof actionSchema>;

export class PowBlocksEngine {
  store: CodeStore;

  turndownService = new TurndownService();

  private model: LanguageModelV1;
  private smallModel: LanguageModelV1;

  constructor({ store, apiKeys }: { store: CodeStore; apiKeys: APIKeys }) {
    this.store = store;

    this.turndownService = new TurndownService();

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
    this.smallModel = anthropic("claude-3-5-haiku-latest");
  }

  async updateOrCreateBlock(
    description: JSONContent,
    blockId?: string
  ): Promise<Block> {
    const htmlContent = generateHTML(description, textEditorExtensions);
    const markdownContent = this.turndownService.turndown(htmlContent);

    const [codeResponse, titleResponse] = await Promise.all([
      generateText({
        model: this.model,
        temperature: 0,
        maxTokens: 8192,
        prompt: generateFunctionBlockPrompt(markdownContent),
      }),
      generateText({
        model: this.model,
        temperature: 0,
        maxTokens: 100,
        prompt: `Generate a short, descriptive title (3-5 words) for this code block based on this description:
<description>${markdownContent}</description>

Output the title only. Output it in the following format:
<title>Title</title>`,
      }),
    ]);

    // extract the code from the text
    let code = codeResponse.text.match(/<code>([\s\S]*?)<\/code>/)?.[1];

    if (!code) {
      code = `console.log('Error: No code generated')
Pow.returnValue('Error: No code generated');`;
    }

    let title = titleResponse.text.match(/<title>([\s\S]*?)<\/title>/)?.[1];

    let trimmedTitle = title?.trim() || "Untitled";

    /**
     * Generate actions for the block. An API for the visual layer to interact with the block.
     */
    const actionsResult = await generateObject({
      model: this.smallModel,
      schema: z.object({
        actions: actionSchema,
      }),
    });

    const actions = actionsResult.object.actions;

    if (blockId) {
      await this.store.updateBlock(blockId, {
        description,
        code,
        title: trimmedTitle,
        actions,
      });

      return {
        id: blockId,
        description,
        code,
        title: trimmedTitle,
        actions,
      };
    }

    return this.store.createBlock({
      description,
      code,
      title: trimmedTitle,
      actions,
    });
  }
}
