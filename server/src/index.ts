import { createServer } from "node:http";

import { Server } from "socket.io";
import type { WebSocketServer } from "ws";

import { app } from "./app.js";
import { config } from "./config.js";
import { closePostgres, connectPostgres } from "./services/postgresService.js";
import { closeRedis, connectRedis } from "./services/redisService.js";
import { registerExecutionHandlers } from "./sockets/execution.js";
import { registerPresenceHandlers } from "./sockets/presence.js";
import { startYjsServer } from "./sockets/yjsServer.js";

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["polling", "websocket"],
  allowEIO3: true
});

registerPresenceHandlers(io);
registerExecutionHandlers(io);

// Debug logging
io.on("connection", (socket) => {
  console.log(`[socket.io] ✅ Client connected: ${socket.id} (rooms: ${socket.rooms.size})`);
  
  socket.on("disconnect", (reason) => {
    console.log(`[socket.io] ❌ Client disconnected: ${socket.id} - Reason: ${reason}`);
  });
  
  socket.on("error", (error) => {
    console.error(`[socket.io] ⚠️  Socket error: ${error}`);
  });
});

io.on("error", (error) => {
  console.error("[socket.io] Server error:", error);
});

let yjsServer: WebSocketServer | null = null;

async function shutdown() {
  console.log("Shutting down services...");
  io.close();
  httpServer.close();
  yjsServer?.close();
  await closeRedis();
  await closePostgres();
  process.exit(0);
}

async function bootstrap() {
  await connectRedis();
  await connectPostgres();

  httpServer.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
  });

  yjsServer = startYjsServer(config.yjsPort);
  console.log(`Yjs websocket server listening on port ${config.yjsPort}`);
}

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});

void bootstrap();
