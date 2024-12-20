import { createAnthropic } from "@ai-sdk/anthropic";
import { generateHTML, JSONContent, generateJSON } from "@tiptap/react";
import { textEditorExtensions } from "@/components/TextEditor";
import { generateObject, generateText, LanguageModelV1 } from "ai";
import { fetch } from "@tauri-apps/plugin-http";
import TurndownService from "turndown";
import { z } from "zod";
import * as commonmark from "commonmark";

import { APIKeys, CodeStore } from "./model";
import { Block } from "./model";
import {
  generateActionsForBlockPrompt,
  generateSpecificationForBlockPrompt,
  generateBackendCodeForBlockPrompt,
  generateUIForBlockPrompt,
  generateTitleForBlockPrompt,
} from "./prompts";

export const actionSchema = z.array(
  z.object({
    name: z.string().describe("The name of the action"),
    description: z.string().describe("The description of the action"),
    inputSchema: z
      .record(z.any())
      .describe("The input schema that the action accepts"),
    inputExample: z
      .record(z.any())
      .describe("An example of the input that the action accepts"),
    outputSchema: z
      .record(z.any())
      .describe("The output schema that the action returns"),
    outputExample: z
      .record(z.any())
      .describe("An example of the output that the action returns"),
    eventsSchema: z
      .record(z.string(), z.any())
      .describe("The events schema that the action emits"),
    eventsExample: z
      .record(z.string(), z.any())
      .describe("An example of the events that the action emits"),
  })
);

export type ActionSchema = z.infer<typeof actionSchema>;

export class PowBlocksEngine {
  store: CodeStore;

  turndownService = new TurndownService();

  private model: LanguageModelV1;
  private smallModel: LanguageModelV1;

  private parser = new commonmark.Parser();
  private renderer = new commonmark.HtmlRenderer();

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

  /**
   * Update or create a block from a description. It generates the specification, and actions schema.
   */
  async updateOrCreateBlockFromDescription(
    description: JSONContent,
    blockId?: string
  ): Promise<Block> {
    const htmlContent = generateHTML(description, textEditorExtensions());
    const descriptionInMarkdown = this.turndownService.turndown(htmlContent);

    const [specificationResponse, titleResponse] = await Promise.all([
      generateText({
        model: this.model,
        temperature: 0,
        maxTokens: 8192,
        prompt: generateSpecificationForBlockPrompt(descriptionInMarkdown),
      }),
      generateText({
        model: this.model,
        temperature: 0,
        maxTokens: 100,
        prompt: generateTitleForBlockPrompt(descriptionInMarkdown),
      }),
    ]);

    let specification = specificationResponse.text;

    if (!specification) {
      specification = `Error: No specification generated`;
    }

    let title = titleResponse.text.match(/<title>([\s\S]*?)<\/title>/)?.[1];

    let trimmedTitle = title?.trim() || "Untitled";

    const parsed = this.parser.parse(specification);
    const specificationHTML = this.renderer.render(parsed);

    const specificationJSON = generateJSON(
      specificationHTML,
      textEditorExtensions()
    );

    if (blockId) {
      await this.store.updateBlock(blockId, {
        description,
        specification: specificationJSON,
        backendCode: "",
        title: trimmedTitle,
        uiCode: "",
      });

      return {
        id: blockId,
        description,
        specification: specificationJSON,
        backendCode: "",
        title: trimmedTitle,
        actions: [],
        uiCode: "",
      } satisfies Block;
    }

    return this.store.createBlock({
      description,
      specification: specificationJSON,
      backendCode: "",
      title: trimmedTitle,
      actions: [],
      uiCode: "",
    });
  }

  async generateBackendCodeForBlock(blockId: string): Promise<Block> {
    const block = await this.store.getBlock(blockId);

    if (!block) {
      throw new Error("Block not found");
    }

    const htmlContent = generateHTML(
      block.specification,
      textEditorExtensions()
    );
    const specification = this.turndownService.turndown(htmlContent);

    /**
     * Generate actions for the block. An API for the visual layer to interact with the block.
     */
    const actionsResult = await generateObject({
      model: this.model,
      temperature: 0,
      prompt: generateActionsForBlockPrompt(specification),
      schema: z.object({
        actions: actionSchema,
      }),
      maxTokens: 8192,
    });

    const actions = actionsResult.object.actions;

    const backendCodeResponse = await generateText({
      model: this.model,
      temperature: 0,
      maxTokens: 8192,
      prompt: generateBackendCodeForBlockPrompt(specification, actions), // out is inside <code> tags
    });

    const backendCode = backendCodeResponse.text.match(
      /<code>([\s\S]*?)<\/code>/
    )?.[1];

    if (!backendCode) {
      throw new Error("No backend code generated");
    }

    await this.store.updateBlock(blockId, {
      backendCode,
      actions,
    });

    return {
      ...block,
      backendCode,
      actions,
    };
  }

  async generateUIForBlock(blockId: string) {
    const block = await this.store.getBlock(blockId);

    if (!block) {
      throw new Error("Block not found");
    }

    const specificationHTML = generateHTML(
      block.specification,
      textEditorExtensions()
    );

    const specification = this.turndownService.turndown(specificationHTML);

    const uiCodeResponse = await generateText({
      model: this.model,
      temperature: 0,
      maxTokens: 8192,
      prompt: generateUIForBlockPrompt(
        specification,
        block.title || "Untitled",
        block.actions
      ),
    });

    return uiCodeResponse.text;
  }
}
