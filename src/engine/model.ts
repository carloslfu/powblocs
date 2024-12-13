import { JSONContent } from "@tiptap/react";

export type BlockType = "function";

export type Block = {
  id: string;
  type: string;
  /**
   * Natural language description of the block
   */
  description: JSONContent;

  /**
   * The code of the block
   */
  code: string;
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
