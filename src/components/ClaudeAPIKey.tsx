import { useState, useEffect } from "react";

import { getClaudeAPIKey, setClaudeAPIKey } from "../localStore";
import { FaEdit } from "react-icons/fa";

export function ClaudeAPIKey({
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
