import type { SqlJsStatic } from "sql.js"
import { beforeAll, describe, expect, it } from "vitest"
import { loadSqlForTests } from "../core/testing.ts"
import { changeMessage, isSqliteFile, LiveDatabase, SANDBOX_MAX_ROWS, sqlLiteral } from "./engine.ts"
import { DatabaseHost } from "./host.ts"
import { templates } from "./templates.ts"

let sql: SqlJsStatic

beforeAll(async () => {
  sql = await loadSqlForTests()
})

describe("LiveDatabase.exec", () => {
  it("keeps changes between runs", () => {
    const db = LiveDatabase.empty(sql)
    const first = db.exec("CREATE TABLE t (x INTEGER);\nINSERT INTO t VALUES (1), (2), (3);")
    expect(first.changed).toBe(true)
    expect(first.results.map((r) => (r.kind === "change" ? r.message : r.kind))).toEqual(["Таблицю створено", "Додано 3 рядки"])
    const second = db.exec("SELECT x FROM t WHERE x > 1")
    expect(second.changed).toBe(false)
    expect(second.results).toEqual([
      { kind: "table", line: 1, sql: "SELECT x FROM t WHERE x > 1", table: { columns: ["x"], rows: [[2], [3]] }, truncated: false }
    ])
  })

  it("returns a result for every statement with its line", () => {
    const db = LiveDatabase.empty(sql)
    const { results } = db.exec("-- comment\nSELECT 1 AS a;\n\nSELECT 2 AS b;\nUPDATE sqlite_master SET name = name WHERE 0")
    expect(results.map((r) => [r.kind, r.line])).toEqual([
      ["table", 2],
      ["table", 4],
      ["error", 5]
    ])
  })

  it("stops at the first error and explains it", () => {
    const db = LiveDatabase.empty(sql)
    const { results } = db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT NOT NULL);\nINSERT INTO t (name) VALUES (NULL);\nSELECT 1;")
    expect(results).toHaveLength(2)
    const err = results[1]
    expect(err?.kind).toBe("error")
    if (err?.kind !== "error") return
    expect(err.line).toBe(2)
    expect(err.message).toContain("не може бути порожнім")
    expect(err.raw).toContain("NOT NULL constraint failed")
  })

  it("reports a syntax error with the line of the statement", () => {
    const db = LiveDatabase.empty(sql)
    const { results } = db.exec("SELECT 1;\n\nSELEC 2;")
    expect(results[1]).toMatchObject({ kind: "error", line: 3 })
  })

  it("checks foreign keys", () => {
    const db = LiveDatabase.empty(sql)
    const { results } = db.exec(
      "CREATE TABLE a (id INTEGER PRIMARY KEY); CREATE TABLE b (a_id INTEGER REFERENCES a(id)); INSERT INTO b VALUES (7);"
    )
    expect(results[2]).toMatchObject({ kind: "error" })
    expect(results[2]?.kind === "error" && results[2].message).toContain("Зовнішній ключ")
  })

  it("keeps only the first rows of a huge result", () => {
    const db = LiveDatabase.empty(sql)
    const { results } = db.exec("WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n) SELECT i FROM n")
    const r = results[0]
    expect(r?.kind).toBe("table")
    if (r?.kind !== "table") return
    expect(r.truncated).toBe(true)
    expect(r.table.rows).toHaveLength(SANDBOX_MAX_ROWS)
  })

  it("shows the rows of INSERT … RETURNING as a table and marks the change", () => {
    const db = LiveDatabase.empty(sql)
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, x TEXT)")
    const res = db.exec("INSERT INTO t (x) VALUES ('a') RETURNING id, x")
    expect(res.changed).toBe(true)
    expect(res.results[0]).toMatchObject({ kind: "table", table: { columns: ["id", "x"], rows: [[1, "a"]] } })
  })
})

describe("LiveDatabase.schema", () => {
  it("lists tables, columns, keys and row counts in the order of creation", () => {
    const db = LiveDatabase.empty(sql)
    db.exec(
      "CREATE TABLE z (id INTEGER PRIMARY KEY, name TEXT NOT NULL); CREATE TABLE a (z_id INTEGER REFERENCES z(id), v REAL);" +
        "INSERT INTO z (name) VALUES ('x'), ('y'); CREATE VIEW names AS SELECT name FROM z;"
    )
    expect(db.schema()).toEqual([
      {
        name: "z",
        kind: "table",
        rows: 2,
        columns: [
          { name: "id", type: "INTEGER", primaryKey: true, notNull: false, references: "" },
          { name: "name", type: "TEXT", primaryKey: false, notNull: true, references: "" }
        ]
      },
      {
        name: "a",
        kind: "table",
        rows: 0,
        columns: [
          { name: "z_id", type: "INTEGER", primaryKey: false, notNull: false, references: "z.id" },
          { name: "v", type: "REAL", primaryKey: false, notNull: false, references: "" }
        ]
      },
      { name: "names", kind: "view", rows: -1, columns: [{ name: "name", type: "TEXT", primaryKey: false, notNull: false, references: "" }] }
    ])
  })
})

describe("export, open and dump", () => {
  it("opens an exported file with the same data", () => {
    const db = LiveDatabase.empty(sql)
    db.exec("CREATE TABLE t (x TEXT); INSERT INTO t VALUES ('привіт')")
    const bytes = db.export()
    expect(isSqliteFile(bytes)).toBe(true)
    const opened = LiveDatabase.open(sql, bytes)
    expect(opened.kind).toBe("ok")
    if (opened.kind !== "ok") return
    expect(opened.db.exec("SELECT x FROM t").results[0]).toMatchObject({ table: { rows: [["привіт"]] } })
  })

  it("refuses a file that is not SQLite", () => {
    const opened = LiveDatabase.open(sql, new TextEncoder().encode("name;age\nОля;11"))
    expect(opened).toMatchObject({ kind: "error" })
  })

  it("makes a dump that builds the same database", () => {
    const db = LiveDatabase.empty(sql)
    db.exec(
      "CREATE TABLE p (id INTEGER PRIMARY KEY, name TEXT, score REAL, pic BLOB);" +
        "INSERT INTO p VALUES (1, 'О''Брайен', 3.5, X'00ff'), (2, NULL, -1, NULL);" +
        "CREATE INDEX p_name ON p(name); CREATE VIEW v AS SELECT name FROM p;"
    )
    const copy = LiveDatabase.empty(sql)
    const res = copy.exec(db.dump())
    expect(res.results.filter((r) => r.kind === "error")).toEqual([])
    expect(copy.exec("SELECT id, name, score, hex(pic) FROM p ORDER BY id").results[0]).toMatchObject({
      table: { rows: [[1, "О'Брайен", 3.5, "00FF"], [2, null, -1, ""]] }
    })
    expect(copy.schema().map((t) => t.name)).toEqual(["p", "v"])
  })

  it("writes SQL literals", () => {
    expect([null, 3, 2.5, "a'b", new Uint8Array([1, 171])].map(sqlLiteral)).toEqual(["NULL", "3", "2.5", "'a''b'", "X'01ab'"])
  })
})

describe("changeMessage", () => {
  it("names the change in Ukrainian", () => {
    expect(changeMessage("create table if not exists t (x)", 0)).toBe("Таблицю створено")
    expect(changeMessage("DROP VIEW v", 0)).toBe("Подання видалено")
    expect(changeMessage("CREATE UNIQUE INDEX i ON t(x)", 0)).toBe("Індекс створено")
    expect(changeMessage("ALTER TABLE t RENAME TO u", 0)).toBe("Таблицю перейменовано")
    expect(changeMessage("UPDATE t SET x = 1", 5)).toBe("Змінено 5 рядків")
    expect(changeMessage("/* x */ DELETE FROM t", 1)).toBe("Видалено 1 рядок")
  })
})

describe("templates", () => {
  it.each(templates.map((t) => [t.id, t] as const))("%s builds without errors and its starter runs", (_, t) => {
    const db = LiveDatabase.empty(sql)
    const setup = db.exec(t.setup)
    expect(setup.results.filter((r) => r.kind === "error")).toEqual([])
    const starter = db.exec(t.starter)
    expect(starter.results.filter((r) => r.kind === "error")).toEqual([])
    expect(starter.results.some((r) => r.kind === "table")).toBe(true)
  })
})

describe("DatabaseHost", () => {
  it("gives an image only after a change", () => {
    const host = new DatabaseHost(sql)
    const opened = host.handle({ id: 1, kind: "open", source: { kind: "script", sql: "CREATE TABLE t (x)" } })
    expect(opened.kind === "opened" && opened.state.image !== null).toBe(true)
    const read = host.handle({ id: 2, kind: "exec", sql: "SELECT * FROM t" })
    expect(read.kind === "executed" && read.state.image).toBe(null)
    const write = host.handle({ id: 3, kind: "exec", sql: "INSERT INTO t VALUES (1)" })
    expect(write.kind === "executed" && write.state.image !== null).toBe(true)
    expect(write.kind === "executed" && write.state.schema[0]?.rows).toBe(1)
  })

  it("reports an open transaction instead of saving", () => {
    const host = new DatabaseHost(sql)
    host.handle({ id: 1, kind: "open", source: { kind: "script", sql: "CREATE TABLE t (x)" } })
    const res = host.handle({ id: 2, kind: "exec", sql: "BEGIN; INSERT INTO t VALUES (1);" })
    expect(res.kind === "executed" ? res.state.saveError : "").toContain("COMMIT")
  })

  it("refuses a broken file and keeps the old database", () => {
    const host = new DatabaseHost(sql)
    host.handle({ id: 1, kind: "open", source: { kind: "script", sql: "CREATE TABLE keep (x)" } })
    const res = host.handle({ id: 2, kind: "open", source: { kind: "image", bytes: new Uint8Array([1, 2, 3]) } })
    expect(res.kind).toBe("failed")
    const after = host.handle({ id: 3, kind: "exec", sql: "SELECT * FROM keep" })
    expect(after.kind === "executed" && after.exec.results[0]?.kind).toBe("table")
  })
})
