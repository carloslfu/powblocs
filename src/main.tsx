import React from "react";
import ReactDOM from "react-dom/client";

import {
  registerGlobalShortcuts,
  unregisterGlobalShortcuts,
} from "./globalShortcuts";

import "./global.css";

import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

await registerGlobalShortcuts();

if (import.meta.hot) {
  import.meta.hot.on("vite:beforeUpdate", () => {
    unregisterGlobalShortcuts();
  });
}

await registerWindowShortcuts();
