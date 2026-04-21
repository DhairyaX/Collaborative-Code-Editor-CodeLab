import { useCallback, useEffect, useRef, useState } from "react";

import type { editor as MonacoEditor } from "monaco-editor";
import { MonacoBinding } from "y-monaco";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import { DEFAULT_SNIPPETS, type EditorLanguage } from "./useEditorState";

const YJS_SERVER_URL = import.meta.env.VITE_YJS_URL ?? "ws://localhost:1234";

type SyncStatus = "connecting" | "connected" | "disconnected";

export function useCollabDoc(roomId: string, language: EditorLanguage) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");

  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const modelsRef = useRef<Map<EditorLanguage, MonacoEditor.ITextModel>>(new Map());

  const bindLanguageModel = useCallback(
    (nextLanguage: EditorLanguage) => {
      const doc = docRef.current;
      const provider = providerRef.current;
      const editor = editorRef.current;
      const monaco = monacoRef.current;

      if (!doc || !provider || !editor || !monaco) {
        return;
      }

      bindingRef.current?.destroy();

      const yText = doc.getText(`code:${nextLanguage}`);
      if (yText.length === 0) {
        yText.insert(0, DEFAULT_SNIPPETS[nextLanguage]);
      }

      const existingModel = modelsRef.current.get(nextLanguage);
      const model =
        existingModel ??
        monaco.editor.createModel(
          yText.toString(),
          nextLanguage,
          monaco.Uri.parse(`inmemory://codelab/${roomId}/${nextLanguage}`)
        );

      modelsRef.current.set(nextLanguage, model);
      editor.setModel(model);

      bindingRef.current = new MonacoBinding(yText, model, new Set([editor]), provider.awareness);
    },
    [roomId]
  );

  const handleEditorMount = useCallback(
    (editor: MonacoEditor.IStandaloneCodeEditor, monaco: typeof import("monaco-editor")) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      bindLanguageModel(language);
    },
    [bindLanguageModel, language]
  );

  useEffect(() => {
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(YJS_SERVER_URL, roomId, doc, {
      connect: true
    });

    docRef.current = doc;
    providerRef.current = provider;
    setSyncStatus("connecting");

    const handleStatus = ({ status }: { status: "connecting" | "connected" | "disconnected" }) => {
      setSyncStatus(status === "disconnected" ? "disconnected" : status);
    };

    provider.on("status", handleStatus);

    if (editorRef.current && monacoRef.current) {
      bindLanguageModel(language);
    }

    return () => {
      provider.off("status", handleStatus);
      bindingRef.current?.destroy();
      bindingRef.current = null;

      modelsRef.current.forEach((model) => model.dispose());
      modelsRef.current.clear();

      provider.destroy();
      doc.destroy();

      providerRef.current = null;
      docRef.current = null;
      setSyncStatus("disconnected");
    };
  }, [bindLanguageModel, roomId]);

  useEffect(() => {
    bindLanguageModel(language);
  }, [bindLanguageModel, language]);

  return {
    syncStatus,
    handleEditorMount
  };
}
