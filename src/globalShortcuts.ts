import { register, unregister } from "@tauri-apps/plugin-global-shortcut";

export async function registerGlobalShortcuts() {
  console.log("Registering shortcuts");
  await register("CommandOrControl+Shift+C", () => {
    console.log("Shortcut triggered");
  });
}

export async function unregisterGlobalShortcuts() {
  console.log("Unregistering shortcuts");
  await unregister("CommandOrControl+Shift+C");
}
