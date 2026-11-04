import { describe, expect, it } from "vitest"
import { splitSql } from "./RichText.tsx"

describe("splitSql", () => {
  it("finds SQL between backticks", () => {
    expect(splitSql("Додай `WHERE` і `AND`.")).toEqual([
      { sql: false, text: "Додай " },
      { sql: true, text: "WHERE" },
      { sql: false, text: " і " },
      { sql: true, text: "AND" },
      { sql: false, text: "." }
    ])
  })

  it("keeps a text without SQL as it is", () => {
    expect(splitSql("Правильно!")).toEqual([{ sql: false, text: "Правильно!" }])
  })
})
