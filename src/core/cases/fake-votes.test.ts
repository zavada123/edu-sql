import { beforeAll, describe, expect, it } from "vitest"
import { allSteps, checkAnswer, checkCase, checkQuery, taskSteps } from "../check.ts"
import { Sandbox } from "../run.ts"
import { loadSqlForTests } from "../testing.ts"
import { fakeVotes } from "./fake-votes.ts"
import { cases } from "./index.ts"

let sandbox: Sandbox

beforeAll(async () => {
  sandbox = new Sandbox(await loadSqlForTests(), fakeVotes.setup)
})

const rows = (sql: string) => {
  const r = sandbox.run(sql)
  if (r.kind !== "table") throw new Error(JSON.stringify(r))
  return r.table.rows
}

const queryStep = (id: string) => {
  const step = allSteps(fakeVotes).find((s) => s.id === id)
  if (step?.kind !== "query") throw new Error(`no query step ${id}`)
  return step
}

describe("case «fake votes»", () => {
  it("is in the list of cases after the first case", () => {
    expect(cases.map((c) => c.id)).toEqual(["lost-cup", "fake-votes"])
  })

  it("has unique step ids, 7 lessons and 17 tasks", () => {
    const ids = allSteps(fakeVotes).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(taskSteps(fakeVotes)).toHaveLength(17)
    expect(allSteps(fakeVotes).filter((s) => s.kind === "lesson")).toHaveLength(7)
  })

  it("accepts every reference solution", () => {
    for (const step of taskSteps(fakeVotes)) {
      if (step.kind === "query") expect(checkQuery(sandbox, step, step.solution), step.id).toEqual({ kind: "ok" })
      else expect(checkAnswer(step, step.accepted[0] ?? ""), step.id).toEqual({ kind: "ok" })
    }
  })

  it("does not accept the starter queries that have a mistake", () => {
    for (const id of ["repeat-votes", "ghost-birth", "honest-results", "distinct-voters"]) {
      const step = queryStep(id)
      expect(checkQuery(sandbox, step, step.starter).kind, id).not.toBe("ok")
    }
  })

  it("documents the database in the schema panel", () => {
    for (const t of fakeVotes.tables) {
      const cols = rows(`SELECT name FROM pragma_table_info('${t.name}')`).map((r) => r[0])
      expect(t.columns.map((c) => c.name), t.name).toEqual(cols)
    }
  })

  it("keeps the facts of the clues true", () => {
    expect(rows("SELECT project_id, COUNT(*) FROM votes WHERE project_id <= 2 GROUP BY project_id")).toEqual([
      [1, 136],
      [2, 74]
    ])
    expect(rows("SELECT COUNT(DISTINCT user_id) FROM votes")).toEqual([[177]])
    expect(rows("SELECT COUNT(*) FROM users WHERE class IS NOT NULL")).toEqual([[140]])
    expect(rows("SELECT MIN(created_day), MAX(created_day) FROM users")).toEqual([["2026-09-01", "2026-11-07"]])
    expect(rows("SELECT MAX(created_day) FROM users WHERE class IS NOT NULL")).toEqual([["2026-09-15"]])
    const hours = rows("SELECT substr(time, 1, 2), COUNT(*) FROM votes GROUP BY 1 ORDER BY 2 DESC LIMIT 2")
    expect(hours[0]).toEqual(["02", 57])
    expect(hours[1]?.[1]).toBe(38)
    expect(rows("SELECT day, project_id, COUNT(*) FROM votes WHERE time < '06:00' GROUP BY day, project_id")).toEqual([["2026-11-07", 1, 57]])
    expect(rows("SELECT MIN(time), MAX(time) FROM votes WHERE time < '06:00'")).toEqual([["02:00", "02:58"]])
  })

  it("keeps the facts about the repeated votes and the suspects true", () => {
    expect(rows("SELECT COUNT(*), MIN(user_id), MIN(project_id), MAX(project_id), MIN(n), MAX(n) FROM (SELECT user_id, project_id, COUNT(*) AS n FROM votes GROUP BY user_id, project_id HAVING COUNT(*) > 1)")).toEqual([
      [15, 141, 1, 1, 2, 3]
    ])
    expect(rows("SELECT v.day, v.time FROM votes v JOIN users u ON u.id = v.user_id WHERE u.first_name = 'Назар' AND u.last_name = 'Гнатюк'")).toEqual([["2026-11-06", "23:40"]])
    const ghosts = rows("SELECT u.id, u.class FROM users u LEFT JOIN logins l ON l.user_id = u.id WHERE l.id IS NULL")
    expect(ghosts).toHaveLength(37)
    expect(ghosts.every((r) => r[1] === null)).toBe(true)
    expect(rows("SELECT created_day, MIN(created_time), MAX(created_time), COUNT(*) FROM users WHERE class IS NULL GROUP BY created_day")).toEqual([
      ["2026-11-07", "01:50", "02:09", 37]
    ])
    expect(rows("SELECT COUNT(*) FROM votes v JOIN users u ON u.id = v.user_id WHERE v.day = u.created_day AND v.time < u.created_time")).toEqual([[0]])
    const sofia = rows(queryStep("sofia-logins").solution)
    expect(sofia.filter((r) => r[0] === "2026-11-06" || r[0] === "2026-11-07" || r[0] === "2026-11-08")).toEqual([
      ["2026-11-06", "16:10"],
      ["2026-11-08", "20:30"]
    ])
  })

  it("keeps the facts about the laptop and the culprit true", () => {
    const top = rows(queryStep("top-devices").solution)
    expect(top[0]).toEqual(["Ноутбук-07", 37])
    expect(Number(top[1]?.[1])).toBeLessThanOrEqual(10)
    expect(Number(top[1]?.[1])).toBeGreaterThan(Number(top[2]?.[1]))
    expect(rows(`${queryStep("laptop-logins").solution} ORDER BY l.day`)).toEqual([
      ["Анна", "Поліщук", "2026-11-02", "10:15"],
      ["Злата", "Пилипенко", "2026-11-04", "11:20"],
      ["Олександр", "Руденко", "2026-11-07", "01:47"]
    ])
    expect(rows(queryStep("rudenko-team").solution)).toEqual([["Еко-дрон"]])
    const honest = rows(queryStep("honest-results").solution)
    expect(honest.slice(0, 2)).toEqual([
      ["Розумна теплиця", 79],
      ["Еко-дрон", 74]
    ])
    expect(new Set(honest.map((r) => r[1])).size).toBe(honest.length)
    expect(rows("SELECT COUNT(*) FROM (SELECT first_name, last_name FROM users GROUP BY 1, 2 HAVING COUNT(*) > 1)")).toEqual([[0]])
  })

  it("accepts other correct queries", () => {
    const honest = `select projects.title, count(distinct votes.user_id) from votes
      join projects on projects.id = votes.project_id
      where votes.user_id in (select user_id from logins)
      group by projects.title order by 2 desc`
    expect(checkQuery(sandbox, queryStep("honest-results"), honest)).toEqual({ kind: "ok" })
    const team = "SELECT title FROM projects WHERE id IN (SELECT project_id FROM team_members t JOIN users u ON u.id = t.user_id WHERE u.last_name = 'Руденко')"
    expect(checkQuery(sandbox, queryStep("rudenko-team"), team)).toEqual({ kind: "ok" })
    const team2 = "SELECT p.title FROM projects p JOIN team_members t ON t.project_id = p.id JOIN users u ON u.id = t.user_id WHERE u.last_name = 'Руденко'"
    expect(checkQuery(sandbox, queryStep("rudenko-team"), team2)).toEqual({ kind: "mustUse", words: ["IN"] })
  })

  it("checks the whole case again from saved answers", () => {
    const answers = Object.fromEntries(taskSteps(fakeVotes).map((s) => [s.id, s.kind === "query" ? s.solution : (s.accepted[0] ?? "")]))
    expect(checkCase(sandbox, fakeVotes, answers).every((r) => r.passed)).toBe(true)
    const forged = { ...answers, culprit: "Софія Мельник" }
    expect(checkCase(sandbox, fakeVotes, forged).filter((r) => !r.passed).map((r) => r.stepId)).toEqual(["culprit"])
  })
})

describe("all cases", () => {
  it("run the example of every lesson and close every SQL mark in the texts", async () => {
    const sql = await loadSqlForTests()
    for (const c of cases) {
      const box = new Sandbox(sql, c.setup)
      for (const s of allSteps(c)) if (s.kind === "lesson") expect(box.run(s.example).kind, `${c.id}/${s.id}`).toBe("table")
      const texts = [
        c.summary,
        ...c.ending.map((l) => l.text),
        ...allSteps(c).flatMap((s) => [
          ...s.story.map((l) => l.text),
          ...(s.kind === "lesson" ? [...s.explain, ...s.notes.map((n) => n.text)] : [...s.hints, s.clue, s.kind === "query" ? s.task : s.question])
        ])
      ]
      for (const t of texts) expect((t.match(/`/g) ?? []).length % 2, t).toBe(0)
    }
  })

  it("start every chapter with a lesson", () => {
    for (const c of cases) for (const ch of c.chapters.slice(0, -1)) expect(ch.steps[0]?.kind, `${c.id}/${ch.id}`).toBe("lesson")
  })
})
