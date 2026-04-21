declare module "y-websocket/bin/utils" {
  export type PersistenceProvider = {
    bindState: (docName: string, ydoc: unknown) => Promise<void> | void;
    writeState: (docName: string, ydoc: unknown) => Promise<void>;
    provider?: unknown;
  };

  export function setupWSConnection(
    conn: unknown,
    req: unknown,
    opts?: { gc?: boolean; docName?: string }
  ): void;
  export function setPersistence(persistence: PersistenceProvider | null): void;
}
