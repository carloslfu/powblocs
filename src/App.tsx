import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [code, setCode] = useState("");

  const handleRunCode = async () => {
    try {
      await invoke("run_code", { code });
    } catch (error) {
      console.error("Failed to run code:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-2xl">
        <h1 className="text-4xl font-bold text-white tracking-tight mb-6">
          PowBlocs
        </h1>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-48 bg-white/5 text-white rounded-lg p-4 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-white/20"
          placeholder="Enter your code here..."
        />
        <button
          onClick={handleRunCode}
          className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Run Code
        </button>
      </div>
    </div>
  );
}

export default App;
