import { randomUUID } from "node:crypto";

import type { Server } from "socket.io";

import { config } from "../config.js";
import { executeCode } from "../services/executionService.js";
import { isSupportedExecutionLanguage } from "../services/languageRuntime.js";
import { touchSession } from "../services/postgresService.js";

type ExecuteRunPayload = {
  roomId: string;
  code: string;
  language: string;
};

const ROOM_ID_PATTERN = /^[a-zA-Z0-9]{1,20}$/;
const RATE_LIMIT_WINDOW_MS = 60_000;

type RateLimitEntry = {
  timestamps: number[];
};

function isValidRoomId(roomId: string): boolean {
  return ROOM_ID_PATTERN.test(roomId);
}

export function registerExecutionHandlers(io: Server) {
  const rateByIp = new Map<string, RateLimitEntry>();

  io.on("connection", (socket) => {
    socket.on("execute:run", async (payload: ExecuteRunPayload) => {
      const executionId = randomUUID();
      const ip = socket.handshake.address ?? "unknown";

      const now = Date.now();
      const entry = rateByIp.get(ip) ?? { timestamps: [] };
      entry.timestamps = entry.timestamps.filter((value) => now - value <= RATE_LIMIT_WINDOW_MS);

      if (entry.timestamps.length >= config.executionRateLimitPerMinute) {
        socket.emit("execute:done", {
          executionId,
          roomId: payload?.roomId ?? "",
          success: false,
          error: "Execution rate limit exceeded. Please wait before running again."
        });
        rateByIp.set(ip, entry);
        return;
      }

      entry.timestamps.push(now);
      rateByIp.set(ip, entry);

      if (!payload || !isValidRoomId(payload.roomId)) {
        socket.emit("execute:done", {
          executionId,
          roomId: payload?.roomId ?? "",
          success: false,
          error: "Invalid roomId. Use alphanumeric characters only, max length 20."
        });
        return;
      }

      if (typeof payload.code !== "string" || payload.code.trim().length === 0) {
        io.to(payload.roomId).emit("execute:done", {
          executionId,
          roomId: payload.roomId,
          success: false,
          error: "Code cannot be empty."
        });
        return;
      }

      if (!isSupportedExecutionLanguage(payload.language)) {
        io.to(payload.roomId).emit("execute:done", {
          executionId,
          roomId: payload.roomId,
          success: false,
          error: `Unsupported language: ${payload.language}`
        });
        return;
      }

      void touchSession(payload.roomId, payload.language).catch((error) => {
        console.error("[postgres] failed to touch session from execution", error);
      });

      try {
        const result = await executeCode({
          language: payload.language,
          code: payload.code,
          onOutput: ({ stream, chunk }) => {
            io.to(payload.roomId).emit("execute:output", {
              executionId,
              roomId: payload.roomId,
              stream,
              chunk
            });
          }
        });

        io.to(payload.roomId).emit("execute:done", {
          executionId,
          roomId: payload.roomId,
          success: result.success,
          exitCode: result.exitCode,
          timedOut: result.timedOut,
          durationMs: result.durationMs
        });
      } catch (error) {
        io.to(payload.roomId).emit("execute:done", {
          executionId,
          roomId: payload.roomId,
          success: false,
          error: error instanceof Error ? error.message : "Execution failed"
        });
      }
    });
  });
}
