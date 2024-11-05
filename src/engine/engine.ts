// let's start small :)

import { APIKeys, CodeStore } from "./model";
import { Block } from "./model";

export class PowBlocksEngine {
  private store: CodeStore;

  constructor({ store, apiKeys }: { store: CodeStore; apiKeys: APIKeys }) {
    this.store = store;
  }

  generateFunctionBlock(description: string, code: string): Block {
    return this.store.createBlock({
      type: "function",
      description,
      code,
    });
  }
}
