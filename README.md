# CodeLab - Real-Time Collaborative Code Editor

This repository is built phase-by-phase and now includes real-time editing, presence, execution, and persistence foundations.

## Current Status

Implemented:

- Docker Compose infrastructure for Redis + PostgreSQL
- Express backend + Socket.io + y-websocket sync server
- React 18 + TypeScript + Monaco editor frontend
- Real-time CRDT sync (Yjs) and presence/cursors
- Secure containerized code execution with streamed output
- Phase 6 persistence:
	- Yjs snapshots in Redis
	- Presence state in Redis with TTL
	- Session metadata in PostgreSQL

## Project Structure

```text
/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── main.tsx
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── sockets/
│   │   ├── services/
│   │   └── db/
├── docker-compose.yml
└── README.md
```

## Run Locally (Phase 1)

1. Start infrastructure:

```bash
docker compose up -d
```

2. Start backend:

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

3. Start frontend (new terminal):

```bash
cd client
npm install
npm run dev
```

## Environment Variables

Backend `.env` (copy from `server/.env.example`):

- `PORT` - HTTP + Socket server port.
- `YJS_PORT` - y-websocket server port.
- `CORS_ORIGIN` - allowed origin in production.
- `REDIS_URL` - Redis connection string.
- `POSTGRES_URL` - PostgreSQL connection string.
- `YJS_SNAPSHOT_PREFIX` - Redis key prefix for Yjs snapshots.
- `PRESENCE_PREFIX` - Redis key prefix for room presence records.
- `PRESENCE_TTL_SECONDS` - presence key TTL.
- `EXECUTION_TIMEOUT_MS` - max execution runtime.
- `EXECUTION_MEMORY_BYTES` - container memory cap.
- `EXECUTION_CPU_NANO` - CPU cap in nano CPUs.
- `EXECUTION_RATE_LIMIT_PER_MINUTE` - per-IP execution limit.

Frontend `.env` (copy from `client/.env.example`):

- `VITE_API_URL` - backend HTTP/Socket URL.
- `VITE_YJS_URL` - y-websocket URL.

## Database Migration

SQL migrations are in `server/db/migrations`.

Apply `server/db/migrations/001_create_sessions.sql` to PostgreSQL before production deployment.

During local development, the backend also runs `CREATE TABLE IF NOT EXISTS sessions` automatically on startup.

## Phase 6 Verification Checklist

1. Open room, type code, refresh page - code should persist from Redis snapshot.
2. Close all tabs, reopen same room - code should restore.
3. Join/leave room with multiple users - presence should update and clear stale users via TTL/disconnect cleanup.
4. Run code - execution output should stream, and `sessions.last_active_at` should update.
5. Restart backend and reopen room - last snapshot should be restored.

## Verify

- Backend health: `http://localhost:4000/api/health`
- Frontend: `http://localhost:5173/room/demo`

## Notes

- Production CORS is restricted by `CORS_ORIGIN`.
- Secrets are env-based and not hardcoded.
- Redis/PostgreSQL connectivity has degraded-mode handling: service stays online even if one persistence backend is temporarily unavailable.
