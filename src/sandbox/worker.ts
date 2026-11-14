/// <reference lib="webworker" />
/**
 * The Web Worker of the SQL sandbox. A long query runs here, so the page does not freeze; the page stops the
 * worker after the time limit. The host app starts it:
 * `new Worker(new URL("./sql-worker.ts", import.meta.url), { type: "module" })` with `import "edu-sql/worker"` inside.
 */
import { loadSql } from "../ui/loadSql.ts"
import { DatabaseHost } from "./host.ts"
import type { WorkerRequest, WorkerResponse } from "./protocol.ts"

declare const self: DedicatedWorkerGlobalScope

const host = loadSql().then((sql) => new DatabaseHost(sql))

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data
  host.then(
    (h) => {
      const res = h.handle(req)
      const transfer = res.kind === "opened" || res.kind === "executed" ? (res.state.image ? [res.state.image.buffer] : []) : []
      self.postMessage(res, transfer)
    },
    (err: unknown) => {
      const res: WorkerResponse = { id: req.id, kind: "failed", message: `Не вдалося завантажити SQLite: ${String(err)}` }
      self.postMessage(res)
    }
  )
}
