import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";

interface SimpleTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function SimpleTextEditor({ value, onChange }: SimpleTextEditorProps) {
  const editor = useEditor({
    extensions: [Document, Text],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getText());
    },
  });

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
}
