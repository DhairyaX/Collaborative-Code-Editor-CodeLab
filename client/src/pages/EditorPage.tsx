import { useState } from "react";
import { useParams } from "react-router-dom";

import { CodeEditor } from "../components/CodeEditor";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useCollabDoc } from "../hooks/useCollabDoc";
import { useExecution } from "../hooks/useExecution";
import { usePresence } from "../hooks/usePresence";
import { DEFAULT_SNIPPETS, useEditorState } from "../hooks/useEditorState";

export function EditorPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const safeRoomId = roomId ?? "demo";
  const { language, setLanguage } = useEditorState(safeRoomId);
  const { syncStatus, handleEditorMount } = useCollabDoc(safeRoomId, language);
  const { socketStatus, socket, remoteCursorEntries, participantCount, moveCursor } = usePresence(safeRoomId);
  const [code, setCode] = useState(DEFAULT_SNIPPETS[language]);
  const { isRunning, output, statusText, runCode, clearOutput } = useExecution({
    roomId: safeRoomId,
    language,
    socket
  });

  const syncBadgeClass =
    syncStatus === "connected"
      ? "bg-emerald-600/20 text-emerald-300"
      : syncStatus === "connecting"
        ? "bg-amber-500/20 text-amber-200"
        : "bg-rose-600/20 text-rose-300";

  const presenceBadgeClass =
    socketStatus === "connected"
      ? "bg-emerald-600/20 text-emerald-300"
      : socketStatus === "connecting"
        ? "bg-amber-500/20 text-amber-200"
        : "bg-rose-600/20 text-rose-300";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
        <header className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">CodeLab Editor</h1>
            <p className="text-sm text-slate-300">
              Room:
              <span className="ml-2 rounded bg-slate-800 px-2 py-1 font-mono text-xs md:text-sm">{safeRoomId}</span>
            </p>
          </div>
          <LanguageSwitcher value={language} onChange={setLanguage} />
        </header>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className={`rounded px-3 py-1 text-xs font-medium uppercase tracking-wide ${presenceBadgeClass}`}>
            Presence: {socketStatus}
          </span>
          <span className={`rounded px-3 py-1 text-xs font-medium uppercase tracking-wide ${syncBadgeClass}`}>
            Sync: {syncStatus}
          </span>
          <span className="rounded bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-200">
            Participants: {participantCount}
          </span>
          <span className="rounded bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-200">
            Execution: {statusText}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="rounded bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            disabled={isRunning || socketStatus !== "connected"}
            onClick={() => runCode(code)}
          >
            {isRunning ? "Running..." : "Run"}
          </button>
          <button
            type="button"
            className="rounded border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isRunning}
            onClick={clearOutput}
          >
            Clear Output
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="lg:col-span-8">
            <CodeEditor
              language={language}
              onMount={handleEditorMount}
              onCursorMove={moveCursor}
              remoteCursors={remoteCursorEntries}
              onContentChange={setCode}
            />
          </section>

          <section className="flex min-h-[420px] flex-col rounded-xl border border-slate-800 bg-slate-950 p-3 lg:col-span-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">Execution Output</h2>
            <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words rounded bg-black/50 p-3 font-mono text-xs text-slate-200">
              {output || "No output yet. Click Run to execute code in the current room."}
            </pre>
          </section>
        </div>
      </section>
    </main>
  );
}
