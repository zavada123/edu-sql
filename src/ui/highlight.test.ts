import { describe, expect, it } from "vitest"
import { tokenize } from "./highlight.ts"

describe("tokenize", () => {
  it("colors keywords, strings, numbers and comments", () => {
    const kinds = tokenize("select * from t where x = 'Ма%' -- ok\nlimit 1").filter((t) => t.kind !== "plain")
    expect(kinds.map((t) => [t.kind, t.text])).toEqual([
      ["keyword", "select"],
      ["keyword", "from"],
      ["keyword", "where"],
      ["string", "'Ма%'"],
      ["comment", "-- ok"],
      ["keyword", "limit"],
      ["number", "1"]
    ])
  })
  it("keeps all the text", () => {
    const sql = "SELECT 'it''s', \"a\" FROM t /* x"
    expect(tokenize(sql).map((t) => t.text).join("")).toBe(sql)
  })
})
