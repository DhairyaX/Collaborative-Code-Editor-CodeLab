import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";

import type { editor as MonacoEditor } from "monaco-editor";

import type { EditorLanguage } from "../hooks/useEditorState";
import type { RemoteCursorEntry } from "../hooks/usePresence";

type CodeEditorProps = {
  language: EditorLanguage;
  onMount: OnMount;
  onCursorMove: (position: { lineNumber: number; column: number }) => void;
  remoteCursors: RemoteCursorEntry[];
  onContentChange: (value: string) => void;
};

function ensureCursorStyle(userId: string, color: string) {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const styleId = `cursor-style-${safeId}`;

  if (document.getElementById(styleId)) {
    return safeId;
  }

  const styleTag = document.createElement("style");
  styleTag.id = styleId;
  styleTag.textContent = `
    .remote-cursor-${safeId} {
      border-left: 2px solid ${color};
      background: color-mix(in srgb, ${color} 22%, transparent);
    }
    .remote-label-${safeId} {
      background: ${color};
      color: #0f172a;
      border-radius: 4px;
      padding: 0 4px;
      margin-left: 4px;
      font-size: 11px;
      font-weight: 600;
    }
  `;

  document.head.appendChild(styleTag);
  return safeId;
}

export function CodeEditor({
  language,
  onMount,
  onCursorMove,
  remoteCursors,
  onContentChange
}: CodeEditorProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const decorationIdsRef = useRef<string[]>([]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();

    if (!editor || !monaco || !model) {
      return;
    }

    const decorations = remoteCursors.map((cursor) => {
      const styleKey = ensureCursorStyle(cursor.userId, cursor.color);
      const safeLineNumber = Math.min(Math.max(cursor.position.lineNumber, 1), model.getLineCount());
      const lineMaxColumn = model.getLineMaxColumn(safeLineNumber);
      const safeColumn = Math.min(Math.max(cursor.position.column, 1), lineMaxColumn);

      // Monaco caret decorations are invisible on zero-length ranges, so use a 1-char range.
      const startColumn = safeColumn === lineMaxColumn ? Math.max(1, safeColumn - 1) : safeColumn;
      const endColumn = safeColumn === lineMaxColumn ? safeColumn : safeColumn + 1;

      return {
        range: new monaco.Range(
          safeLineNumber,
          startColumn,
          safeLineNumber,
          endColumn
        ),
        options: {
          inlineClassName: `remote-cursor-${styleKey}`,
          after: {
            content: ` ${cursor.name}`,
            inlineClassName: `remote-label-${styleKey}`
          }
        }
      };
    });

    decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, decorations);
  }, [remoteCursors]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((event) => {
      onCursorMove({
        lineNumber: event.position.lineNumber,
        column: event.position.column
      });
    });

    editor.onDidChangeModelContent(() => {
      onContentChange(editor.getValue());
    });

    editor.onDidChangeModel(() => {
      onContentChange(editor.getValue());
    });

    onMount(editor, monaco);

    // Sync once after the external Yjs binding swaps in the collaborative model.
    queueMicrotask(() => {
      onContentChange(editor.getValue());
    });
  };

  return (
    <div className="h-[calc(100vh-9rem)] min-h-[420px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <Editor
        height="100%"
        defaultLanguage="javascript"
        language={language}
        defaultValue=""
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          tabSize: 2,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: "on"
        }}
        onMount={handleMount}
      />
    </div>
  );
}
