import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export function HomePage() {
  const navigate = useNavigate();
  const [joinRoomId, setJoinRoomId] = useState("");
  const [error, setError] = useState("");
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomTitle, setRoomTitle] = useState("");
  const [roomTitleError, setRoomTitleError] = useState("");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const roomTitles = JSON.parse(localStorage.getItem("roomTitles") || "{}");
  const roomEntries = Object.entries(roomTitles) as Array<[string, string]>;

  const handleCreateRoom = () => {
    setRoomTitle("");
    setRoomTitleError("");
    setIsRoomModalOpen(true);
  };

  const handleConfirmCreateRoom = () => {
    if (!roomTitle.trim()) {
      setRoomTitleError("Please enter a room title");
      return;
    }

    const newRoomId = uuidv4();
    const stored = JSON.parse(localStorage.getItem("roomTitles") || "{}");
    stored[newRoomId] = roomTitle.trim();
    localStorage.setItem("roomTitles", JSON.stringify(stored));
    const owners = JSON.parse(localStorage.getItem("roomOwners") || "{}");
    owners[newRoomId] = user.email || "Host";
    localStorage.setItem("roomOwners", JSON.stringify(owners));
    setIsRoomModalOpen(false);
    setRoomTitle("");
    setRoomTitleError("");
    navigate(`/room/${newRoomId}`);
  };

  const handleDeleteRoom = (roomId: string) => {
    const nextTitles = JSON.parse(localStorage.getItem("roomTitles") || "{}");
    const nextOwners = JSON.parse(localStorage.getItem("roomOwners") || "{}");
    delete nextTitles[roomId];
    delete nextOwners[roomId];
    localStorage.setItem("roomTitles", JSON.stringify(nextTitles));
    localStorage.setItem("roomOwners", JSON.stringify(nextOwners));
    setRoomTitleError("");
  };

  const handleJoinRoom = () => {
    if (!joinRoomId.trim()) {
      setError("Please enter a room ID");
      return;
    }
    setError("");
    navigate(`/room/${joinRoomId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100"
      style={{ fontFamily: "Space Grotesk, ui-sans-serif, system-ui, sans-serif" }}
    >
      <div className="pointer-events-none absolute -left-24 top-[-6rem] h-72 w-72 rounded-full bg-cyan-500/30 blur-[140px]" />
      <div className="pointer-events-none absolute right-[-8rem] top-40 h-80 w-80 rounded-full bg-emerald-500/25 blur-[160px]" />
      <div className="pointer-events-none absolute bottom-[-12rem] left-1/3 h-96 w-96 rounded-full bg-blue-500/20 blur-[200px]" />

      <header className="fixed inset-x-0 top-0 z-20 border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold uppercase tracking-[0.45em] text-cyan-300">CodeLab</span>
            <span className="text-xs uppercase tracking-[0.4em] text-slate-500">Live Studio</span>
          </div>
          <nav className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider">
            <button
              type="button"
              onClick={handleCreateRoom}
              className="rounded-full border border-cyan-500/40 px-4 py-2 text-cyan-100 transition hover:border-cyan-400 hover:text-white"
            >
              New Room
            </button>
            <a
              href="#join"
              className="rounded-full border border-slate-700 px-4 py-2 text-slate-200 transition hover:border-slate-500"
            >
              Join
            </a>
            <button
              onClick={handleLogout}
              className="rounded-full border border-slate-800 px-4 py-2 text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 pt-20">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-16 md:flex-row md:items-center md:gap-12">
          <div className="flex-1 space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-300/80">
              Welcome back {user.email ? `, ${user.email}` : ""}
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
              Build in sync. Execute in real time. Ship ideas faster.
            </h1>
            <p className="max-w-xl text-base text-slate-300 md:text-lg">
              CodeLab is your collaborative coding studio with live cursors, shared execution, and instant rooms.
              Spin up a session in seconds and invite your team.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleCreateRoom}
                className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-slate-950 transition hover:bg-cyan-300"
              >
                Create New Room
              </button>
              <a
                href="#join"
                className="rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
              >
                Join Existing Room
              </a>
            </div>
          </div>
          <div className="flex-1">
            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6 shadow-xl shadow-cyan-500/10">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Your rooms</span>
                <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                  Saved locally
                </span>
              </div>
              <div className="mt-6 space-y-3">
                {roomEntries.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-sm text-slate-300">No rooms yet. Create your first room to see it here.</p>
                  </div>
                ) : (
                  roomEntries.map(([id, title]) => (
                    <div
                      key={id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{title || "Untitled room"}</p>
                        <p className="mt-1 text-xs font-mono text-slate-500">{id}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/room/${id}`)}
                          className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoom(id)}
                          className="rounded-full border border-rose-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-rose-200 transition hover:border-rose-400 hover:text-rose-100"
                        >
                          End
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 pb-16 md:grid-cols-3">
          {[
            {
              title: "Live cursors + presence",
              body: "See collaborators instantly with live pointers, names, and activity badges."
            },
            {
              title: "Room-ready by default",
              body: "Create secure, shareable rooms in one click and jump into a session."
            },
            {
              title: "Run code together",
              body: "Execute snippets in the same context and stream output to everyone."
            }
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-800/70 bg-slate-900/50 p-6 backdrop-blur"
            >
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{feature.body}</p>
            </div>
          ))}
        </section>

        <section id="join" className="mx-auto w-full max-w-6xl px-5 pb-20">
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-8 md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Join a room</p>
                <h2 className="text-2xl font-semibold text-white">Enter a room key and jump in.</h2>
                <p className="text-sm text-slate-300">
                  Paste the room ID from a teammate to sync instantly. No installs, just join.
                </p>
              </div>
              <div className="w-full max-w-md space-y-3">
                <input
                  type="text"
                  placeholder="Enter room ID"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="w-full rounded-full border border-slate-700 bg-slate-950/70 px-5 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  onClick={handleJoinRoom}
                  className="w-full rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-slate-950 transition hover:bg-emerald-300"
                >
                  Join Room
                </button>
                {error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-16">
          <div className="grid gap-6 rounded-3xl border border-slate-800/70 bg-slate-900/50 p-8 md:grid-cols-3 md:p-10">
            {[
              {
                step: "01",
                title: "Create a room",
                body: "Generate a unique room and share the link with your team."
              },
              {
                step: "02",
                title: "Collaborate live",
                body: "Edit together with synced cursors, presence, and shared context."
              },
              {
                step: "03",
                title: "Run & review",
                body: "Execute code in the room and review output in real time."
              }
            ].map((step) => (
              <div key={step.step} className="space-y-3 rounded-2xl border border-slate-800/70 bg-slate-950/50 p-5">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
                  {step.step}
                </span>
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-slate-300">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-20">
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/50 p-8 md:p-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">FAQ</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Answers for the basics.</h2>
              </div>
              <span className="text-xs uppercase tracking-[0.4em] text-slate-500">Still unsure? Ping your lead</span>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {[
                {
                  q: "Is CodeLab real-time?",
                  a: "Yes. Edits, cursors, and execution output sync instantly for everyone in the room."
                },
                {
                  q: "Do I need an account?",
                  a: "Yes. Sign in to create or join rooms so we can keep sessions secure."
                },
                {
                  q: "Can I share a room link?",
                  a: "Absolutely. Share the room ID or link with teammates to bring them in."
                },
                {
                  q: "Which languages are supported?",
                  a: "JavaScript, Python, C, C++, and Java are available right now."
                }
              ].map((item) => (
                <div key={item.q} className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5">
                  <h3 className="text-sm font-semibold text-white">{item.q}</h3>
                  <p className="mt-2 text-sm text-slate-300">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/70 bg-slate-950/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>CodeLab Collaborative Studio · Real-time rooms for your team.</span>
          <span className="uppercase tracking-[0.4em]">Built for speed</span>
        </div>
      </footer>

      {isRoomModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Name your room</h3>
            <p className="mt-2 text-sm text-slate-400">Give this session a clear title for your team.</p>
            <input
              type="text"
              placeholder="e.g. DSA Practice, Team Review"
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
              className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
            />
            {roomTitleError && (
              <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                {roomTitleError}
              </div>
            )}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsRoomModalOpen(false);
                  setRoomTitle("");
                  setRoomTitleError("");
                }}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 transition hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateRoom}
                className="rounded-full bg-emerald-400 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-950 transition hover:bg-emerald-300"
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
