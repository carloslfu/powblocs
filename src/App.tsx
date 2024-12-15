import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useLayoutEffect,
  useCallback,
} from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import {
  FaEdit,
  FaPlay,
  FaSpinner,
  FaStop,
  FaTrash,
  FaTrashAlt,
} from "react-icons/fa";
import { LuBan } from "react-icons/lu";
import { Editor, JSONContent } from "@tiptap/react";
import Fuse from "fuse.js";

import { getClaudeAPIKey, setClaudeAPIKey } from "./localStore";
import { PowBlocksEngine } from "./engine/engine";
import { LocalEngineStore } from "./engine/localEngineStore";
import { Block } from "./engine/model";
import { TextEditor } from "./components/TextEditor/index";

import * as DenoEngine from "@/engine/deno";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

/**
 * Delay before showing spinner
 */
const SPINNER_DELAY = 300;

/**
 * Minimum time to show spinner
 */
const MIN_SPINNER_DURATION = 500;

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 text-center">
      <div className="text-gray-400">
        <div className="text-sm">{message}</div>
      </div>
    </div>
  );
}

function EventLog({ taskId }: { taskId?: string }) {
  const { events, clearEvents } = DenoEngine.useTaskEvents(taskId || "");
  const logContainerRef = useRef<HTMLDivElement>(null);
  const prevEventsLengthRef = useRef(events.length);

  const handleClear = useCallback(() => {
    if (taskId) {
      clearEvents();
    }
  }, [taskId, clearEvents]);

  useLayoutEffect(() => {
    if (!taskId) return;

    const container = logContainerRef.current;
    if (container && events.length > prevEventsLengthRef.current) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
    prevEventsLengthRef.current = events.length;
  }, [events.length, taskId]);

  const displayEvents = taskId ? events : [];

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
        <h3 className="text-sm font-medium">Event Log</h3>
        {displayEvents.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTrashAlt className="mr-1" />
            Clear
          </Button>
        )}
      </div>
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50"
      >
        {displayEvents.length > 0 ? (
          displayEvents.map((event, index) => (
            <div
              key={`${taskId}-${index}`}
              className="text-sm font-mono bg-white p-2 rounded border"
            >
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{event.eventName}</span>
              </div>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </div>
          ))
        ) : (
          <EmptyState message="No events yet" />
        )}
      </div>
    </div>
  );
}

function TaskResults({
  task,
  showRunningSpinner,
}: {
  task?: any;
  showRunningSpinner: boolean;
}) {
  return (
    <div className="border-b border-gray-200">
      <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
        <h3 className="text-sm font-medium">Output</h3>
        {task && (
          <span
            className={`text-sm ${
              task.state === "completed"
                ? "text-green-500"
                : task.state === "error"
                ? "text-red-500"
                : task.state === "stopped"
                ? "text-yellow-500"
                : task.state === "stopping"
                ? "text-yellow-500"
                : task.state === "waiting_for_permission"
                ? "text-orange-500"
                : "text-blue-500"
            }`}
          >
            {task.state}
          </span>
        )}
      </div>
      {task ? (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
            <span className="font-mono">{task.id}</span>
            {(showRunningSpinner || task.state === "running") &&
              showRunningSpinner && (
                <FaSpinner className="animate-spin text-blue-500" />
              )}
            {task.state === "running" && (
              <button
                onClick={() => DenoEngine.stopTask(task.id)}
                className="text-red-500 hover:text-red-600"
              >
                <FaStop />
              </button>
            )}
            {task.state === "stopping" && (
              <>
                <FaSpinner className="animate-spin text-yellow-500" />
                <span className="text-yellow-500">Stopping...</span>
              </>
            )}
            {!["running", "stopping", "waiting_for_permission"].includes(
              task.state
            ) && (
              <button
                onClick={() => DenoEngine.replayTask(task.id)}
                className="text-green-500 hover:text-green-600"
                title="Replay this task"
              >
                <FaPlay />
              </button>
            )}
          </div>

          {task.state === "waiting_for_permission" && task.permissionPrompt && (
            <div className="mb-3 bg-orange-50 border border-orange-200 p-3 rounded-md">
              <p className="text-sm text-orange-700 mb-2">
                {task.permissionPrompt.message}
              </p>
              <div className="text-sm text-orange-700 mb-2">
                <div>Name: {task.permissionPrompt.name}</div>
                <div>API: {task.permissionPrompt.api_name}</div>
                <div>
                  Unary: {task.permissionPrompt.is_unary ? "Yes" : "No"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    DenoEngine.respondToPermissionPrompt(task.id, "Allow")
                  }
                  className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded inline-flex items-center gap-1"
                >
                  <FaPlay className="text-xs" />
                  Allow
                </button>
                <button
                  onClick={() =>
                    DenoEngine.respondToPermissionPrompt(task.id, "Deny")
                  }
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm py-1 px-3 rounded inline-flex items-center gap-1"
                >
                  <LuBan className="text-xs" />
                  Deny
                </button>
                {task.permissionPrompt.is_unary && (
                  <button
                    onClick={() =>
                      DenoEngine.respondToPermissionPrompt(task.id, "AllowAll")
                    }
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm py-1 px-3 rounded inline-flex items-center gap-1"
                  >
                    <FaPlay className="text-xs" />
                    Allow All
                  </button>
                )}
              </div>
            </div>
          )}

          {task.error ? (
            <div className="bg-red-50 border border-red-200 p-3 rounded-md font-mono text-sm overflow-auto max-h-64 whitespace-pre-wrap text-red-600">
              {task.error}
            </div>
          ) : (
            task.result && (
              <div className="bg-gray-50 p-3 rounded-md font-mono text-sm overflow-auto max-h-64 whitespace-pre-wrap">
                {JSON.stringify(task.result, null, 2)}
              </div>
            )
          )}
        </div>
      ) : (
        <EmptyState message="Run your code to see the output" />
      )}
    </div>
  );
}

function App() {
  const [code, setCode] = useState("");
  const [claudeKey, setClaudeKey] = useState<string>("");
  const [engine, setEngine] = useState<PowBlocksEngine | null>(null);
  const [description, setDescription] = useState<JSONContent | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<Block | undefined>();
  const [blocks, setBlocks] = useState<Block[]>([]);

  const [showRunningSpinner, setShowRunningSpinner] = useState(false);
  const spinnerTimeout = useRef<NodeJS.Timeout | null>(null);

  const editorRef = useRef<Editor | null>(null);

  const [currentTaskId, setCurrentTaskId] = useState<string | undefined>();

  const { task: currentTask, taskRef: currentTaskRef } =
    DenoEngine.useTask(currentTaskId);

  const [searchQuery, setSearchQuery] = useState("");

  const fuse = useMemo(
    () =>
      new Fuse(blocks, {
        keys: ["title"],
        threshold: 0.3,
        includeScore: true,
      }),
    [blocks]
  );

  const filteredBlocks = useMemo(() => {
    if (!searchQuery) return blocks;
    return fuse.search(searchQuery).map((result) => result.item);
  }, [fuse, searchQuery, blocks]);

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

      // Load blocks from store
      newEngine.store.listBlocks().then((blocks) => {
        setBlocks(blocks);
      });
    } else {
      setEngine(null);
    }
  }, [claudeKey]);

  const handleRunCode = async () => {
    try {
      const taskId = await DenoEngine.runCode(code);
      setCurrentTaskId(taskId);

      spinnerTimeout.current = setTimeout(() => {
        console.log("here setTimeout called --");
        console.log(
          "here setTimeout called --2",
          currentTaskRef.current?.state
        );
        if (
          currentTaskRef.current &&
          (currentTaskRef.current.state === "running" ||
            currentTaskRef.current.state === "waiting_for_permission" ||
            currentTaskRef.current.state === "stopping")
        ) {
          setShowRunningSpinner(true);

          spinnerTimeout.current = setTimeout(() => {
            setShowRunningSpinner(false);
          }, MIN_SPINNER_DURATION);
        }
      }, SPINNER_DELAY);
    } catch (error) {
      console.error("Failed to run code:", error);
    }
  };

  const handleGenerateCode = async () => {
    if (!engine || !description) {
      return;
    }

    try {
      setIsGenerating(true);
      const block = await engine.updateOrCreateBlock(
        description,
        selectedBlock?.id
      );
      setCode(block.code);
      const blocks = await engine.store.listBlocks();
      setBlocks(blocks);

      setSelectedBlock(block);
    } catch (error) {
      console.error("Failed to generate code:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectBlock = (block: Block) => {
    setSelectedBlock(block);
    setDescription(block.description);
    setCode(block.code);
    const htmlContent = block.description;
    if (editorRef.current) {
      editorRef.current.commands.setContent(htmlContent);
    }
  };

  const handleCodeChange = async (newCode: string) => {
    setCode(newCode);

    if (engine && selectedBlock) {
      const updatedBlock = {
        ...selectedBlock,
        code: newCode,
      };
      await engine.store.updateBlock(updatedBlock.id, updatedBlock);

      const blocks = await engine.store.listBlocks();
      setBlocks(blocks);
    }
  };

  const handleDescriptionChange = async (newDescription: JSONContent) => {
    setDescription(newDescription);

    if (engine && selectedBlock) {
      const updatedBlock = {
        ...selectedBlock,
        description: newDescription,
      };
      await engine.store.updateBlock(updatedBlock.id, updatedBlock);

      const blocks = await engine.store.listBlocks();
      setBlocks(blocks);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!engine) return;

    try {
      await engine.store.deleteBlock(blockId);
      // Refresh blocks from store after deletion
      const blocks = await engine.store.listBlocks();
      setBlocks(blocks);
      if (selectedBlock?.id === blockId) {
        setSelectedBlock(undefined);
        setCode("");
        setDescription(undefined);
      }
    } catch (error) {
      console.error("Failed to delete block:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (spinnerTimeout.current) {
        clearTimeout(spinnerTimeout.current);
      }
    };
  }, []);

  console.log("showRunningSpinner", showRunningSpinner);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar - Blocks List */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Scrollable blocks list */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="mb-4">
            <Input
              type="search"
              placeholder="Search blocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            {filteredBlocks.map((block) => (
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
                    {block.title || "Untitled"}
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

        {/* Claude API Key fixed at bottom */}
        <div className="border-t border-gray-200 p-4">
          <ClaudeAPIKey
            onClaudeAPIKeyChange={async (key: string) => {
              setClaudeKey(key);
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="mb-4">
            <TextEditor
              onChange={handleDescriptionChange}
              onEditorReady={(editor) => {
                editorRef.current = editor;
              }}
              initialContent={selectedBlock?.description}
            />
            <Button
              onClick={handleGenerateCode}
              className="mt-2"
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
            </Button>
          </div>

          <CodeMirror
            value={code}
            height="200px"
            extensions={[javascript({ jsx: true })]}
            onChange={handleCodeChange}
          />
          <Button
            onClick={handleRunCode}
            className="mt-3"
            disabled={
              !engine ||
              showRunningSpinner ||
              (currentTask &&
                showRunningSpinner &&
                currentTask.state !== "completed" &&
                currentTask.state !== "error" &&
                currentTask.state !== "stopped") ||
              !code
            }
          >
            {showRunningSpinner ||
            (currentTask &&
              currentTask.state === "running" &&
              showRunningSpinner) ? (
              <span className="flex items-center justify-center gap-2">
                <FaSpinner className="animate-spin" />
                Running...
              </span>
            ) : currentTask &&
              currentTask.state === "waiting_for_permission" ? (
              "Waiting for Permission"
            ) : engine ? (
              "Run Code"
            ) : (
              "Set Claude API Key to Run Code"
            )}
          </Button>
        </div>
      </div>

      {/* Right Sidebar - Results and Event Log */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <TaskResults
          task={currentTask}
          showRunningSpinner={showRunningSpinner}
        />
        <div className="flex-1">
          <EventLog taskId={currentTask?.id} />
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
    <div className="w-full">
      <h2 className="text-sm font-semibold mb-2">Claude API Key</h2>
      {isEditingKey ? (
        <input
          type="text"
          value={claudeKey}
          onChange={(e) => setClaudeKey(e.target.value)}
          placeholder="Enter Claude API Key"
          className="w-full px-2 py-1 border rounded text-sm hover:border-gray-300 transition-colors focus:outline-blue-500"
          autoFocus
          onBlur={handleSaveClaudeKey}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <div className="flex items-center gap-2 w-full">
          <span
            onClick={() => setIsEditingKey(true)}
            className="flex-1 px-2 py-1 border rounded cursor-pointer text-sm truncate"
          >
            {claudeKey
              ? `${claudeKey.slice(0, 12)}...`
              : "Click to enter API Key"}
          </span>
          <FaEdit
            onClick={() => setIsEditingKey(true)}
            className="text-blue-500 cursor-pointer hover:text-blue-600 transition-colors text-sm flex-shrink-0"
          />
        </div>
      )}
    </div>
  );
}

export default App;
