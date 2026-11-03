import { beforeAll, describe, expect, it } from "vitest"
import { MAX_ROWS, Sandbox } from "./run.ts"
import { loadSqlForTests } from "./testing.ts"

let sandbox: Sandbox

beforeAll(async () => {
  sandbox = new Sandbox(await loadSqlForTests(), "CREATE TABLE t (x INTEGER); INSERT INTO t VALUES (1), (2), (3);")
})

describe("Sandbox", () => {
  it("returns the table of the last statement", () => {
    expect(sandbox.run("SELECT 1; SELECT x FROM t WHERE x > 1")).toEqual({
      kind: "table",
      table: { columns: ["x"], rows: [[2], [3]] }
    })
  })
  it("runs every query on a fresh copy", () => {
    expect(sandbox.run("DELETE FROM t").kind).toBe("empty")
    const r = sandbox.run("SELECT COUNT(*) FROM t")
    expect(r.kind === "table" && r.table.rows).toEqual([[3]])
  })
  it("explains errors", () => {
    const r = sandbox.run("SELECT * FROM nope")
    expect(r.kind).toBe("error")
    expect(r.kind === "error" && r.message).toContain("«nope»")
  })
  it("stops huge results", () => {
    const r = sandbox.run(`WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n) SELECT i FROM n`)
    expect(r.kind === "error" && r.message).toContain(String(MAX_ROWS))
  })
  it("returns empty for a comment", () => {
    expect(sandbox.run("-- нічого").kind).toBe("empty")
  })
})
