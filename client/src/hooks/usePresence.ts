import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const SOCKET_SERVER_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const DISPLAY_NAME_STORAGE_KEY = "codelab.displayName";

type CursorPosition = {
  lineNumber: number;
  column: number;
};

type PresenceUser = {
  userId: string;
  name: string;
  color: string;
};

type RoomJoinedPayload = {
  roomId: string;
  user: PresenceUser;
  users: PresenceUser[];
  locked: boolean;
};

type UserJoinedPayload = {
  roomId: string;
  user: PresenceUser;
};

type UserLeftPayload = {
  roomId: string;
  userId: string;
};

type CursorUpdatePayload = {
  roomId: string;
  userId: string;
  position: CursorPosition;
  color: string;
  name: string;
};

type RoomLockPayload = {
  roomId: string;
  locked: boolean;
};

type RemoteCursor = {
  userId: string;
  name: string;
  color: string;
  position: CursorPosition;
};

export type RemoteCursorEntry = {
  userId: string;
  name: string;
  color: string;
  position: CursorPosition;
};

function getDisplayName(): string {
  const user = JSON.parse(window.localStorage.getItem("user") || "{}");
  if (typeof user.email === "string" && user.email.trim()) {
    return user.email.trim();
  }

  const existing = window.localStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
  if (existing && existing.trim()) {
    return existing;
  }

  const generated = `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
  window.localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, generated);
  return generated;
}

export function usePresence(roomId: string) {
  const [displayName] = useState<string>(() => getDisplayName());
  const [socketStatus, setSocketStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [currentUser, setCurrentUser] = useState<PresenceUser | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const [participants, setParticipants] = useState<Record<string, PresenceUser>>({});
  const [roomLocked, setRoomLocked] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket: Socket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });
    socketRef.current = socket;

    setSocketStatus("connecting");

    const joinRoom = () => {
      socket.emit("room:join", {
        roomId,
        displayName
      });
    };

    socket.on("connect", () => {
      setSocketStatus("connected");
      joinRoom();
    });

    socket.on("disconnect", () => {
      setSocketStatus("disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.io connection error:", error);
      setSocketStatus("disconnected");
    });

    socket.on("room:join:error", () => {
      setSocketStatus("disconnected");
    });

    socket.on("room:joined", (payload: RoomJoinedPayload) => {
      if (payload.roomId !== roomId) {
        return;
      }

      setCurrentUser(payload.user);
      setRoomLocked(payload.locked ?? false);

      const participantMap: Record<string, PresenceUser> = {};
      payload.users.forEach((user) => {
        participantMap[user.userId] = user;
      });
      setParticipants(participantMap);
      setRemoteCursors({});
    });

    socket.on("user:joined", (payload: UserJoinedPayload) => {
      if (payload.roomId !== roomId) {
        return;
      }

      setParticipants((current) => ({
        ...current,
        [payload.user.userId]: payload.user
      }));
    });

    socket.on("user:left", (payload: UserLeftPayload) => {
      if (payload.roomId !== roomId) {
        return;
      }

      setParticipants((current) => {
        const next = { ...current };
        delete next[payload.userId];
        return next;
      });

      setRemoteCursors((current) => {
        const next = { ...current };
        delete next[payload.userId];
        return next;
      });
    });

    socket.on("cursor:update", (payload: CursorUpdatePayload) => {
      if (payload.roomId !== roomId) {
        return;
      }

      setRemoteCursors((current) => ({
        ...current,
        [payload.userId]: {
          userId: payload.userId,
          name: payload.name,
          color: payload.color,
          position: payload.position
        }
      }));
    });

    socket.on("room:lock:updated", (payload: RoomLockPayload) => {
      if (payload.roomId !== roomId) {
        return;
      }

      setRoomLocked(payload.locked);
    });

    return () => {
      socketRef.current = null;
      socket.disconnect();
      setCurrentUser(null);
      setParticipants({});
      setRemoteCursors({});
      setRoomLocked(false);
    };
  }, [displayName, roomId]);

  const moveCursor = (position: CursorPosition) => {
    if (!currentUser || !socketRef.current || socketRef.current.connected !== true) {
      return;
    }

    socketRef.current.emit("cursor:move", {
      roomId,
      userId: currentUser.userId,
      position,
      color: currentUser.color,
      name: currentUser.name
    });
  };

  const remoteCursorEntries = useMemo<RemoteCursorEntry[]>(
    () => Object.values(remoteCursors),
    [remoteCursors]
  );

  const updateRoomLock = (locked: boolean) => {
    if (!socketRef.current || socketRef.current.connected !== true) {
      return;
    }

    socketRef.current.emit("room:lock:set", {
      roomId,
      locked
    });
  };

  return {
    displayName,
    socketStatus,
    socket: socketRef.current,
    currentUser,
    remoteCursorEntries,
    participantCount: Object.keys(participants).length + (currentUser ? 1 : 0),
    moveCursor,
    roomLocked,
    updateRoomLock,
    participantsList: Object.values(participants)
  };
}
