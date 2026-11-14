import type { ResultTable } from "../core/types.ts"

/** The result of one statement of the editor text. `line` is the 1-based line where the statement starts. */
export type StatementResult =
  | {
      readonly kind: "table"
      readonly line: number
      readonly sql: string
      readonly table: ResultTable
      /** True when the statement returned more rows than the sandbox keeps. */
      readonly truncated: boolean
    }
  | {
      readonly kind: "change"
      readonly line: number
      readonly sql: string
      /** Ukrainian text for the student: «Додано 3 рядки», «Таблицю створено». */
      readonly message: string
      readonly rows: number
    }
  | {
      readonly kind: "error"
      readonly line: number
      readonly sql: string
      /** Ukrainian explanation. */
      readonly message: string
      /** The original SQLite text. */
      readonly raw: string
    }

/** All results of one run. The run stops at the first error. */
export interface ExecResult {
  readonly results: readonly StatementResult[]
  /** True when the data or the schema changed: the host saves the database and keeps an undo step. */
  readonly changed: boolean
}

/** A column of a table in the schema panel. */
export interface SchemaColumn {
  readonly name: string
  readonly type: string
  readonly primaryKey: boolean
  readonly notNull: boolean
  /** `table.column` that this column points to, or "" when it is not a foreign key. */
  readonly references: string
}

/** A table or a view of the live database. */
export interface SchemaTable {
  readonly name: string
  readonly kind: "table" | "view"
  readonly columns: readonly SchemaColumn[]
  /** Number of rows. For a view it is -1: counting could be slow. */
  readonly rows: number
}
