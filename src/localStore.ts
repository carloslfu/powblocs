import { load } from "@tauri-apps/plugin-store";

const store = await load("store.json", { autoSave: false });

export async function getClaudeAPIKey() {
  return await store.get<string>("claudeAPIKey");
}

export async function setClaudeAPIKey(key: string) {
  await store.set("claudeAPIKey", key);
  await store.save();
}
