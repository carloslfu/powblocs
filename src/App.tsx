import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { FaEdit } from "react-icons/fa";

import { getClaudeAPIKey, setClaudeAPIKey } from "./localStore";
import { PowBlocksEngine } from "./engine/engine";
import { MemoryCodeStore } from "./engine/memoryStore";

function App() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [claudeKey, setClaudeKey] = useState<string>("");
  const [engine, setEngine] = useState<PowBlocksEngine | null>(null);
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    // Load initial Claude API key
    getClaudeAPIKey().then((key) => {
      if (key) {
        setClaudeKey(key);
      }
    });
  }, []);

  useEffect(() => {
    // Create/update engine when Claude key changes
    if (claudeKey) {
      setEngine(
        new PowBlocksEngine({
          store: new MemoryCodeStore(),
          apiKeys: {
            ANTHROPIC_API_KEY: claudeKey,
            OPENAI_API_KEY: "",
          },
        })
      );
    } else {
      setEngine(null);
    }
  }, [claudeKey]);

  const handleRunCode = async () => {
    if (!engine) {
      setResult("Error: Please set Claude API key first");
      return;
    }

    try {
      const result = await invoke("run_code", { code });

      let parsedResult: string;
      try {
        parsedResult = JSON.parse(result as string);
      } catch (error) {
        parsedResult = result as string;
      }

      setResult(parsedResult);
      console.log("result", parsedResult);
    } catch (error) {
      console.error("Failed to run code:", error);
      setResult(`Error: ${error}`);
    }
  };

  const handleGenerateCode = async () => {
    if (!engine) {
      setResult("Error: Please set Claude API key first");
      return;
    }

    try {
      const block = await engine.generateFunctionBlock(description);
      setCode(block.code);
    } catch (error) {
      console.error("Failed to generate code:", error);
      setResult(`Error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <h1 className="text-xl font-medium text-gray-900">PowBlocs</h1>
        </div>

        <ClaudeAPIKey
          onClaudeAPIKeyChange={async (key: string) => {
            setClaudeKey(key);
          }}
        />

        <div className="p-4">
          <div className="mb-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the code you want to generate..."
              className="w-full p-2 border rounded-md"
              rows={3}
            />
            <button
              onClick={handleGenerateCode}
              className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
              disabled={!engine || !description}
            >
              Generate Code
            </button>
          </div>

          <CodeMirror
            value={code}
            height="200px"
            extensions={[javascript({ jsx: true })]}
            onChange={(value) => setCode(value)}
          />
          <button
            onClick={handleRunCode}
            className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            disabled={!engine}
          >
            {engine ? "Run Code" : "Set Claude API Key to Run Code"}
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

function ClaudeAPIKey({
  onClaudeAPIKeyChange,
}: {
  onClaudeAPIKeyChange: (key: string) => void;
}) {
  const [claudeKey, setClaudeKey] = useState<string>("");
  const [isEditingKey, setIsEditingKey] = useState<boolean>(false);

  useEffect(() => {
    handleLoadClaudeKey();
  }, []);

  async function handleSaveClaudeKey() {
    await setClaudeAPIKey(claudeKey);
    onClaudeAPIKeyChange(claudeKey);
    alert("Claude API Key saved!");
    setIsEditingKey(false);
  }

  async function handleLoadClaudeKey() {
    const key = await getClaudeAPIKey();
    if (key) {
      setClaudeKey(key);
      onClaudeAPIKeyChange(key);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      handleSaveClaudeKey();
    }
  }

  return (
    <div className="p-2 bg-white rounded shadow w-fit">
      <div className="flex gap-2 items-center">
        <h2 className="text-sm font-semibold">Claude API Key:</h2>
        {isEditingKey ? (
          <input
            type="text"
            value={claudeKey}
            onChange={(e) => setClaudeKey(e.target.value)}
            placeholder="Enter Claude API Key"
            className="px-2 py-1 border rounded text-sm hover:border-gray-300 transition-colors focus:outline-blue-500"
            autoFocus
            onBlur={handleSaveClaudeKey}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span className="flex items-center gap-2">
            <span
              onClick={() => setIsEditingKey(true)}
              className="px-2 py-1 border rounded cursor-pointer text-sm"
            >
              {claudeKey
                ? `${claudeKey.slice(0, 12)}...`
                : "Click to enter API Key"}
            </span>
            <FaEdit
              onClick={() => setIsEditingKey(true)}
              className="text-blue-500 cursor-pointer hover:text-blue-600 transition-colors text-sm"
            />
          </span>
        )}
      </div>
    </div>
  );
}

export default App;
