import type { SqlJsStatic } from "sql.js"
import { LiveDatabase } from "./engine.ts"
import type { DatabaseSource, DatabaseState, WorkerRequest, WorkerResponse } from "./protocol.ts"
import type { ExecResult } from "./types.ts"

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e))

const TRANSACTION_HINT = "Базу не збережено: транзакцію не завершено. Напиши `COMMIT` (зберегти) або `ROLLBACK` (скасувати)."

/**
 * Keeps one live database and answers requests. The worker uses it, and so does the page when it has no worker
 * (tests, old browsers).
 */
export class DatabaseHost {
  readonly #sql: SqlJsStatic
  #db: LiveDatabase
  #size = 0

  constructor(sql: SqlJsStatic) {
    this.#sql = sql
    this.#db = LiveDatabase.empty(sql)
  }

  handle(req: WorkerRequest): WorkerResponse {
    try {
      switch (req.kind) {
        case "open":
          return this.#open(req.id, req.source)
        case "exec": {
          const exec = this.#db.exec(req.sql)
          return { id: req.id, kind: "executed", exec, state: this.#state(exec.changed) }
        }
        case "dump":
          return { id: req.id, kind: "dumped", sql: this.#db.dump() }
      }
    } catch (e) {
      return { id: req.id, kind: "failed", message: errorText(e) }
    }
  }

  #open(id: number, source: DatabaseSource): WorkerResponse {
    let next: LiveDatabase
    let exec: ExecResult | null = null
    switch (source.kind) {
      case "empty":
        next = LiveDatabase.empty(this.#sql)
        break
      case "image": {
        const opened = LiveDatabase.open(this.#sql, source.bytes)
        if (opened.kind === "error") return { id, kind: "failed", message: opened.message }
        next = opened.db
        break
      }
      case "script":
        next = LiveDatabase.empty(this.#sql)
        exec = next.exec(source.sql)
        break
    }
    this.#db.close()
    this.#db = next
    return { id, kind: "opened", exec, state: this.#state(true) }
  }

  #state(changed: boolean): DatabaseState {
    const schema = this.#db.schema()
    if (!changed) return { schema, image: null, size: this.#size, saveError: null }
    try {
      // A copy: the page may take the buffer away (a transfer from the worker).
      const image = this.#db.export().slice()
      this.#size = image.length
      return { schema, image, size: image.length, saveError: null }
    } catch {
      return { schema, image: null, size: this.#size, saveError: TRANSACTION_HINT }
    }
  }
}
