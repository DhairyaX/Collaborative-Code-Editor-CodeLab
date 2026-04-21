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
    origin: config.isProduction ? config.corsOrigin : true,
    credentials: true
  }
});

registerPresenceHandlers(io);
registerExecutionHandlers(io);

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
