import { describe, expect, it } from "vitest"
import { columnNames, csvToSql, decodeText, detectDelimiter, guessTypes, parseCsv, resultToCsv, resultToTsv, tableNameFromFile } from "./csv.ts"
import { decodeShare, encodeShare } from "./share.ts"
import { UndoStack } from "./undo.ts"

describe("parseCsv", () => {
  it("reads quotes, doubled quotes and line breaks inside quotes", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\r\n"two\nlines",3\n\n', ",")).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
      ["two\nlines", "3"]
    ])
  })

  it("keeps empty fields", () => {
    expect(parseCsv("a;;c\n;;", ";")).toEqual([
      ["a", "", "c"],
      ["", "", ""]
    ])
  })
})

describe("detectDelimiter", () => {
  it("picks the separator of the header", () => {
    expect(detectDelimiter("ім'я;вік;клас\nОля;11;5")).toBe(";")
    expect(detectDelimiter("a\tb\tc")).toBe("\t")
    expect(detectDelimiter("a,b")).toBe(",")
  })
})

describe("guessTypes", () => {
  it("finds integers, reals with a comma and text; empty cells do not count", () => {
    expect(guessTypes([["1", "3,5", "Оля", ""], ["22", "4.25", "7", ""], ["", "1", "x", ""]], 4)).toEqual(["INTEGER", "REAL", "TEXT", "TEXT"])
  })
})

describe("columnNames", () => {
  it("names empty headers and makes repeated names different", () => {
    expect(columnNames(["Ім'я", "", "ім'я "])).toEqual(["Ім'я", "стовпець_2", "ім'я_2"])
  })
})

describe("csvToSql", () => {
  it("creates the table with types and inserts values", () => {
    expect(csvToSql({ table: "учні", columns: ["ім'я", "бал"], types: ["TEXT", "REAL"], rows: [["О'Ніл", "3,5"], ["Ян", ""]] })).toBe(
      [`CREATE TABLE "учні" ("ім'я" TEXT, "бал" REAL);`, "BEGIN;", `INSERT INTO "учні" VALUES('О''Ніл', 3.5);`, `INSERT INTO "учні" VALUES('Ян', NULL);`, "COMMIT;"].join(
        "\n"
      )
    )
  })
})

describe("decodeText", () => {
  it("reads UTF-8 and falls back to Windows-1251", () => {
    expect(decodeText(new TextEncoder().encode("﻿Привіт"), "auto")).toEqual({ text: "Привіт", encoding: "utf-8" })
    // "Привіт" in Windows-1251
    expect(decodeText(new Uint8Array([0xcf, 0xf0, 0xe8, 0xe2, 0xb3, 0xf2]), "auto")).toEqual({ text: "Привіт", encoding: "windows-1251" })
  })
})

describe("tableNameFromFile", () => {
  it("makes a table name from a file name", () => {
    expect(tableNameFromFile("Оцінки 6-А.csv")).toBe("Оцінки_6_А")
    expect(tableNameFromFile("2025.csv")).toBe("t_2025")
    expect(tableNameFromFile("!!!.csv")).toBe("дані")
  })
})

describe("result export", () => {
  const table = { columns: ["name", "note"], rows: [["Оля", 'a;"b"'], ["Ян", null]] }
  it("writes CSV for Excel with a byte order mark", () => {
    expect(resultToCsv(table)).toBe('﻿name;note\r\nОля;"a;""b"""\r\nЯн;\r\n')
  })
  it("writes tab-separated text for the clipboard", () => {
    expect(resultToTsv(table)).toBe('name\tnote\nОля\ta;"b"\nЯн\t')
  })
})

describe("share links", () => {
  it("keep the queries and the template", () => {
    const hash = encodeShare({ template: "library", queries: "SELECT 'привіт';" })
    expect(hash.startsWith("#sql=")).toBe(true)
    expect(decodeShare(hash)).toEqual({ template: "library", queries: "SELECT 'привіт';" })
  })
  it("ignore a broken hash", () => {
    expect(decodeShare("#sql=@@@")).toBeUndefined()
    expect(decodeShare("#code=abc")).toBeUndefined()
  })
})

describe("UndoStack", () => {
  it("keeps the newest ten images", () => {
    let s = new UndoStack()
    for (let i = 0; i < 12; i++) s = s.push(new Uint8Array([i]))
    expect(s.size).toBe(10)
    const top = s.pop()
    expect(top?.image[0]).toBe(11)
    expect(top?.rest.size).toBe(9)
    expect(new UndoStack().pop()).toBeUndefined()
  })
})
