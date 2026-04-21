export type SupportedExecutionLanguage = "javascript" | "python" | "c" | "cpp" | "java";

export type RuntimeSpec = {
  image: string;
  fileName: string;
  command: string;
};

const RUNTIMES: Record<SupportedExecutionLanguage, RuntimeSpec> = {
  javascript: {
    image: "node:18-alpine",
    fileName: "main.js",
    command: "node /tmp/main.js"
  },
  python: {
    image: "python:3.11-alpine",
    fileName: "main.py",
    command: "python /tmp/main.py"
  },
  c: {
    image: "gcc:13",
    fileName: "main.c",
    command: "gcc /tmp/main.c -O2 -o /tmp/main && /tmp/main"
  },
  cpp: {
    image: "gcc:13",
    fileName: "main.cpp",
    command: "g++ /tmp/main.cpp -O2 -o /tmp/main && /tmp/main"
  },
  java: {
    image: "eclipse-temurin:21-jdk",
    fileName: "Main.java",
    command: "javac /tmp/Main.java && java -cp /tmp Main"
  }
};

export function isSupportedExecutionLanguage(value: string): value is SupportedExecutionLanguage {
  return value in RUNTIMES;
}

export function getRuntimeSpec(language: SupportedExecutionLanguage): RuntimeSpec {
  return RUNTIMES[language];
}
