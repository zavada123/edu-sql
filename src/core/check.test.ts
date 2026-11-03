import { describe, expect, it } from "vitest"
import { compareTables, missingWords, normalizeAnswer, plural } from "./check.ts"
import { explainError } from "./errors.ts"

const t = (rows: (number | string | null)[][], cols = rows[0]?.length ?? 1) => ({
  columns: Array.from({ length: cols }, (_, i) => `c${i}`),
  rows
})

describe("compareTables", () => {
  it("ignores row order when the task does not ask for it", () => {
    expect(compareTables(t([[1], [2]]), t([[2], [1]]), false)).toEqual({ kind: "ok" })
  })
  it("reports a wrong order when the task asks for ORDER BY", () => {
    expect(compareTables(t([[1], [2]]), t([[2], [1]]), true)).toEqual({ kind: "order" })
  })
  it("reports extra columns", () => {
    expect(compareTables(t([[1, 2]]), t([[1]]), false)).toEqual({ kind: "columns", got: 2, want: 1 })
  })
  it("reports too many and too few rows", () => {
    expect(compareTables(t([[1], [2]]), t([[1]]), false).kind).toBe("tooMany")
    expect(compareTables(t([[1]]), t([[1], [2]]), false).kind).toBe("tooFew")
  })
  it("treats duplicates as different rows", () => {
    expect(compareTables(t([[1], [1]]), t([[1], [2]]), false)).toEqual({ kind: "values" })
  })
  it("compares numbers by value and text without edge spaces", () => {
    expect(compareTables(t([[0.1 + 0.2, " a"]]), t([[0.3, "a"]]), false)).toEqual({ kind: "ok" })
  })
  it("does not mix NULL and the text 'null'", () => {
    expect(compareTables(t([[null]]), t([["null"]]), false)).toEqual({ kind: "values" })
  })
})

describe("missingWords", () => {
  it("finds words in any case and with extra spaces", () => {
    expect(missingWords("select * from a inner   join b on 1 order\nby x", ["JOIN", "ORDER BY"])).toEqual([])
  })
  it("ignores words inside text, quoted names and comments", () => {
    expect(missingWords(`SELECT 'join' AS "join" -- join\nFROM t /* join */`, ["JOIN"])).toEqual(["JOIN"])
  })
  it("does not match part of a word", () => {
    expect(missingWords("SELECT joined FROM t", ["JOIN"])).toEqual(["JOIN"])
  })
})

describe("normalizeAnswer", () => {
  it("ignores case, spaces, ґ and a final dot", () => {
    expect(normalizeAnswer("  Марія   ШЕВЧУК. ")).toBe("марія шевчук")
    expect(normalizeAnswer("Ґанок")).toBe(normalizeAnswer("ганок"))
    expect(normalizeAnswer("п’ять")).toBe("п'ять")
  })
})

describe("explainError", () => {
  it("explains common SQLite errors in Ukrainian", () => {
    expect(explainError("no such table: room")).toContain("«room»")
    expect(explainError("no such column: Марко")).toContain("'Марко'")
    expect(explainError('near "FORM": syntax error')).toContain("«FORM»")
    expect(explainError("incomplete input")).toContain("обірвався")
  })
  it("keeps unknown errors", () => {
    expect(explainError("something odd")).toContain("something odd")
  })
})

describe("plural", () => {
  it("chooses the Ukrainian form", () => {
    expect([1, 2, 5, 11, 21, 22, 25].map((n) => plural(n, "рядок", "рядки", "рядків"))).toEqual([
      "рядок", "рядки", "рядків", "рядків", "рядок", "рядки", "рядків"
    ])
  })
})
