import cors from "cors";
import express from "express";
import helmet from "helmet";

import { config } from "./config.js";
import { healthRouter } from "./routes/health.js";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "1mb" }));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!config.isProduction) {
        callback(null, true);
        return;
      }

      if (!origin || origin === config.corsOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error("Blocked by CORS policy"));
    },
    credentials: true
  })
);

app.use("/api", healthRouter);

export { app };
