import { Block, CodeStore } from "./model";

import { nanoid } from "@/lib/nanoid";

export class MemoryCodeStore implements CodeStore {
  private blocks: Block[] = [];

  async listBlocks(): Promise<Block[]> {
    return this.blocks;
  }

  async getBlock(id: string): Promise<Block | undefined> {
    return this.blocks.find((block) => block.id === id);
  }

  async createBlock(block: Omit<Block, "id">): Promise<Block> {
    const newBlock = {
      id: nanoid("normal"),
      ...block,
    };

    this.blocks.push(newBlock);

    return newBlock;
  }

  async updateBlock(
    id: string,
    block: Omit<Partial<Block>, "id">
  ): Promise<void> {
    this.blocks = this.blocks.map((b) =>
      b.id === id ? { ...b, ...block } : b
    );
  }

  async deleteBlock(id: string): Promise<void> {
    this.blocks = this.blocks.filter((block) => block.id !== id);
  }
}
