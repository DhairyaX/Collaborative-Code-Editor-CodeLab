import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { CodeEditor } from "../components/CodeEditor";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useCollabDoc } from "../hooks/useCollabDoc";
import { useExecution } from "../hooks/useExecution";
import { usePresence } from "../hooks/usePresence";
import { DEFAULT_SNIPPETS, useEditorState } from "../hooks/useEditorState";

export function EditorPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const safeRoomId = roomId ?? "demo";
  const [roomTitle, setRoomTitle] = useState("Untitled room");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [roomTitleDraft, setRoomTitleDraft] = useState("");
  const [roomTitleError, setRoomTitleError] = useState("");
  const { language, setLanguage } = useEditorState(safeRoomId);
  const { syncStatus, handleEditorMount } = useCollabDoc(safeRoomId, language);
  const {
    socketStatus,
    socket,
    remoteCursorEntries,
    participantCount,
    moveCursor,
    roomLocked,
    updateRoomLock,
    currentUser,
    participantsList
  } = usePresence(safeRoomId);
  const [code, setCode] = useState(DEFAULT_SNIPPETS[language]);
  const { isRunning, output, statusText, runCode, clearOutput } = useExecution({
    roomId: safeRoomId,
    language,
    socket
  });

  const roomLink = `${window.location.origin}/room/${safeRoomId}`;

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("roomTitles") || "{}");
    const storedTitle = stored[safeRoomId];
    setRoomTitle(typeof storedTitle === "string" && storedTitle.trim() ? storedTitle : "Untitled room");
  }, [safeRoomId]);

  const roomOwners = JSON.parse(localStorage.getItem("roomOwners") || "{}");
  const roomOwnerName = typeof roomOwners[safeRoomId] === "string" ? roomOwners[safeRoomId] : "";

  const openSettings = () => {
    setRoomTitleDraft(roomTitle);
    setRoomTitleError("");
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    const nextTitle = roomTitleDraft.trim();
    if (!nextTitle) {
      setRoomTitleError("Please enter a room title");
      return;
    }

    const stored = JSON.parse(localStorage.getItem("roomTitles") || "{}");
    stored[safeRoomId] = nextTitle;
    localStorage.setItem("roomTitles", JSON.stringify(stored));
    setRoomTitle(nextTitle);
    setRoomTitleError("");
    setIsSettingsOpen(false);
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 1500);
    } catch {
      setInviteCopied(false);
    }
  };

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

  const isBooting = syncStatus === "connecting" || socketStatus === "connecting";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="sticky top-0 z-30 border-b border-slate-800/70 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">CodeLab</span>
            <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Editor</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/home"
              className="rounded border border-slate-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
            >
              Home
            </Link>
            <button
              type="button"
              className="rounded border border-slate-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:border-slate-600"
            >
              Rooms
            </button>
            <button
              type="button"
              onClick={openSettings}
              className="rounded border border-slate-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:border-slate-600"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              className="rounded border border-slate-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:border-slate-600"
            >
              Invite
            </button>
          </div>
        </div>
      </nav>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
        {isBooting && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex flex-col items-start gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Loading room</span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-cyan-400/80" />
              </div>
              <p className="text-sm text-slate-300">Connecting presence and syncing the document…</p>
            </div>
          </div>
        )}
        <header className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{roomTitle}</h1>
            <p className="text-sm text-slate-300">
              Room key:
              <span className="ml-2 rounded bg-slate-800 px-2 py-1 font-mono text-xs md:text-sm">{safeRoomId}</span>
            </p>
            <div className="mt-2">
              <LanguageSwitcher value={language} onChange={setLanguage} />
            </div>
          </div>
          <div className="w-full md:w-72">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">Participants</h2>
              <div className="mt-2 space-y-2">
                {currentUser && (
                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-100">{currentUser.name}</p>
                      <p className="text-xs text-slate-500">You</p>
                    </div>
                    {roomOwnerName && currentUser.name === roomOwnerName && (
                      <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
                        Admin
                      </span>
                    )}
                  </div>
                )}
                {participantsList.map((participant) => (
                  <div
                    key={participant.userId}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-slate-200">{participant.name}</p>
                    {roomOwnerName && participant.name === roomOwnerName && (
                      <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
                        Admin
                      </span>
                    )}
                  </div>
                ))}
                {!currentUser && participantsList.length === 0 && (
                  <p className="text-xs text-slate-500">Waiting for participants...</p>
                )}
              </div>
            </div>
          </div>
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

          <div className="flex flex-col gap-4 lg:col-span-4">
            <section className="flex min-h-[320px] flex-col rounded-xl border border-slate-800 bg-slate-950 p-3">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">Execution Output</h2>
              <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words rounded bg-black/50 p-3 font-mono text-xs text-slate-200">
                {output || "No output yet. Click Run to execute code in the current room."}
              </pre>
            </section>
          </div>
        </div>
      </section>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Room settings</h2>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-300">
                {safeRoomId}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Room title</label>
                <input
                  type="text"
                  value={roomTitleDraft}
                  onChange={(event) => setRoomTitleDraft(event.target.value)}
                  placeholder="Give your room a name"
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                {roomTitleError && (
                  <div className="mt-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                    {roomTitleError}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Default language</p>
                <p className="mt-1 text-xs text-slate-500">
                  Sets the language selection when you open this room.
                </p>
                <div className="mt-3">
                  <LanguageSwitcher value={language} onChange={setLanguage} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Room lock</p>
                <p className="mt-1 text-xs text-slate-500">
                  When locked, new users cannot join this room.
                </p>
                <button
                  type="button"
                  onClick={() => updateRoomLock(!roomLocked)}
                  className={`mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                    roomLocked
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${roomLocked ? "bg-rose-400" : "bg-emerald-400"}`} />
                  {roomLocked ? "Locked" : "Unlocked"}
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setRoomTitleDraft(roomTitle);
                  setRoomTitleError("");
                }}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 transition hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="rounded-full bg-emerald-400 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-950 transition hover:bg-emerald-300"
              >
                Save settings
              </button>
            </div>
          </div>
        </div>
      )}

      {isInviteOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Invite to room</h3>
            <p className="mt-2 text-sm text-slate-400">Share this link or room key.</p>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">Room link</p>
              <p className="mt-2 break-all text-sm text-slate-100">{roomLink}</p>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">Room key</p>
              <p className="mt-2 font-mono text-sm text-slate-100">{safeRoomId}</p>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 transition hover:border-slate-500"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="rounded-full bg-cyan-400 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-950 transition hover:bg-cyan-300"
              >
                {inviteCopied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
