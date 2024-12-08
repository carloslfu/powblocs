import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import Paragraph from "@tiptap/extension-paragraph";
import { EditorContent, useEditor } from "@tiptap/react";

import "./styles.css";

type SimpleTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SimpleTextEditor({ value, onChange }: SimpleTextEditorProps) {
  const editor = useEditor({
    extensions: [Document, Text, Paragraph],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getText());
    },
  });

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
