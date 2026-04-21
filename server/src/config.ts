import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  yjsPort: Number(process.env.YJS_PORT ?? 1234),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  postgresUrl: process.env.POSTGRES_URL ?? "postgresql://codelab:codelab_password@localhost:5432/codelab",
  yjsSnapshotPrefix: process.env.YJS_SNAPSHOT_PREFIX ?? "yjs:snapshot:",
  presencePrefix: process.env.PRESENCE_PREFIX ?? "presence:room:",
  presenceTtlSeconds: Number(process.env.PRESENCE_TTL_SECONDS ?? 60),
  executionTimeoutMs: Number(process.env.EXECUTION_TIMEOUT_MS ?? 10_000),
  executionMemoryBytes: Number(process.env.EXECUTION_MEMORY_BYTES ?? 52_428_800),
  executionCpuNano: Number(process.env.EXECUTION_CPU_NANO ?? 500_000_000),
  executionRateLimitPerMinute: Number(process.env.EXECUTION_RATE_LIMIT_PER_MINUTE ?? 10)
};
