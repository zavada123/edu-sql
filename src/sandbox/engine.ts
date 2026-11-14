import type { Database, SqlJsStatic, SqlValue, Statement } from "sql.js"
import { plural } from "../core/check.ts"
import { explainError } from "../core/errors.ts"
import type { Cell } from "../core/types.ts"
import type { ExecResult, SchemaColumn, SchemaTable, StatementResult } from "./types.ts"

/** The most rows that the sandbox keeps from one statement. The rest is not read, so a huge join stops early. */
export const SANDBOX_MAX_ROWS = 5000

/** The first 16 bytes of every SQLite file. */
const SQLITE_HEADER = "SQLite format 3\u0000"

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e))

/** Puts a table or column name in double quotes for SQL. */
export const quoteName = (name: string): string => `"${name.replaceAll('"', '""')}"`

const toCell = (v: SqlValue): Cell => (v instanceof Uint8Array ? `[дані, ${v.length} байт]` : v)

/** True when the bytes start with the SQLite file header. */
export const isSqliteFile = (bytes: Uint8Array): boolean =>
  bytes.length >= SQLITE_HEADER.length && [...SQLITE_HEADER].every((ch, i) => bytes[i] === ch.charCodeAt(0))

/** Skips spaces and comments: the position of the first real character of a statement. */
const skipBlank = (text: string, from: number): number => {
  let i = from
  for (;;) {
    while (i < text.length && /\s/.test(text.charAt(i))) i++
    if (text.startsWith("--", i)) {
      const end = text.indexOf("\n", i)
      i = end === -1 ? text.length : end + 1
    } else if (text.startsWith("/*", i)) {
      const end = text.indexOf("*/", i + 2)
      i = end === -1 ? text.length : end + 2
    } else return i
  }
}

const lineAt = (text: string, offset: number): number => text.slice(0, offset).split("\n").length

/** The statement text without comments and with single spaces, for the first words. */
const head = (sql: string): string =>
  sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()

const rowsText = (n: number): string => `${n} ${plural(n, "рядок", "рядки", "рядків")}`

/** Ukrainian text for a statement that changed the data or the schema. */
export const changeMessage = (sql: string, rows: number): string => {
  const h = head(sql)
  const object = (verb: string): string | undefined => {
    const m = h.match(new RegExp(`^${verb} (?:TEMP |TEMPORARY |UNIQUE )?(TABLE|VIEW|INDEX|TRIGGER)\\b`))
    return m?.[1]
  }
  const names: Record<string, readonly [string, string]> = {
    TABLE: ["Таблицю", "Таблицю"],
    VIEW: ["Подання", "Подання"],
    INDEX: ["Індекс", "Індекс"],
    TRIGGER: ["Тригер", "Тригер"]
  }
  const created = object("CREATE")
  if (created) return `${names[created]?.[0] ?? "Об'єкт"} створено`
  const dropped = object("DROP")
  if (dropped) return `${names[dropped]?.[1] ?? "Об'єкт"} видалено`
  if (h.startsWith("ALTER TABLE")) return / RENAME TO /.test(h) ? "Таблицю перейменовано" : "Таблицю змінено"
  if (/^(INSERT|REPLACE)\b/.test(h)) return `Додано ${rowsText(rows)}`
  if (/^UPDATE\b/.test(h)) return `Змінено ${rowsText(rows)}`
  if (/^DELETE\b/.test(h)) return `Видалено ${rowsText(rows)}`
  if (/^(BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE)\b/.test(h)) return "Транзакцію оброблено"
  return rows > 0 ? `Змінено ${rowsText(rows)}` : "Виконано"
}

/** Reads the rows of one statement, not more than SANDBOX_MAX_ROWS. */
const readRows = (stmt: Statement): { readonly rows: Cell[][]; readonly truncated: boolean } => {
  const rows: Cell[][] = []
  while (stmt.step()) {
    if (rows.length >= SANDBOX_MAX_ROWS) return { rows, truncated: true }
    rows.push(stmt.get().map(toCell))
  }
  return { rows, truncated: false }
}

/** Result of opening a database from a file. */
export type OpenResult = { readonly kind: "ok"; readonly db: LiveDatabase } | { readonly kind: "error"; readonly message: string }

/**
 * A database that lives: CREATE, INSERT, UPDATE and DROP change it, as a student expects in a free SQL window.
 * Foreign keys are on, so the student sees how keys work.
 */
export class LiveDatabase {
  readonly #db: Database

  private constructor(db: Database) {
    this.#db = db
    db.run("PRAGMA foreign_keys = ON")
  }

  /** A new empty database. */
  static empty(sql: SqlJsStatic): LiveDatabase {
    return new LiveDatabase(new sql.Database())
  }

  /** Opens a `.sqlite` file. Checks the header first, so a wrong file gives a clear message. */
  static open(sql: SqlJsStatic, bytes: Uint8Array): OpenResult {
    if (!isSqliteFile(bytes)) return { kind: "error", message: "Це не файл бази SQLite: на початку немає підпису «SQLite format 3»." }
    let db: Database | undefined
    try {
      db = new sql.Database(bytes)
      db.exec("SELECT count(*) FROM sqlite_master")
      return { kind: "ok", db: new LiveDatabase(db) }
    } catch (e) {
      db?.close()
      return { kind: "error", message: `Файл пошкоджений або це не база SQLite (${errorText(e)}).` }
    }
  }

  /** Runs every statement of the text in order and stops at the first error. */
  exec(text: string): ExecResult {
    const results: StatementResult[] = []
    let changed = false
    const it = this.#db.iterateStatements(text)
    for (;;) {
      const start = skipBlank(text, text.length - it.getRemainingSQL().length)
      const line = lineAt(text, start)
      let stmt: Statement | undefined
      try {
        const next = it.next()
        if (next.done) break
        stmt = next.value
      } catch (e) {
        results.push(this.#error(text.slice(start, start + 200), line, e))
        break
      }
      const sql = stmt.getSQL()
      const before = this.#version()
      try {
        const columns = stmt.getColumnNames()
        const { rows, truncated } = readRows(stmt)
        const after = this.#version()
        const delta = after.changes - before.changes
        const touched = delta > 0 || after.schema !== before.schema
        if (touched) changed = true
        if (columns.length > 0) results.push({ kind: "table", line, sql, table: { columns, rows }, truncated })
        else results.push({ kind: "change", line, sql, message: changeMessage(sql, delta), rows: delta })
      } catch (e) {
        results.push(this.#error(sql, line, e))
        // A failed statement can still change data before the error (a trigger, an open transaction).
        const after = this.#version()
        if (after.changes !== before.changes || after.schema !== before.schema) changed = true
        break
      } finally {
        stmt.free()
      }
    }
    // Frees the rest of the text when the run stopped at an error (the typings of sql.js do not list `return`).
    const finish: unknown = Reflect.get(it, "return")
    if (typeof finish === "function") finish.call(it)
    return { results, changed }
  }

  #error(sql: string, line: number, e: unknown): StatementResult {
    const raw = errorText(e)
    return { kind: "error", line, sql, message: explainError(raw), raw }
  }

  #version(): { readonly changes: number; readonly schema: number } {
    const [res] = this.#db.exec("SELECT total_changes(), (SELECT schema_version FROM pragma_schema_version)")
    const row = res?.values[0] ?? []
    return { changes: Number(row[0] ?? 0), schema: Number(row[1] ?? 0) }
  }

  /** Tables and views in the order of creation, with columns, keys and the number of rows. */
  schema(): SchemaTable[] {
    const [list] = this.#db.exec(
      "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY rowid"
    )
    return (list?.values ?? []).map(([name, type]) => {
      const tableName = String(name)
      const q = quoteName(tableName)
      const fks = new Map<string, string>()
      for (const [, , table, from, to] of this.#db.exec(`PRAGMA foreign_key_list(${q})`)[0]?.values ?? []) {
        fks.set(String(from), `${String(table)}.${to === null ? "" : String(to)}`)
      }
      const columns: SchemaColumn[] = (this.#db.exec(`PRAGMA table_info(${q})`)[0]?.values ?? []).map(([, col, ctype, notNull, , pk]) => ({
        name: String(col),
        type: String(ctype ?? ""),
        primaryKey: Number(pk) > 0,
        notNull: Number(notNull) === 1,
        references: fks.get(String(col)) ?? ""
      }))
      const isView = type === "view"
      const rows = isView ? -1 : Number(this.#db.exec(`SELECT count(*) FROM ${q}`)[0]?.values[0]?.[0] ?? 0)
      return { name: tableName, kind: isView ? "view" : "table", columns, rows }
    })
  }

  /** The database as a `.sqlite` file. */
  export(): Uint8Array {
    return this.#db.export()
  }

  /** The database as an SQL script (CREATE and INSERT), like `sqlite3 .dump`. */
  dump(): string {
    const out = ["PRAGMA foreign_keys = OFF;", "BEGIN TRANSACTION;"]
    const [objects] = this.#db.exec("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid")
    const rows = objects?.values ?? []
    for (const [type, name, sql] of rows) {
      if (type !== "table") continue
      out.push(`${String(sql)};`)
      const q = quoteName(String(name))
      for (const values of this.#db.exec(`SELECT * FROM ${q}`)[0]?.values ?? []) {
        out.push(`INSERT INTO ${q} VALUES(${values.map(sqlLiteral).join(",")});`)
      }
    }
    for (const [type, , sql] of rows) if (type !== "table") out.push(`${String(sql)};`)
    out.push("COMMIT;")
    return `${out.join("\n")}\n`
  }

  close(): void {
    this.#db.close()
  }
}

/** A value as an SQL literal for the dump. */
export const sqlLiteral = (v: SqlValue): string => {
  if (v === null) return "NULL"
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : v > 0 ? "9e999" : "-9e999"
  if (v instanceof Uint8Array) return `X'${[...v].map((b) => b.toString(16).padStart(2, "0")).join("")}'`
  return `'${String(v).replaceAll("'", "''")}'`
}
