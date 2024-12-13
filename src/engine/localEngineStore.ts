import { nanoid } from "@/lib/nanoid";
import { Block, CodeStore } from "./model";
import { load } from "@tauri-apps/plugin-store";

const store = await load("engine.json", { autoSave: false });

export class LocalEngineStore implements CodeStore {
  async listBlocks(): Promise<Block[]> {
    return await store.values<Block>();
  }

  async getBlock(id: string): Promise<Block | undefined> {
    return await store.get<Block>(id);
  }

  async createBlock(block: Omit<Block, "id">): Promise<Block> {
    const newBlock = {
      id: nanoid("normal"),
      ...block,
    };

    await store.set(newBlock.id, newBlock);
    await store.save();

    return newBlock;
  }

  async updateBlock(
    id: string,
    block: Omit<Partial<Block>, "id">
  ): Promise<void> {
    const currentBlock = await store.get<Block>(id);

    const updatedBlock = {
      ...currentBlock,
      ...block,
    };

    await store.set(id, updatedBlock);
    await store.save();
  }

  async deleteBlock(id: string): Promise<void> {
    await store.delete(id);
    await store.save();
  }
}

(window as any).localEngineStore = new LocalEngineStore();
