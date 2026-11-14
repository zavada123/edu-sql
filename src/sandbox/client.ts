import type { SqlJsStatic } from "sql.js"
import { DatabaseHost } from "./host.ts"
import { QUERY_TIMEOUT_MS } from "./limits.ts"
import type { DatabaseSource, WorkerRequest, WorkerResponse } from "./protocol.ts"

/** A request without its id: the client gives the ids. */
export type SandboxRequest =
  | { readonly kind: "open"; readonly source: DatabaseSource }
  | { readonly kind: "exec"; readonly sql: string }
  | { readonly kind: "dump" }

/** The answer of the worker, or `timeout` when the client stopped a query that ran too long. */
export type SandboxResponse = WorkerResponse | { readonly id: number; readonly kind: "timeout"; readonly seconds: number }

/** Talks to the database: in a worker with a time limit, or on the page. */
export interface SandboxClient {
  request(req: SandboxRequest): Promise<SandboxResponse>
  dispose(): void
}

/** Time for opening a database: the first request also loads SQLite. */
const OPEN_TIMEOUT_MS = 30_000

/**
 * Runs the database in a Web Worker. When a query runs longer than the limit, the client stops the worker, starts a
 * new one and opens the last saved image of the database again.
 */
export class WorkerClient implements SandboxClient {
  readonly #create: () => Worker
  readonly #timeoutMs: number
  #worker: Worker
  #nextId = 1
  #lastImage: Uint8Array | null = null
  #queue: Promise<unknown> = Promise.resolve()

  constructor(create: () => Worker, timeoutMs: number = QUERY_TIMEOUT_MS) {
    this.#create = create
    this.#timeoutMs = timeoutMs
    this.#worker = create()
  }

  request(req: SandboxRequest): Promise<SandboxResponse> {
    // One request at a time: answers come in order and a restart never cuts another request.
    const run = this.#queue.then(() => this.#send(req))
    this.#queue = run.catch(() => undefined)
    return run
  }

  #send(req: SandboxRequest): Promise<SandboxResponse> {
    const id = this.#nextId++
    const limit = req.kind === "exec" ? this.#timeoutMs : OPEN_TIMEOUT_MS
    return new Promise((resolve) => {
      const worker = this.#worker
      const done = (res: SandboxResponse) => {
        window.clearTimeout(timer)
        worker.removeEventListener("message", onMessage)
        worker.removeEventListener("error", onError)
        resolve(res)
      }
      const onMessage = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.id !== id) return
        const res = e.data
        if ((res.kind === "opened" || res.kind === "executed") && res.state.image) this.#lastImage = res.state.image
        done(res)
      }
      const onError = (e: ErrorEvent) => done({ id, kind: "failed", message: e.message || "Помилка у фоновому процесі SQLite" })
      const timer = window.setTimeout(() => {
        this.#restart()
        done({ id, kind: "timeout", seconds: Math.round(limit / 1000) })
      }, limit)
      worker.addEventListener("message", onMessage)
      worker.addEventListener("error", onError)
      worker.postMessage({ ...req, id } satisfies WorkerRequest)
    })
  }

  #restart(): void {
    this.#worker.terminate()
    this.#worker = this.#create()
    const source: DatabaseSource = this.#lastImage ? { kind: "image", bytes: this.#lastImage } : { kind: "empty" }
    this.#worker.postMessage({ id: 0, kind: "open", source } satisfies WorkerRequest)
  }

  dispose(): void {
    this.#worker.terminate()
  }
}

/** Runs the database on the page, without a time limit. For tests and for hosts without a worker. */
export class InlineClient implements SandboxClient {
  readonly #host: Promise<DatabaseHost>
  #nextId = 1

  constructor(sql: Promise<SqlJsStatic>) {
    this.#host = sql.then((s) => new DatabaseHost(s))
  }

  request(req: SandboxRequest): Promise<SandboxResponse> {
    const id = this.#nextId++
    return this.#host.then(
      (h) => h.handle({ ...req, id }),
      (e: unknown) => ({ id, kind: "failed", message: `Не вдалося завантажити SQLite: ${String(e)}` })
    )
  }

  dispose(): void {}
}
