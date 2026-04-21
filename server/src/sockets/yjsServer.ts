import * as Y from "yjs";
import { setPersistence, setupWSConnection } from "y-websocket/bin/utils";
import { WebSocketServer } from "ws";

import { touchSession } from "../services/postgresService.js";
import { loadYjsSnapshot, saveYjsSnapshot } from "../services/redisService.js";

const saveTimers = new Map<string, NodeJS.Timeout>();

async function saveSnapshot(docName: string, doc: Y.Doc): Promise<void> {
  const state = Y.encodeStateAsUpdate(doc);
  await saveYjsSnapshot(docName, state);
  await touchSession(docName);
}

export function startYjsServer(port: number): WebSocketServer {
  setPersistence({
    bindState: async (docName, ydoc) => {
      const snapshot = await loadYjsSnapshot(docName);
      if (snapshot) {
        Y.applyUpdate(ydoc as Y.Doc, snapshot);
      }

      (ydoc as Y.Doc).on("update", () => {
        const existingTimer = saveTimers.get(docName);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        const timer = setTimeout(() => {
          void saveSnapshot(docName, ydoc as Y.Doc);
          saveTimers.delete(docName);
        }, 500);

        saveTimers.set(docName, timer);
      });
    },
    writeState: async (docName, ydoc) => {
      await saveSnapshot(docName, ydoc as Y.Doc);
    }
  });

  const wss = new WebSocketServer({ port });

  wss.on("connection", (conn, req) => {
    setupWSConnection(conn, req, { gc: true });
  });

  return wss;
}
