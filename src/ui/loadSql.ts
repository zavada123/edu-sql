import initSqlJs, { type SqlJsStatic } from "sql.js"
import wasmUrl from "sql.js/dist/sql-wasm-browser.wasm?url"

let pending: Promise<SqlJsStatic> | undefined

/** Loads SQLite (WASM, about 650 KB) once per page. The bundler serves the WASM file. */
export const loadSql = (): Promise<SqlJsStatic> => {
  pending ??= initSqlJs({ locateFile: () => wasmUrl })
  return pending
}
