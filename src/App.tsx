import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { FaEdit, FaSpinner, FaStop, FaTrash } from "react-icons/fa";

import { getClaudeAPIKey, setClaudeAPIKey } from "./localStore";
import { PowBlocksEngine } from "./engine/engine";
import { nanoid } from "./lib/nanoid";
import { LocalEngineStore } from "./engine/localEngineStore";
import { Block } from "./engine/model";

interface Task {
  id: string;
  code: string;
  status: "running" | "completed" | "error";
  result?: Record<string, any>;
}

function App() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [claudeKey, setClaudeKey] = useState<string>("");
  const [engine, setEngine] = useState<PowBlocksEngine | null>(null);
  const [description, setDescription] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);

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
      const newEngine = new PowBlocksEngine({
        store: new LocalEngineStore(),
        apiKeys: {
          ANTHROPIC_API_KEY: claudeKey,
          OPENAI_API_KEY: "",
        },
      });
      setEngine(newEngine);
    } else {
      setEngine(null);
    }
  }, [claudeKey]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPolling) {
      interval = setInterval(async () => {
        const runningTasks = tasks.filter((t) => t.status === "running");

        for (const task of runningTasks) {
          try {
            const result = await invoke("get_return_value", {
              taskId: task.id,
            });

            let parsedResult: Record<string, any>;
            try {
              parsedResult = JSON.parse(result as string);
            } catch (error) {
              parsedResult = {
                error,
                result,
              };
            }

            setTasks((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? { ...t, status: "completed", result: parsedResult }
                  : t
              )
            );

            if (task.id === tasks[tasks.length - 1]?.id) {
              setResult(parsedResult);
            }
          } catch (error) {
            if ((error as string) !== "Task still running") {
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === task.id
                    ? { ...t, status: "error", result: { error } }
                    : t
                )
              );
            } else {
              console.log("Task still running");
            }
          }
        }

        if (runningTasks.length === 0) {
          setIsPolling(false);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPolling, tasks]);

  const handleRunCode = async () => {
    if (!engine) {
      setResult({ error: "Please set Claude API key first" });
      return;
    }

    const newTaskId = nanoid();
    const newTask: Task = {
      id: newTaskId,
      code,
      status: "running",
    };

    try {
      setTasks((prev) => [...prev, newTask]);
      setIsPolling(true);

      await invoke("run_code", {
        taskId: newTaskId,
        code,
      });
    } catch (error) {
      console.error("Failed to run code:", error);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === newTaskId
            ? { ...t, status: "error", result: { error, result } }
            : t
        )
      );
    }
  };

  const handleStopTask = async (taskId: string) => {
    try {
      await invoke("stop_code", { taskId });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: "completed",
                result: { cancelled: true, message: "Task cancelled" },
              }
            : t
        )
      );
    } catch (error) {
      console.error("Failed to stop task:", error);
    }
  };

  const handleGenerateCode = async () => {
    if (!engine) {
      setResult({ error: "Please set Claude API key first" });
      return;
    }

    try {
      setIsGenerating(true);
      const block = await engine.generateFunctionBlock(description);
      setCode(block.code);
      setBlocks((prev) => [...prev, block]);
    } catch (error) {
      console.error("Failed to generate code:", error);
      setResult({ error });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectBlock = (block: Block) => {
    setSelectedBlock(block);
    setCode(block.code);
    setDescription(block.description);
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!engine) return;

    try {
      await (engine as any).store.deleteBlock(blockId);
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      if (selectedBlock?.id === blockId) {
        setSelectedBlock(null);
        setCode("");
        setDescription("");
      }
    } catch (error) {
      console.error("Failed to delete block:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Saved Blocks</h2>
        <div className="space-y-2">
          {blocks.map((block) => (
            <div
              key={block.id}
              className={`p-2 rounded cursor-pointer flex justify-between items-center ${
                selectedBlock?.id === block.id
                  ? "bg-blue-100"
                  : "hover:bg-gray-100"
              }`}
              onClick={() => handleSelectBlock(block)}
            >
              <div className="truncate flex-1">
                <div className="text-sm font-medium">
                  {block.description.slice(0, 30)}...
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteBlock(block.id);
                }}
                className="text-red-500 hover:text-red-600 ml-2"
              >
                <FaTrash size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
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
                className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:bg-green-300 disabled:cursor-not-allowed"
                disabled={!engine || !description || isGenerating}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <FaSpinner className="animate-spin" />
                    Generating...
                  </span>
                ) : (
                  "Generate Code"
                )}
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

            {tasks.length > 0 && (
              <div className="mt-4">
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Tasks:
                </h2>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{task.id}</span>
                          {task.status === "running" && (
                            <>
                              <FaSpinner className="animate-spin text-blue-500" />
                              <button
                                onClick={() => handleStopTask(task.id)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <FaStop />
                              </button>
                            </>
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            task.status === "completed"
                              ? "text-green-500"
                              : task.status === "error"
                              ? "text-red-500"
                              : "text-blue-500"
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                      {task.result && (
                        <pre className="font-mono text-sm overflow-auto max-h-32 whitespace-pre-wrap">
                          {JSON.stringify(task.result, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result !== null && (
              <div className="mt-4">
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Latest Result:
                </h2>
                <pre className="bg-gray-50 p-3 rounded-md font-mono text-sm overflow-auto max-h-64 whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
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
