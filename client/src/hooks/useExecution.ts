import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

import type { EditorLanguage } from "./useEditorState";

type ExecutionOutputPayload = {
  executionId: string;
  roomId: string;
  stream: "stdout" | "stderr";
  chunk: string;
};

type ExecutionDonePayload = {
  executionId: string;
  roomId: string;
  success: boolean;
  exitCode?: number | null;
  timedOut?: boolean;
  durationMs?: number;
  error?: string;
};

type UseExecutionInput = {
  roomId: string;
  language: EditorLanguage;
  socket: Socket | null;
};

export function useExecution({ roomId, language, socket }: UseExecutionInput) {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [lastResult, setLastResult] = useState<ExecutionDonePayload | null>(null);
  const activeExecutionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleOutput = (payload: ExecutionOutputPayload) => {
      if (payload.roomId !== roomId) {
        return;
      }

      if (activeExecutionIdRef.current !== payload.executionId) {
        activeExecutionIdRef.current = payload.executionId;
        setOutput(payload.chunk);
        setLastResult(null);
        setIsRunning(true);
        return;
      }

      setOutput((current) => `${current}${payload.chunk}`);
    };

    const handleDone = (payload: ExecutionDonePayload) => {
      if (payload.roomId !== roomId) {
        return;
      }

      if (activeExecutionIdRef.current !== payload.executionId) {
        activeExecutionIdRef.current = payload.executionId;
        setOutput("");
      }

      setIsRunning(false);
      setLastResult(payload);
    };

    socket.on("execute:output", handleOutput);
    socket.on("execute:done", handleDone);

    return () => {
      socket.off("execute:output", handleOutput);
      socket.off("execute:done", handleDone);
    };
  }, [roomId, socket]);

  const runCode = useCallback(
    (code: string) => {
      if (!socket || socket.connected !== true || isRunning) {
        return;
      }

      setIsRunning(true);
      setOutput("");
      setLastResult(null);
      activeExecutionIdRef.current = null;

      socket.emit("execute:run", {
        roomId,
        code,
        language
      });
    },
    [isRunning, language, roomId, socket]
  );

  const clearOutput = useCallback(() => {
    if (isRunning) {
      return;
    }

    setOutput("");
    setLastResult(null);
  }, [isRunning]);

  const statusText = useMemo(() => {
    if (isRunning) {
      return "Running...";
    }

    if (!lastResult) {
      return "Idle";
    }

    if (lastResult.success) {
      return `Completed (exit ${lastResult.exitCode ?? 0})`;
    }

    if (lastResult.error) {
      return `Failed: ${lastResult.error}`;
    }

    if (lastResult.timedOut) {
      return "Failed: Timed out";
    }

    return `Failed (exit ${lastResult.exitCode ?? "?"})`;
  }, [isRunning, lastResult]);

  return {
    isRunning,
    output,
    statusText,
    runCode,
    clearOutput
  };
}
