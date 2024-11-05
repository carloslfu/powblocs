import { Block, CodeStore } from "./model";

import { nanoid } from "@/lib/nanoid";

export class MemoryCodeStore implements CodeStore {
  private blocks: Block[] = [];

  getBlock(id: string): Block | undefined {
    return this.blocks.find((block) => block.id === id);
  }

  createBlock(block: Omit<Block, "id">): Block {
    const newBlock = {
      id: nanoid("normal"),
      ...block,
    };

    this.blocks.push(newBlock);

    return newBlock;
  }

  updateBlock(block: Block): void {
    this.blocks = this.blocks.map((b) => (b.id === block.id ? block : b));
  }

  deleteBlock(id: string): void {
    this.blocks = this.blocks.filter((block) => block.id !== id);
  }
}
