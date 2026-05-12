import type { Server } from "socket.io";

import { touchSession } from "../services/postgresService.js";
import { getRoomLocked, refreshPresence, removePresence, setPresence, setRoomLocked } from "../services/redisService.js";

type CursorPosition = {
  lineNumber: number;
  column: number;
};

type RoomJoinPayload = {
  roomId: string;
  displayName: string;
};

type CursorMovePayload = {
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

type PresenceUser = {
  userId: string;
  name: string;
  color: string;
  roomId: string;
};

const ROOM_ID_PATTERN = /^[a-zA-Z0-9-]{1,64}$/;
const COLOR_PALETTE = [
  "#22c55e",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
  "#eab308",
  "#3b82f6"
] as const;

function getColorFromSeed(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }

  const colorIndex = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[colorIndex];
}

function sanitizeName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Anonymous";
  }

  return trimmed.slice(0, 30);
}

function isValidRoomId(roomId: string): boolean {
  return ROOM_ID_PATTERN.test(roomId);
}

export function registerPresenceHandlers(io: Server) {
  const socketUsers = new Map<string, PresenceUser>();

  io.on("connection", (socket) => {
    socket.on("room:join", async (payload: RoomJoinPayload) => {
      if (!payload || !isValidRoomId(payload.roomId)) {
        socket.emit("room:join:error", {
          message: "Invalid roomId. Use letters, numbers, and dashes only; max length 64."
        });
        return;
      }

      const activeUsers = Array.from(socketUsers.values()).filter(
        (current) => current.roomId === payload.roomId
      );
      const wasLocked = await getRoomLocked(payload.roomId);

      if (wasLocked && activeUsers.length === 0) {
        await setRoomLocked(payload.roomId, false);
      }

      const isLocked = wasLocked && activeUsers.length > 0;
      if (isLocked) {
        socket.emit("room:join:error", {
          message: "Room is locked. Ask the host to unlock it."
        });
        return;
      }

      const safeDisplayName = sanitizeName(payload.displayName);

      const user: PresenceUser = {
        userId: socket.id,
        name: safeDisplayName,
        color: getColorFromSeed(safeDisplayName.toLowerCase()),
        roomId: payload.roomId
      };

      socketUsers.set(socket.id, user);
      socket.join(payload.roomId);

      void setPresence(payload.roomId, user.userId, user);
      void touchSession(payload.roomId).catch((error) => {
        console.error("[postgres] failed to touch session from presence join", error);
      });

      const usersInRoom = Array.from(socketUsers.values()).filter(
        (current) => current.roomId === payload.roomId && current.userId !== user.userId
      );

      socket.emit("room:joined", {
        roomId: payload.roomId,
        user,
        users: usersInRoom,
        locked: isLocked
      });
    socket.on("room:lock:set", async (payload: RoomLockPayload) => {
      const currentUser = socketUsers.get(socket.id);
      if (!currentUser || !payload || payload.roomId !== currentUser.roomId) {
        return;
      }

      await setRoomLocked(payload.roomId, payload.locked);
      io.to(payload.roomId).emit("room:lock:updated", {
        roomId: payload.roomId,
        locked: payload.locked
      });
    });

      socket.to(payload.roomId).emit("user:joined", {
        roomId: payload.roomId,
        user
      });
    });

    socket.on("cursor:move", (payload: CursorMovePayload) => {
      const currentUser = socketUsers.get(socket.id);
      if (!currentUser || !payload || payload.roomId !== currentUser.roomId) {
        return;
      }

      void refreshPresence(currentUser.roomId, currentUser.userId);

      socket.to(currentUser.roomId).emit("cursor:update", {
        roomId: currentUser.roomId,
        userId: currentUser.userId,
        position: payload.position,
        color: currentUser.color,
        name: currentUser.name
      });
    });

    socket.on("disconnect", async () => {
      const currentUser = socketUsers.get(socket.id);
      if (!currentUser) {
        return;
      }

      socketUsers.delete(socket.id);
      void removePresence(currentUser.roomId, currentUser.userId);
      socket.to(currentUser.roomId).emit("user:left", {
        roomId: currentUser.roomId,
        userId: currentUser.userId
      });

      const remainingUsers = Array.from(socketUsers.values()).filter(
        (current) => current.roomId === currentUser.roomId
      );
      if (remainingUsers.length === 0) {
        await setRoomLocked(currentUser.roomId, false);
      }
    });
  });
}
