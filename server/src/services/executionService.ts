import { PassThrough } from "node:stream";

import Docker from "dockerode";

import { config } from "../config.js";
import { getRuntimeSpec, type SupportedExecutionLanguage } from "./languageRuntime.js";

type ExecutionOutputChunk = {
  stream: "stdout" | "stderr";
  chunk: string;
};

type ExecuteCodeInput = {
  language: SupportedExecutionLanguage;
  code: string;
  onOutput: (chunk: ExecutionOutputChunk) => void;
};

type ExecuteCodeResult = {
  success: boolean;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
};

const docker = new Docker();

async function ensureImage(image: string): Promise<void> {
  try {
    await docker.getImage(image).inspect();
    return;
  } catch {
    // Pull image on demand the first time it is needed.
  }

  await new Promise<void>((resolve, reject) => {
    docker.pull(image, (pullError: Error | null, stream: NodeJS.ReadableStream) => {
      if (pullError || !stream) {
        reject(pullError ?? new Error("Failed to pull runtime image"));
        return;
      }

      docker.modem.followProgress(stream, (followError) => {
        if (followError) {
          reject(followError);
          return;
        }
        resolve();
      });
    });
  });
}

function buildCommand(language: SupportedExecutionLanguage, code: string): { image: string; cmd: string } {
  const runtime = getRuntimeSpec(language);
  const delimiter = "__CODELAB_EOF__";
  const sanitizedCode = code.replace(/\r\n/g, "\n");
  const cmd = [`cat <<'${delimiter}' > /tmp/${runtime.fileName}`, sanitizedCode, delimiter, runtime.command].join(
    "\n"
  );

  return {
    image: runtime.image,
    cmd
  };
}

export async function executeCode({ language, code, onOutput }: ExecuteCodeInput): Promise<ExecuteCodeResult> {
  const startedAt = Date.now();
  const { image, cmd } = buildCommand(language, code);

  await ensureImage(image);

  const container = (await (docker.createContainer({
    Image: image,
    Cmd: ["sh", "-lc", cmd],
    WorkingDir: "/tmp",
    AttachStdout: true,
    AttachStderr: true,
    NetworkDisabled: true,
    User: "1000:1000",
    Tty: false,
    HostConfig: {
      NetworkMode: "none",
      Memory: config.executionMemoryBytes,
      NanoCpus: config.executionCpuNano,
      PidsLimit: 64,
      AutoRemove: false,
      ReadonlyRootfs: false
    }
  }) as Promise<Docker.Container>)) as Docker.Container;

  let timedOut = false;
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    const attachStream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true
    });

    const stdout = new PassThrough();
    const stderr = new PassThrough();

    stdout.on("data", (buffer) => {
      onOutput({ stream: "stdout", chunk: buffer.toString("utf8") });
    });

    stderr.on("data", (buffer) => {
      onOutput({ stream: "stderr", chunk: buffer.toString("utf8") });
    });

    docker.modem.demuxStream(attachStream, stdout, stderr);

    await container.start();

    timeoutHandle = setTimeout(async () => {
      timedOut = true;
      try {
        await container.kill({ signal: "SIGKILL" });
      } catch {
        // Container may already be stopped.
      }
    }, config.executionTimeoutMs);

    const waitResult = await container.wait();
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    return {
      success: waitResult.StatusCode === 0 && !timedOut,
      exitCode: waitResult.StatusCode,
      timedOut,
      durationMs: Date.now() - startedAt
    };
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    try {
      await container.remove({ force: true });
    } catch {
      // If cleanup fails, container might have been auto-removed or already gone.
    }
  }
}
