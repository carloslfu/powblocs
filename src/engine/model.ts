export type BlockType = "function";

export type Block = {
  id: string;
  type: string;
  /**
   * Natural language description of the block
   */
  description: string;

  /**
   * The code of the block
   */
  code: string;
};

export type CodeStore = {
  getBlock(id: string): Block | undefined;
  createBlock(block: Omit<Block, "id">): Block;
  updateBlock(block: Omit<Partial<Block>, "id">): void;
  deleteBlock(id: string): void;
};

export type APIKeys = {
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
};
