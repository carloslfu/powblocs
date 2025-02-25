import { JSONContent } from "@tiptap/react";
import { ActionSchema } from "./engine";

export type Block = {
  id: string;
  /**
   * The title of the block
   */
  title?: string;
  /**
   * Natural language description of the block.
   */
  description: JSONContent;

  /**
   * High-level implementation specification of the block, in natural language
   */
  specification: JSONContent;

  /**
   * The backend code of the block
   */
  backendCode: string;

  /**
   * The backend actions of the block in JSON schema format. Actions are the functions that the block can perform, backed by backend code.
   */
  actions: ActionSchema;

  /**
   * The UI code of the block
   */
  uiCode: string;
};

export type CodeStore = {
  listBlocks(): Promise<Block[]>;
  getBlock(id: string): Promise<Block | undefined>;
  createBlock(block: Omit<Block, "id">): Promise<Block>;
  updateBlock(id: string, block: Omit<Partial<Block>, "id">): Promise<void>;
  deleteBlock(id: string): Promise<void>;
};

export type APIKeys = {
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
};
