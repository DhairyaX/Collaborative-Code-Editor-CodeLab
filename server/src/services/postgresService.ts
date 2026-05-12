import { Pool } from "pg";

import { config } from "../config.js";

let pool: Pool | null = null;
let postgresReady = false;

const CREATE_SESSIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  room_id VARCHAR(64) UNIQUE NOT NULL,
  language VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_last_active_at ON sessions (last_active_at DESC);
`;

export async function connectPostgres(): Promise<void> {
  if (pool) {
    return;
  }

  pool = new Pool({
    connectionString: config.postgresUrl
  });

  try {
    await pool.query("SELECT 1");
    await pool.query(CREATE_SESSIONS_TABLE_SQL);
    postgresReady = true;
    console.log("[postgres] connected");
  } catch (error) {
    postgresReady = false;
    console.error("[postgres] failed to connect, running in degraded mode", error);
  }
}

export async function closePostgres(): Promise<void> {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
  postgresReady = false;
}

export function isPostgresAvailable(): boolean {
  return pool !== null && postgresReady;
}

export async function touchSession(roomId: string, language?: string): Promise<void> {
  if (!pool || !postgresReady) {
    return;
  }

  await pool.query(
    `
      INSERT INTO sessions (room_id, language)
      VALUES ($1, $2)
      ON CONFLICT (room_id)
      DO UPDATE
      SET
        language = COALESCE(EXCLUDED.language, sessions.language),
        updated_at = NOW(),
        last_active_at = NOW()
    `,
    [roomId, language ?? null]
  );
}

export async function getSession(roomId: string): Promise<{
  roomId: string;
  language: string | null;
  lastActiveAt: Date;
} | null> {
  if (!pool || !postgresReady) {
    return null;
  }

  const result = await pool.query<{
    room_id: string;
    language: string | null;
    last_active_at: Date;
  }>(
    `
      SELECT room_id, language, last_active_at
      FROM sessions
      WHERE room_id = $1
      LIMIT 1
    `,
    [roomId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    roomId: row.room_id,
    language: row.language,
    lastActiveAt: row.last_active_at
  };
}
