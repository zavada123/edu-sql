import { beforeAll, describe, expect, it } from "vitest"
import { checkBuild, stepSandbox, describeTables, affinity } from "../build.ts"
import { allSteps, checkCase, checkStep, referenceAnswer, taskSteps, taskText, verdictMessage } from "../check.ts"
import { Sandbox } from "../run.ts"
import { loadSqlForTests } from "../testing.ts"
import type { BuildStep } from "../types.ts"
import { lostPaws } from "./lost-paws.ts"

let sandbox: Sandbox

beforeAll(async () => {
  sandbox = new Sandbox(await loadSqlForTests(), lostPaws.setup)
})

const buildStep = (id: string): BuildStep => {
  const step = allSteps(lostPaws).find((s) => s.id === id)
  if (step?.kind !== "build") throw new Error(`no build step ${id}`)
  return step
}

const base = (id: string) => stepSandbox(sandbox, lostPaws, id)

const check = (id: string, sql: string) => checkBuild(base(id), buildStep(id), sql)

const rows = (db: Sandbox, sql: string) => {
  const r = db.run(sql)
  if (r.kind !== "table") throw new Error(JSON.stringify(r))
  return r.table.rows
}

/** The database after the whole case: every build step and its `after`. */
const finalDb = () => base("culprit")

describe("case «lost paws»", () => {
  it("has unique step ids", () => {
    const ids = allSteps(lostPaws).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("accepts every reference solution, and every build step passes all its trials", () => {
    for (const step of taskSteps(lostPaws)) {
      const db = base(step.id)
      expect(checkStep(db, step, referenceAnswer(step)), step.id).toEqual({ kind: "ok" })
      if (step.kind === "build") expect(checkBuild(db, step, step.solution).trials.every((t) => t.passed), step.id).toBe(true)
    }
  })

  it("has trials that a table without rules fails", () => {
    for (const step of taskSteps(lostPaws)) {
      if (step.kind !== "build" || step.trials.length === 0) continue
      // The same table with the rules removed must fail at least one trial: otherwise the trials check nothing.
      const loose = step.solution
        .replace(/\s+(NOT NULL|UNIQUE|PRIMARY KEY)/g, "")
        .replace(/\s+CHECK \((?:[^()]|\([^()]*\))*\)/g, "")
        .replace(/\s+REFERENCES \w+\(id\)/g, "")
        .replace(/\s+DEFAULT (?:'[^']*'|\d+)/g, "")
        .replace(/,\s*\(pet_id, phone\)/g, "")
      const result = checkBuild(base(step.id), step, loose)
      expect(result.verdict.kind, step.id).not.toBe("ok")
    }
  })

  it("explains a wrong table precisely", () => {
    expect(check("create-pets", "CREATE TABLE pet (id INTEGER)").verdict).toEqual({ kind: "missingTable", table: "pets" })
    expect(check("create-pets", "CREATE TABLE pets (id INTEGER, name TEXT, species TEXT, age INTEGER)").verdict).toEqual({
      kind: "missingColumn",
      table: "pets",
      column: "weight"
    })
    expect(check("create-pets", "CREATE TABLE pets (id INTEGER, name TEXT, species TEXT, age TEXT, weight REAL)").verdict).toEqual({
      kind: "columnType",
      table: "pets",
      column: "age",
      got: "TEXT",
      want: "INTEGER"
    })
    expect(check("create-pets", "CREATE TABLE pets (id INTEGER, name TEXT, species TEXT, age INTEGER, weight REAL, color TEXT)").verdict.kind).toBe("extraColumn")
    expect(check("insert-cards", "INSERT INTO pets VALUES (1, 'Бублик', 'кіт', 2, 4.1)").verdict).toEqual({ kind: "rowCount", table: "pets", got: 1, want: 3 })
    const swapped = "INSERT INTO pets VALUES (1, 'Бублик', 'кіт', 2, 4.1), (2, 'Рекс', 'пес', 5, 23.5), (3, 'Хмаринка', 'кролик', 1.8, 1)"
    expect(check("insert-cards", swapped).verdict).toEqual({ kind: "rowValues", table: "pets" })
    const error = check("fix-volunteers", "CREATE TABLE volunteers (id INTEGER, name TEXT, phone TEXT, age INTEGER,)").verdict
    expect(error.kind).toBe("error")
    // Without a comma SQLite reads "TEXT phone TEXT" as the type of `name`: no error, but no column `phone`.
    expect(check("fix-volunteers", "CREATE TABLE volunteers (id INTEGER, name TEXT\n phone TEXT, age INTEGER)").verdict.kind).toBe("missingColumn")
    for (const v of [error, check("create-pets", "CREATE TABLE pets (id)").verdict]) expect(verdictMessage(v)).not.toBe("")
  })

  it("accepts other correct forms", () => {
    const pets = "create table PETS (Weight double, name varchar(30), species text, age int, id integer)"
    expect(check("create-pets", pets).verdict).toEqual({ kind: "ok" })
    const puppies = "INSERT INTO pets VALUES (4, 'Луна', 'пес', NULL, 3.2); INSERT INTO pets VALUES (5, 'Сонько', 'пес', NULL, 2.9);"
    expect(check("insert-puppies", puppies).verdict).toEqual({ kind: "ok" })
    const rules = `DROP TABLE pets;
      CREATE TABLE pets (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL, species TEXT, age INTEGER, weight REAL,
        status TEXT DEFAULT 'шукає дім', chip TEXT,
        CHECK (age > -1), CHECK (species = 'кіт' OR species = 'пес' OR species = 'кролик'), UNIQUE (chip)
      )`
    expect(check("rule-check", rules).verdict).toEqual({ kind: "ok" })
    const adoptions = `CREATE TABLE adoptions (id INTEGER PRIMARY KEY, pet_id INTEGER UNIQUE, person_id INTEGER, day TEXT,
      FOREIGN KEY (pet_id) REFERENCES pets(id), FOREIGN KEY (person_id) REFERENCES people(id))`
    expect(check("create-adoptions", adoptions).verdict).toEqual({ kind: "ok" })
    const vet = "ALTER TABLE pets ADD COLUMN vaccinated INTEGER DEFAULT 0; UPDATE pets SET status = 'вдома' WHERE id IN (2, 6, 8, 10)"
    expect(check("vet-update", vet).verdict).toEqual({ kind: "ok" })
  })

  it("shows which trials failed", () => {
    const noNull = "DROP TABLE pets; CREATE TABLE pets (id INTEGER PRIMARY KEY, name TEXT, species TEXT, age INTEGER, weight REAL, status TEXT DEFAULT 'шукає дім')"
    const r = check("rule-name", noNull)
    expect(r.verdict).toEqual({ kind: "trials", failed: 2, total: 4 })
    expect(r.trials.filter((t) => !t.passed).map((t) => [t.label, t.accepted])).toEqual([
      ["Тварина без клички", true],
      ["Кличка NULL", true]
    ])
    const int = "DROP TABLE pets; CREATE TABLE pets (id INT PRIMARY KEY, name TEXT, species TEXT, age INTEGER, weight REAL)"
    expect(check("key-pets", int).trials.find((t) => !t.passed)?.label).toBe("Нова тварина без номера")
  })

  it("does not let the student turn the foreign keys off", () => {
    const off = "PRAGMA foreign_keys = OFF; CREATE TABLE adoptions (id INTEGER PRIMARY KEY, pet_id INTEGER UNIQUE REFERENCES pets(id), person_id INTEGER REFERENCES people(id), day TEXT)"
    expect(check("create-adoptions", off).verdict).toEqual({ kind: "ok" })
    expect(check("vet-update", "DROP TABLE pets").verdict.kind).toBe("error")
  })

  it("keeps the facts of the story true", () => {
    const db = finalDb()
    expect(rows(db, "SELECT COUNT(*) FROM old_journal")).toEqual([[16]])
    expect(rows(db, "SELECT COUNT(*) FROM pets")).toEqual([[12]])
    expect(rows(db, "SELECT name FROM pets WHERE status = 'вдома' ORDER BY id")).toEqual([["Рекс"], ["Мурка"], ["Пухнастик"], ["Зефірка"]])
    expect(rows(db, "SELECT id, name FROM pets WHERE id IN (4, 7, 9, 11) ORDER BY id")).toEqual([
      [4, "Луна"],
      [7, "Тайсон"],
      [9, "Грім"],
      [11, "Ведмідь"]
    ])
    expect(rows(db, "SELECT name FROM volunteers WHERE phone = '093-404-40-40'")).toEqual([["Віктор Гаврилюк"]])
    expect(rows(db, "SELECT COUNT(*) FROM people WHERE phone = '093-404-40-40'")).toEqual([[0]])
    const requests = checkBuild(base("create-requests"), buildStep("create-requests"), buildStep("create-requests").solution).trials
    const refused = requests.filter((t) => !t.accepted).map((t) => t.label)
    expect(refused).toHaveLength(4)
    for (const label of refused) expect(label).toContain("093-404-40-40")
  })

  it("checks the whole case again from saved answers", () => {
    const answers = Object.fromEntries(taskSteps(lostPaws).map((s) => [s.id, referenceAnswer(s)]))
    expect(checkCase(sandbox, lostPaws, answers).every((r) => r.passed)).toBe(true)
    const forged = { ...answers, "create-people": "CREATE TABLE people (id INTEGER, name TEXT, phone TEXT, age INTEGER)" }
    expect(checkCase(sandbox, lostPaws, forged).filter((r) => !r.passed).map((r) => r.stepId)).toEqual(["create-people"])
  })

  it("runs the example of every lesson on the database of the lesson", () => {
    const lessons = allSteps(lostPaws).flatMap((s) => (s.kind === "lesson" ? [s] : []))
    expect(lessons).toHaveLength(6)
    for (const l of lessons) expect(base(l.id).run(l.example).kind, l.id).toBe("table")
  })

  it("starts the broken volunteer command with an error, and the first pets command with a table", () => {
    expect(base("fix-volunteers").run(buildStep("fix-volunteers").starter).kind).toBe("error")
    for (const id of ["key-pets", "rule-name", "rule-chip", "rule-check"]) expect(base(id).run(buildStep(id).starter).kind, id).toBe("empty")
  })

  it("describes the live tables for the schema panel", () => {
    const tables = describeTables(base("who-adopted"), lostPaws.tables)
    expect(tables.map((t) => t.name)).toEqual(["old_journal", "volunteers", "pets", "people", "adoptions"])
    const adoptions = tables.find((t) => t.name === "adoptions")
    expect(adoptions?.columns.map((c) => c.note)).toEqual(["(ключ)", "(pets.id)", "(people.id)", ""])
    expect(tables[0]?.note).toBe(lostPaws.tables[0]?.note)
  })

  it("knows the type affinity of SQLite", () => {
    expect(["INT", "BIGINT", "varchar(30)", "DOUBLE", "", "BOOLEAN"].map(affinity)).toEqual(["INTEGER", "INTEGER", "TEXT", "REAL", "BLOB", "NUMERIC"])
  })

  it("closes every SQL mark in the texts", () => {
    const texts = [
      lostPaws.summary,
      ...lostPaws.ending.map((l) => l.text),
      ...allSteps(lostPaws).flatMap((s) => [
        ...s.story.map((l) => l.text),
        ...(s.kind === "lesson" ? [...s.explain, ...s.notes.map((n) => n.text)] : [...s.hints, s.clue, taskText(s)]),
        ...(s.kind === "build" ? s.trials.flatMap((t) => [t.label, t.why]) : [])
      ])
    ]
    for (const t of texts) expect((t.match(/`/g) ?? []).length % 2, t).toBe(0)
  })
})
