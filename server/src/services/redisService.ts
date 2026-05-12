import { createClient, type RedisClientType } from "redis";

import { config } from "../config.js";

type PresenceRecord = {
  userId: string;
  name: string;
  color: string;
  roomId: string;
};

let redisClient: RedisClientType | null = null;
let redisReady = false;

function getSnapshotKey(roomId: string): string {
  return `${config.yjsSnapshotPrefix}${roomId}`;
}

function getPresenceUserKey(roomId: string, userId: string): string {
  return `${config.presencePrefix}${roomId}:user:${userId}`;
}

function getPresencePattern(roomId: string): string {
  return `${config.presencePrefix}${roomId}:user:*`;
}

function getRoomLockKey(roomId: string): string {
  return `${config.roomLockPrefix}${roomId}`;
}

export async function connectRedis(): Promise<void> {
  if (redisClient) {
    return;
  }

  redisClient = createClient({
    url: config.redisUrl
  });

  redisClient.on("error", (error) => {
    redisReady = false;
    console.error("[redis] connection error", error);
  });

  redisClient.on("ready", () => {
    redisReady = true;
    console.log("[redis] connected");
  });

  try {
    await redisClient.connect();
  } catch (error) {
    redisReady = false;
    console.error("[redis] failed to connect, running in degraded mode", error);
  }
}

export async function closeRedis(): Promise<void> {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
  } catch {
    await redisClient.disconnect();
  } finally {
    redisClient = null;
    redisReady = false;
  }
}

export function isRedisAvailable(): boolean {
  return redisClient !== null && redisReady;
}

export async function saveYjsSnapshot(roomId: string, binaryState: Uint8Array): Promise<void> {
  if (!redisClient || !redisReady) {
    return;
  }

  const key = getSnapshotKey(roomId);
  const serialized = Buffer.from(binaryState).toString("base64");

  await redisClient.set(key, serialized);
}

export async function loadYjsSnapshot(roomId: string): Promise<Uint8Array | null> {
  if (!redisClient || !redisReady) {
    return null;
  }

  const key = getSnapshotKey(roomId);
  const serialized = await redisClient.get(key);

  if (!serialized) {
    return null;
  }

  return Buffer.from(serialized, "base64");
}

export async function setPresence(roomId: string, userId: string, payload: PresenceRecord): Promise<void> {
  if (!redisClient || !redisReady) {
    return;
  }

  const key = getPresenceUserKey(roomId, userId);
  await redisClient.set(key, JSON.stringify(payload), {
    EX: config.presenceTtlSeconds
  });
}

export async function refreshPresence(roomId: string, userId: string): Promise<void> {
  if (!redisClient || !redisReady) {
    return;
  }

  const key = getPresenceUserKey(roomId, userId);
  await redisClient.expire(key, config.presenceTtlSeconds);
}

export async function removePresence(roomId: string, userId: string): Promise<void> {
  if (!redisClient || !redisReady) {
    return;
  }

  const key = getPresenceUserKey(roomId, userId);
  await redisClient.del(key);
}

export async function listPresence(roomId: string): Promise<PresenceRecord[]> {
  if (!redisClient || !redisReady) {
    return [];
  }

  const pattern = getPresencePattern(roomId);
  let cursor = 0;
  const keys: string[] = [];

  do {
    const response = await redisClient.scan(cursor, {
      MATCH: pattern,
      COUNT: 100
    });
    cursor = Number(response.cursor);
    keys.push(...response.keys);
  } while (cursor !== 0);

  if (keys.length === 0) {
    return [];
  }

  const values = await redisClient.mGet(keys);
  return values
    .filter((value): value is string => Boolean(value))
    .map((value) => JSON.parse(value) as PresenceRecord);
}

export async function setRoomLocked(roomId: string, locked: boolean): Promise<void> {
  if (!redisClient || !redisReady) {
    return;
  }

  const key = getRoomLockKey(roomId);
  await redisClient.set(key, locked ? "1" : "0");
}

export async function getRoomLocked(roomId: string): Promise<boolean> {
  if (!redisClient || !redisReady) {
    return false;
  }

  const key = getRoomLockKey(roomId);
  const value = await redisClient.get(key);
  return value === "1";
}
