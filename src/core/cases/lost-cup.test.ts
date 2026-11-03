import { beforeAll, describe, expect, it } from "vitest"
import { allSteps, checkAnswer, checkQuery } from "../check.ts"
import { Sandbox } from "../run.ts"
import { loadSqlForTests } from "../testing.ts"
import { lostCup } from "./lost-cup.ts"

let sandbox: Sandbox

beforeAll(async () => {
  sandbox = new Sandbox(await loadSqlForTests(), lostCup.setup)
})

const rows = (sql: string) => {
  const r = sandbox.run(sql)
  if (r.kind !== "table") throw new Error(JSON.stringify(r))
  return r.table.rows
}

describe("case «lost cup»", () => {
  it("has unique step ids", () => {
    const ids = allSteps(lostCup).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("accepts every reference solution", () => {
    for (const step of allSteps(lostCup)) {
      if (step.kind === "query") expect(checkQuery(sandbox, step, step.solution), step.id).toEqual({ kind: "ok" })
      else expect(checkAnswer(step, step.accepted[0] ?? ""), step.id).toEqual({ kind: "ok" })
    }
  })

  it("documents the database in the schema panel", () => {
    for (const t of lostCup.tables) {
      const cols = rows(`SELECT name FROM pragma_table_info('${t.name}')`).map((r) => r[0])
      expect(t.columns.map((c) => c.name), t.name).toEqual(cols)
    }
  })

  it("keeps the facts of the clues true", () => {
    expect(rows("SELECT COUNT(*) FROM access_log")).toEqual([[65]])
    expect(rows("SELECT COUNT(*) FROM people")).toEqual([[20]])
    const evening = rows(
      "SELECT person_id FROM access_log WHERE room_id = 214 AND day = '2026-10-15' AND action = 'вхід' AND time >= '17:00' ORDER BY time"
    )
    expect(evening.map((r) => r[0])).toEqual([4, 5, 6, 3, 2])
    expect(rows("SELECT * FROM posts WHERE text LIKE '%кубок%'")).toHaveLength(3)
    const ma = rows("SELECT id FROM people WHERE first_name LIKE 'Ма%' ORDER BY last_name").map((r) => r[0])
    expect(ma).toEqual([5, 7, 8, 6])
    expect(rows("SELECT person_id, time FROM canteen WHERE day = '2026-10-15' AND time BETWEEN '18:30' AND '18:50'")).toContainEqual([5, "18:41"])
    const regulars = rows("SELECT person_id FROM access_log WHERE room_id = 214 AND action = 'вхід' GROUP BY person_id ORDER BY COUNT(*) DESC, person_id LIMIT 1")
    expect(regulars).toEqual([[5]])
  })

  it("accepts other correct queries", () => {
    const step = allSteps(lostCup).find((s) => s.id === "names-after-five")
    if (step?.kind !== "query") throw new Error("no step")
    const other = `select people.first_name as "Ім'я", people.last_name, access_log.time
      from people inner join access_log on access_log.person_id = people.id
      where access_log.time >= '17:00' and access_log.action = 'вхід' and access_log.day = '2026-10-15' and access_log.room_id = 214
      order by access_log.time`
    expect(checkQuery(sandbox, step, other)).toEqual({ kind: "ok" })
  })
})
