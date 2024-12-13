import { useEffect } from "react";

import StarterKit from "@tiptap/starter-kit";
import { EditorContent, JSONContent, useEditor } from "@tiptap/react";
import { Color } from "@tiptap/extension-color";
import ListItem from "@tiptap/extension-list-item";
import TextStyle from "@tiptap/extension-text-style";

import "./styles.css";

type TextEditorProps = {
  value?: JSONContent;
  onChange: (value: JSONContent) => void;
};

export const textEditorExtensions = [
  Color.configure({ types: [TextStyle.name, ListItem.name] }),
  TextStyle,
  StarterKit.configure({
    bulletList: {
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false,
    },
  }),
];

export function TextEditor({ value, onChange }: TextEditorProps) {
  const editor = useEditor({
    extensions: textEditorExtensions,
    content: value ?? {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }],
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  useEffect(() => {
    if (editor && value) {
      editor.commands.setContent(value, false);
    }
  }, [value]);

  if (!editor) {
    return null;
  }

  return (
    <EditorContent
      editor={editor}
      className="tiptap-editor border border-gray-300 p-2 rounded-md focus-within:border-gray-400"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
    />
  );
}

/*

1. Send HTTP GET request to "http://localhost:11434/api/tags" to retrieve Ollama models list

2. Search through the response for models containing "yi" or "yi-coder"
   - Store the exact model name if found

3. Make API call to Ollama using the identified Yi model:
   - Endpoint: http://localhost:11434/api/generate
   - Request: Generate Fibonacci sequence implementation in JavaScript
   - Parameters: Use selected Yi model name

Expected output: JavaScript code for Fibonacci sequence calculation
*/
