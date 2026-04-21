Service layer now includes runtime execution and persistence:

- executionService.ts: Docker-based secure code execution.
- languageRuntime.ts: runtime image/command mapping per language.
- redisService.ts: Yjs snapshot and presence persistence in Redis.
- postgresService.ts: session metadata persistence in PostgreSQL.
