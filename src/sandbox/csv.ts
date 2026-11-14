import type { SqlValue } from "sql.js"
import type { ResultTable } from "../core/types.ts"
import { quoteName, sqlLiteral } from "./engine.ts"

/** Separators that school spreadsheets use. Excel with Ukrainian settings saves `;`. */
export const CsvDelimiters = { Comma: ",", Semicolon: ";", Tab: "\t" } as const
export type CsvDelimiter = (typeof CsvDelimiters)[keyof typeof CsvDelimiters]

/** Types that the CSV wizard offers for a column. */
export const ColumnTypes = { Integer: "INTEGER", Real: "REAL", Text: "TEXT" } as const
export type ColumnType = (typeof ColumnTypes)[keyof typeof ColumnTypes]

/** Text encodings of CSV files: UTF-8 or the old Windows encoding of Ukrainian Excel. */
export const TextEncodings = { Utf8: "utf-8", Windows1251: "windows-1251" } as const
export type TextEncoding = (typeof TextEncodings)[keyof typeof TextEncodings]

/** Decodes the bytes of a text file. Bytes that are not valid UTF-8 are read as Windows-1251. */
export const decodeText = (bytes: Uint8Array, encoding: TextEncoding | "auto"): { readonly text: string; readonly encoding: TextEncoding } => {
  const strip = (s: string): string => (s.startsWith("﻿") ? s.slice(1) : s)
  if (encoding === "auto") {
    try {
      return { text: strip(new TextDecoder("utf-8", { fatal: true }).decode(bytes)), encoding: TextEncodings.Utf8 }
    } catch {
      return { text: strip(new TextDecoder("windows-1251").decode(bytes)), encoding: TextEncodings.Windows1251 }
    }
  }
  return { text: strip(new TextDecoder(encoding).decode(bytes)), encoding }
}

/** Picks the separator that appears most often in the first line. */
export const detectDelimiter = (text: string): CsvDelimiter => {
  const first = text.split(/\r?\n/, 1)[0] ?? ""
  const count = (d: string): number => first.split(d).length - 1
  const options = Object.values(CsvDelimiters)
  return options.reduce((best, d) => (count(d) > count(best) ? d : best), CsvDelimiters.Comma)
}

/** Parses CSV text (RFC 4180: quotes, doubled quotes, line breaks inside quotes). Empty lines are skipped. */
export const parseCsv = (text: string, delimiter: CsvDelimiter): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  let i = 0
  const endRow = () => {
    row.push(field)
    if (row.length > 1 || row[0] !== "") rows.push(row)
    row = []
    field = ""
  }
  while (i < text.length) {
    const ch = text.charAt(i)
    if (quoted) {
      if (ch === '"' && text.charAt(i + 1) === '"') {
        field += '"'
        i += 2
        continue
      }
      if (ch === '"') quoted = false
      else field += ch
      i++
      continue
    }
    if (ch === '"' && field === "") quoted = true
    else if (ch === delimiter) {
      row.push(field)
      field = ""
    } else if (ch === "\n" || ch === "\r") {
      endRow()
      if (ch === "\r" && text.charAt(i + 1) === "\n") i++
    } else field += ch
    i++
  }
  if (field !== "" || row.length > 0) endRow()
  return rows
}

const INTEGER = /^[+-]?\d+$/
/** A real number with a dot or a comma (Ukrainian Excel writes 3,5). */
const REAL = /^[+-]?(\d+[.,]\d*|[.,]\d+|\d+)([eE][+-]?\d+)?$/

/** Guesses the type of every column from its values. Empty cells do not count. */
export const guessTypes = (rows: readonly (readonly string[])[], columns: number): ColumnType[] =>
  Array.from({ length: columns }, (_, c) => {
    const values = rows.map((r) => (r[c] ?? "").trim()).filter((v) => v !== "")
    if (values.length === 0) return ColumnTypes.Text
    if (values.every((v) => INTEGER.test(v) && Number.isSafeInteger(Number(v)))) return ColumnTypes.Integer
    if (values.every((v) => REAL.test(v))) return ColumnTypes.Real
    return ColumnTypes.Text
  })

/** Makes a column or table name from a header: trims it and gives a name to an empty header. */
export const columnNames = (header: readonly string[]): string[] => {
  const used = new Set<string>()
  return header.map((h, i) => {
    const base = h.trim() === "" ? `стовпець_${i + 1}` : h.trim()
    let name = base
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base}_${n}`
    used.add(name.toLowerCase())
    return name
  })
}

const cellValue = (raw: string, type: ColumnType): SqlValue => {
  const v = raw.trim()
  if (v === "") return null
  if (type === ColumnTypes.Integer && INTEGER.test(v)) return Number(v)
  if (type === ColumnTypes.Real && REAL.test(v)) return Number(v.replace(",", "."))
  return raw
}

/** What the CSV wizard builds a table from. */
export interface CsvImport {
  readonly table: string
  readonly columns: readonly string[]
  readonly types: readonly ColumnType[]
  /** Data rows without the header. */
  readonly rows: readonly (readonly string[])[]
}

/** SQL that creates the table and inserts the rows, in one transaction. */
export const csvToSql = ({ table, columns, types, rows }: CsvImport): string => {
  const t = quoteName(table)
  const defs = columns.map((c, i) => `${quoteName(c)} ${types[i] ?? ColumnTypes.Text}`).join(", ")
  const inserts = rows.map(
    (r) => `INSERT INTO ${t} VALUES(${columns.map((_, i) => sqlLiteral(cellValue(r[i] ?? "", types[i] ?? ColumnTypes.Text))).join(", ")});`
  )
  return [`CREATE TABLE ${t} (${defs});`, "BEGIN;", ...inserts, "COMMIT;"].join("\n")
}

/** A table name from a file name: without the extension, with `_` instead of spaces and signs. */
export const tableNameFromFile = (fileName: string): string => {
  const base = fileName.replace(/\.[^.]*$/, "").trim()
  const clean = base.replace(/[^\p{L}\p{N}_]+/gu, "_").replace(/^_+|_+$/g, "")
  if (clean === "") return "дані"
  return /^\d/.test(clean) ? `t_${clean}` : clean
}

const csvField = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : String(v)
  return /[",;\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

/**
 * A query result as CSV for Excel: a byte order mark (so Excel reads Cyrillic as UTF-8) and `;`,
 * the separator of Excel with Ukrainian settings.
 */
export const resultToCsv = (table: ResultTable, delimiter: CsvDelimiter = CsvDelimiters.Semicolon): string =>
  `﻿${[table.columns, ...table.rows].map((r) => r.map(csvField).join(delimiter)).join("\r\n")}\r\n`

/** A query result as tab-separated text: pasting it into Excel or Google Sheets fills the cells. */
export const resultToTsv = (table: ResultTable): string =>
  [table.columns, ...table.rows].map((r) => r.map((v) => (v === null ? "" : String(v).replace(/[\t\n\r]+/g, " "))).join("\t")).join("\n")
