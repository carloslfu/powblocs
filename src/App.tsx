import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";

function App() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const handleRunCode = async () => {
    try {
      const result = await invoke("run_code", { code });
      console.log("result", result);
      setResult(result as string);
    } catch (error) {
      console.error("Failed to run code:", error);
      setResult(`Error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <h1 className="text-xl font-medium text-gray-900">PowBlocs</h1>
        </div>
        <div className="p-4">
          <CodeMirror
            value={code}
            height="200px"
            extensions={[javascript({ jsx: true })]}
            onChange={(value) => setCode(value)}
          />
          <button
            onClick={handleRunCode}
            className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Run Code
          </button>
          {result !== null && (
            <div className="mt-4">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Result:
              </h2>
              <pre className="bg-gray-50 p-3 rounded-md font-mono text-sm overflow-auto max-h-64 whitespace-pre-wrap">
                {result}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
