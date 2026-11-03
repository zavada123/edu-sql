import initSqlJs, { type SqlJsStatic } from "sql.js"

/** sql.js for tests in Node: the WASM file is found next to the package. */
export const loadSqlForTests = (): Promise<SqlJsStatic> => initSqlJs()
