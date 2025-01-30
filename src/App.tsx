import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useLayoutEffect,
  useCallback,
} from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { FaPlay, FaSpinner, FaStop, FaTrash, FaTrashAlt } from "react-icons/fa";
import { LuBan, LuPlus } from "react-icons/lu";
import { Editor, JSONContent } from "@tiptap/react";
import Fuse from "fuse.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Runner, useRunner } from "react-runner";

import { getClaudeAPIKey } from "./localStore";
import { ActionSchema, PowBlocksEngine } from "./engine/engine";
import { LocalEngineStore } from "./engine/localEngineStore";
import { Block } from "./engine/model";
import { TextEditor } from "./components/TextEditor/index";

import * as DenoEngine from "@/engine/deno";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { ClaudeAPIKey } from "./components/ClaudeAPIKey";
import { PowBlocsScope } from "./engine/PowBlocsScope";

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

// Update the ActionInputs component
function ActionInputs({
  actions,
  values,
  onChange,
  onRun,
}: {
  actions: ActionSchema;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onRun: (actionName: string) => void;
}) {
  const handleInputChange = (actionName: string, value: string) => {
    try {
      // Try to parse as JSON if it looks like an object or array
      const trimmed = value.trim();
      const newValue =
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
          ? JSON.parse(value)
          : value; // Keep as string if not JSON

      const newValues = { ...values };
      newValues[actionName] = newValue;
      onChange(newValues);
    } catch (e) {
      // If JSON parsing fails, store as string
      const newValues = { ...values };
      newValues[actionName] = value;
      onChange(newValues);
    }
  };

  return (
    <div className="space-y-4">
      {actions.map((action, index) => (
        <div key={index} className="space-y-2 bg-gray-50 p-4 rounded-lg border">
          <div className="flex justify-between items-center">
            <Label htmlFor={action.name}>{action.name}</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRun(action.name)}
            >
              Run Action
            </Button>
          </div>
          <Textarea
            id={action.name}
            value={
              typeof values[action.name] === "object"
                ? JSON.stringify(values[action.name], null, 2)
                : values[action.name] || "" // Default to empty string instead of "{}"
            }
            onChange={(e) => handleInputChange(action.name, e.target.value)}
            placeholder={`Enter ${action.name.toLowerCase()} parameters`}
          />
        </div>
      ))}
    </div>
  );
}

const UIPreview = React.memo(function UIPreview({ code }: { code: string }) {
  console.log("UIPreview", code);

  const cachedScope = useMemo(() => {
    return {
      Pow: PowBlocsScope,
    };
  }, []);

  const { element, error } = useRunner({
    code: processUICode(code),
    scope: cachedScope,
  });

  const errorDisplay = useMemo(() => {
    if (!error) return null;
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-red-800 mb-2">Error</h4>
        <pre className="text-sm text-red-600 whitespace-pre-wrap font-mono">
          {error.toString()}
        </pre>
      </div>
    );
  }, [error]);

  if (error) {
    return errorDisplay;
  }

  return <div className="bg-white p-4 rounded-lg">{element}</div>;
});

function App() {
  const [backendCode, setBackendCode] = useState("");
  const [uiCode, setUiCode] = useState("");
  const [actions, setActions] = useState<ActionSchema>([]);
  const [claudeKey, setClaudeKey] = useState<string>("");
  const [engine, setEngine] = useState<PowBlocksEngine | null>(null);
  const [description, setDescription] = useState<JSONContent | undefined>();
  const [isGeneratingSpec, setIsGeneratingSpec] = useState(false);
  const [isGeneratingBackendAndActions, setIsGeneratingBackendAndActions] =
    useState(false);
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

  const [actionValues, setActionValues] = useState<Record<string, any>>({});

  const [specEditorRef, setSpecEditorRef] = useState<Editor | null>(null);

  const [isGeneratingUI, setIsGeneratingUI] = useState(false);

  const [activeTab, setActiveTab] = useState<"spec" | "preview">("spec");

  useEffect(() => {
    // Load initial Claude API key
    getClaudeAPIKey().then((key) => {
      if (key) {
        setClaudeKey(key);
      }
    });
  }, []);

  useEffect(() => {
    if (!claudeKey) {
      setEngine(null);
      return;
    }

    const newEngine = new PowBlocksEngine({
      store: new LocalEngineStore(),
      apiKeys: {
        ANTHROPIC_API_KEY: claudeKey,
        OPENAI_API_KEY: "",
      },
    });
    setEngine(newEngine);

    // Load blocks only once when engine is initialized
    newEngine.store.listBlocks().then(setBlocks);
  }, [claudeKey]);

  const handleRunCode = async (actionName: string = "main") => {
    console.log("actionValues", actionValues[actionName]);
    try {
      const taskId = await DenoEngine.runCode(
        actionName,
        actionValues[actionName],
        backendCode
      );
      setCurrentTaskId(taskId);

      spinnerTimeout.current = setTimeout(() => {
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

  const handleGenerateSpec = async () => {
    if (!engine || !description) {
      return;
    }

    try {
      setIsGeneratingSpec(true);
      const block = await engine.updateOrCreateBlockFromDescription(
        description,
        selectedBlock?.id
      );

      if (specEditorRef) {
        specEditorRef.commands.setContent(block.specification);
      }

      const blocks = await engine.store.listBlocks();
      setBlocks(blocks);

      setSelectedBlock(block);
    } catch (error) {
      console.error("Failed to generate code:", error);
    } finally {
      setIsGeneratingSpec(false);
    }
  };

  const handleGenerateBackendAndActions = async () => {
    if (!engine || !selectedBlock?.id) {
      return;
    }

    try {
      setIsGeneratingBackendAndActions(true);
      const block = await engine.generateBackendCodeForBlock(selectedBlock?.id);

      setSelectedBlock(block);
      setActions(block.actions);
      setActionValues(
        block.actions.reduce((acc, action) => {
          acc[action.name] = action.inputExample;
          return acc;
        }, {} as Record<string, any>)
      );
      setBackendCode(block.backendCode);
    } catch (error) {
      console.error("Failed to generate backend and actions:", error);
    } finally {
      setIsGeneratingBackendAndActions(false);
    }
  };

  const handleGenerateUI = async () => {
    if (!engine || !selectedBlock?.id) {
      return;
    }

    try {
      setIsGeneratingUI(true);
      const block = await engine.generateUIForBlock(selectedBlock?.id);

      setSelectedBlock(block);
      setUiCode(block.uiCode);
    } catch (error) {
      console.error("Failed to generate UI code:", error);
    } finally {
      setIsGeneratingUI(false);
    }
  };

  const handleSelectBlock = useCallback((block: Block) => {
    setSelectedBlock(block);
    setDescription(block.description);
    setBackendCode(block.backendCode);
    setUiCode(block.uiCode);
    setActions(block.actions);
    setActionValues(
      block.actions.reduce((acc, action) => {
        acc[action.name] = action.inputExample;
        return acc;
      }, {} as Record<string, any>)
    );
  }, []);

  useEffect(() => {
    if (!selectedBlock) return;

    if (editorRef.current) {
      editorRef.current.commands.setContent(selectedBlock.description);
    }
    if (specEditorRef) {
      specEditorRef.commands.setContent(selectedBlock.specification);
    }
  }, [selectedBlock]);

  const handleBackendCodeChange = async (newCode: string) => {
    setBackendCode(newCode);

    if (engine && selectedBlock) {
      const updatedBlock = {
        ...selectedBlock,
        backendCode: newCode,
      };
      await engine.store.updateBlock(updatedBlock.id, updatedBlock);
      setSelectedBlock(updatedBlock);

      const blocks = await engine.store.listBlocks();
      setBlocks(blocks);
    }
  };

  const handleUiCodeChange = async (newCode: string) => {
    setUiCode(newCode);

    if (engine && selectedBlock) {
      const updatedBlock = {
        ...selectedBlock,
        uiCode: newCode,
      };
      await engine.store.updateBlock(updatedBlock.id, updatedBlock);
      setSelectedBlock(updatedBlock);

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

  const handleSpecificationChange = async (newSpecification: JSONContent) => {
    if (engine && selectedBlock) {
      const updatedBlock = {
        ...selectedBlock,
        specification: newSpecification,
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
        setBackendCode("");
        setUiCode("");
        setActions([]);
        setDescription(undefined);
      }
    } catch (error) {
      console.error("Failed to delete block:", error);
    }
  };

  const handleCreateNewBlock = () => {
    setSelectedBlock(undefined);
    setBackendCode("");
    setUiCode("");
    setDescription(undefined);
    setActions([]);
    setActionValues({});
    if (editorRef.current) {
      editorRef.current.commands.setContent("");
    }
    if (specEditorRef) {
      specEditorRef.commands.setContent("");
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
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Left Sidebar - Fixed width with flex column layout */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Search and blocks list in scrollable container */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4">
            <div className="mb-4 flex gap-2">
              <Input
                type="search"
                placeholder="Search blocks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCreateNewBlock}
                title="Create new block"
              >
                <LuPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Scrollable blocks list */}
          <div className="flex-1 px-4 overflow-y-auto">
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
        </div>

        {/* Claude API Key fixed at bottom */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <ClaudeAPIKey
            onClaudeAPIKeyChange={async (key: string) => {
              setClaudeKey(key);
            }}
          />
        </div>
      </div>

      {/* Main Content - Fix vertical scroll */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "spec" | "preview")}
              className="mb-4"
            >
              <TabsList>
                <TabsTrigger value="spec">Specification & Backend</TabsTrigger>
                <TabsTrigger value="preview">UI Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="spec">
                <div className="mb-4">
                  <TextEditor
                    onChange={handleDescriptionChange}
                    onEditorReady={(editor) => {
                      editorRef.current = editor;
                    }}
                    initialContent={selectedBlock?.description}
                    placeholder="Describe your block..."
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={handleGenerateSpec}
                      className="w-40 whitespace-normal h-auto py-2"
                      disabled={!engine || !description || isGeneratingSpec}
                    >
                      {isGeneratingSpec ? (
                        <span className="flex items-center justify-center gap-2">
                          <FaSpinner className="animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        "Gen Spec"
                      )}
                    </Button>

                    <Button
                      onClick={handleGenerateBackendAndActions}
                      className="w-40 whitespace-normal h-auto py-2"
                      disabled={
                        !engine ||
                        !description ||
                        !selectedBlock?.specification ||
                        isGeneratingBackendAndActions
                      }
                    >
                      {isGeneratingBackendAndActions ? (
                        <span className="flex items-center justify-center gap-2">
                          <FaSpinner className="animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        "Gen Actions"
                      )}
                    </Button>

                    <Button
                      onClick={handleGenerateUI}
                      className="w-40 whitespace-normal h-auto py-2"
                      disabled={
                        !engine ||
                        !description ||
                        !selectedBlock?.specification ||
                        !selectedBlock?.backendCode ||
                        !selectedBlock?.actions?.length ||
                        isGeneratingUI
                      }
                    >
                      {isGeneratingUI ? (
                        <span className="flex items-center justify-center gap-2">
                          <FaSpinner className="animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        "Gen UI"
                      )}
                    </Button>
                  </div>

                  <div className="mt-4">
                    <Collapsible defaultOpen>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Specification</h3>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-transparent p-0 data-[state=open]:rotate-90 transition-transform duration-200"
                          >
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">
                              Toggle specification
                            </span>
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent className="mt-2">
                        <TextEditor
                          onChange={handleSpecificationChange}
                          onEditorReady={(editor) => {
                            setSpecEditorRef(editor);
                          }}
                          initialContent={selectedBlock?.specification}
                          placeholder="Describe the implementation details..."
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Actions</h3>
                    <ActionInputs
                      actions={actions}
                      values={actionValues}
                      onChange={(values) => setActionValues(values)}
                      onRun={handleRunCode}
                    />
                  </div>

                  <div className="mt-4 overflow-auto">
                    <h3 className="text-sm font-medium mb-2">Backend Code</h3>
                    <div className="overflow-auto">
                      <CodeMirror
                        value={backendCode}
                        height="200px"
                        extensions={[
                          javascript({ jsx: true, typescript: true }),
                        ]}
                        onChange={handleBackendCodeChange}
                      />
                    </div>
                  </div>

                  <div className="mt-4 overflow-auto">
                    <h3 className="text-sm font-medium mb-2">UI Code</h3>
                    <div className="overflow-auto">
                      <CodeMirror
                        value={uiCode}
                        height="200px"
                        extensions={[
                          javascript({ jsx: true, typescript: true }),
                        ]}
                        onChange={handleUiCodeChange}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview">
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-4">UI Preview</h3>
                  {uiCode ? (
                    <UIPreview code={uiCode} />
                  ) : (
                    <EmptyState message="Generate UI code to see the preview" />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Fix vertical scroll */}
      <div className="w-96 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
        <TaskResults
          task={currentTask}
          showRunningSpinner={showRunningSpinner}
        />
        <div className="flex-1 overflow-hidden">
          <EventLog taskId={currentTask?.id} />
        </div>
      </div>
    </div>
  );
}

export default App;

function processUICode(code: string) {
  return code;
}
