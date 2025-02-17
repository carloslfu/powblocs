import { getCurrentWebview } from "@tauri-apps/api/webview";

export async function registerWindowShortcuts() {
  try {
    const webview = await getCurrentWebview();
    const window = webview.window;

    webview.window.is


    // Register all shortcuts for this window
    await window.(({ shortcut }) => {
      switch (shortcut) {
        case "Alt+Enter":
          handleMaximizeToggle(window);
          break;
        case "Alt+Down":
          window.minimize();
          break;
        case "Alt+F4":
          window.close();
          break;
        case "CommandOrControl+=":
          handleZoomIn(window);
          break;
        case "CommandOrControl+-":
          handleZoomOut(window);
          break;
        case "CommandOrControl+0":
          window.zoo(1.0);
          break;
      }
    });
  } catch (error) {
    console.error("Failed to register window shortcuts:", error);
  }
}

async function handleMaximizeToggle(window: ReturnType<typeof getCurrent>) {
  const isMaximized = await window.isMaximized();
  if (isMaximized) {
    await window.unmaximize();
  } else {
    await window.maximize();
  }
}

async function handleZoomIn(window: ReturnType<typeof getCurrent>) {
  const factor = await window.scaleFactor();
  await window.setScaleFactor(factor + 0.1);
}

async function handleZoomOut(window: ReturnType<typeof getCurrent>) {
  const factor = await window.scaleFactor();
  const newFactor = Math.max(0.5, factor - 0.1);
  await window.setScaleFactor(newFactor);
}
