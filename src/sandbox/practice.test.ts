import initSqlJs from "sql.js"
import { describe, expect, it } from "vitest"
import { checkQuery, missingWords, practiceSets, Sandbox } from "../core/index.ts"
import { templateById } from "./templates.ts"

describe("practice sets", () => {
  it("every reference query returns rows, passes its own check and uses the required words", async () => {
    const sql = await initSqlJs()
    for (const set of practiceSets) {
      const template = templateById(set.database)
      expect(template, set.id).toBeDefined()
      const sandbox = new Sandbox(sql, template?.setup ?? "")
      expect(new Set(set.tasks.map((t) => t.id)).size).toBe(set.tasks.length)
      for (const t of set.tasks) {
        const run = sandbox.run(t.solution)
        expect(run.kind === "table" && run.table.rows.length > 0, t.id).toBe(true)
        expect(checkQuery(sandbox, t, t.solution), t.id).toEqual({ kind: "ok" })
        expect(missingWords(t.solution, t.mustUse), t.id).toEqual([])
        expect(t.hints.length, t.id).toBeGreaterThan(0)
      }
    }
  })

  it("a wrong order or filter is not accepted", async () => {
    const sql = await initSqlJs()
    const set = practiceSets[0]
    const sandbox = new Sandbox(sql, templateById(set?.database ?? "")?.setup ?? "")
    const byId = (id: string) => set?.tasks.find((t) => t.id === id)
    const sortOne = byId("sort-one")
    const lesya = byId("lesya")
    if (!sortOne || !lesya) throw new Error("tasks are missing")
    expect(checkQuery(sandbox, sortOne, "SELECT title, year FROM books ORDER BY year").kind).toBe("order")
    expect(checkQuery(sandbox, lesya, "SELECT title FROM books").kind).toBe("tooMany")
    expect(checkQuery(sandbox, lesya, "SELECT books.title FROM books JOIN authors ON authors.id = books.author_id WHERE authors.name = 'Леся Українка'")).toEqual({ kind: "ok" })
  })
})
