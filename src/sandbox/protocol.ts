import type { ExecResult, SchemaTable } from "./types.ts"

/** Where a new database comes from. */
export type DatabaseSource =
  | { readonly kind: "empty" }
  | { readonly kind: "image"; readonly bytes: Uint8Array }
  /** An SQL script: a template or a `.sql` file. */
  | { readonly kind: "script"; readonly sql: string }

/** Messages from the page to the worker. Every request has an id; the answer has the same id. */
export type WorkerRequest =
  | { readonly id: number; readonly kind: "open"; readonly source: DatabaseSource }
  | { readonly id: number; readonly kind: "exec"; readonly sql: string }
  | { readonly id: number; readonly kind: "dump" }

/** The state of the database after a request. `image` is set when the data changed, so the page can save it. */
export interface DatabaseState {
  readonly schema: readonly SchemaTable[]
  readonly image: Uint8Array | null
  /** Size of the database file in bytes (the last known one when `image` is null). */
  readonly size: number
  /** Why the changed database could not be exported, for example an open transaction; null when all is well. */
  readonly saveError: string | null
}

export type WorkerResponse =
  | { readonly id: number; readonly kind: "opened"; readonly state: DatabaseState; readonly exec: ExecResult | null }
  | { readonly id: number; readonly kind: "executed"; readonly state: DatabaseState; readonly exec: ExecResult }
  | { readonly id: number; readonly kind: "dumped"; readonly sql: string }
  | { readonly id: number; readonly kind: "failed"; readonly message: string }
