import type { Server } from "socket.io";

import { touchSession } from "../services/postgresService.js";
import { refreshPresence, removePresence, setPresence } from "../services/redisService.js";

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

type PresenceUser = {
  userId: string;
  name: string;
  color: string;
  roomId: string;
};

const ROOM_ID_PATTERN = /^[a-zA-Z0-9]{1,20}$/;
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
    socket.on("room:join", (payload: RoomJoinPayload) => {
      if (!payload || !isValidRoomId(payload.roomId)) {
        socket.emit("room:join:error", {
          message: "Invalid roomId. Use alphanumeric characters only, max length 20."
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
        users: usersInRoom
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

    socket.on("disconnect", () => {
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
    });
  });
}
