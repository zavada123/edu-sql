/** A value in a result cell. BLOBs are not used in the cases, so they are shown as text. */
export type Cell = number | string | null

/** A table that a query returned. Column names are shown but are not compared when checking. */
export interface ResultTable {
  readonly columns: readonly string[]
  readonly rows: readonly (readonly Cell[])[]
}

/** The outcome of one run of the student's SQL. */
export type RunResult =
  | { readonly kind: "table"; readonly table: ResultTable }
  /** The SQL ran but returned no table (for example, only whitespace or a comment). */
  | { readonly kind: "empty" }
  /** SQLite refused the query. `message` is in Ukrainian, `raw` is the original SQLite text. */
  | { readonly kind: "error"; readonly message: string; readonly raw: string }

/** A column of a table, for the schema panel. */
export interface ColumnInfo {
  readonly name: string
  readonly type: string
  /** A short Ukrainian explanation for children. */
  readonly note: string
}

export interface TableInfo {
  readonly name: string
  /** What the table keeps, in Ukrainian. */
  readonly note: string
  readonly columns: readonly ColumnInfo[]
}

/** Who speaks a story line. The cases use the robot assistant and the student detective. */
export type Speaker = "robot" | "narrator" | "witness"

export interface StoryLine {
  readonly speaker: Speaker
  readonly text: string
}

/** A step where the student writes a query. The result must match the result of `solution`. */
export interface QueryStep {
  readonly kind: "query"
  readonly id: string
  readonly title: string
  /** The story before the task. */
  readonly story: readonly StoryLine[]
  /** What exactly the query must return. */
  readonly task: string
  /** The reference query. Its result is the correct answer. */
  readonly solution: string
  /** True when the order of rows matters (the task asks for ORDER BY). */
  readonly ordered: boolean
  /** SQL words the query must contain, for example ["JOIN"]. Empty when any query is accepted. */
  readonly mustUse: readonly string[]
  /** Hints from gentle to almost the answer. */
  readonly hints: readonly string[]
  /** A query that the editor starts with. Empty string for an empty editor. */
  readonly starter: string
  /** A new fact for the detective notebook, shown after the step is solved. */
  readonly clue: string
}

/** A step where the student types an answer (a number or a name) found with queries. */
export interface AnswerStep {
  readonly kind: "answer"
  readonly id: string
  readonly title: string
  readonly story: readonly StoryLine[]
  readonly question: string
  /** Accepted answers. Case, extra spaces and the letter ґ/г are ignored when comparing. */
  readonly accepted: readonly string[]
  readonly hints: readonly string[]
  readonly clue: string
}

export type Step = QueryStep | AnswerStep

export interface Chapter {
  readonly id: string
  readonly title: string
  /** SQL topics of the chapter, for the teacher, e.g. "WHERE, AND". */
  readonly topics: string
  readonly steps: readonly Step[]
}

/** A detective case: a database and a story told by steps. */
export interface Case {
  readonly id: string
  readonly title: string
  /** One paragraph for the case card. */
  readonly summary: string
  /** Grades the case is made for, e.g. "7–11". */
  readonly grades: string
  /** SQL that creates and fills the database. */
  readonly setup: string
  readonly tables: readonly TableInfo[]
  readonly chapters: readonly Chapter[]
  /** The story after the last step. */
  readonly ending: readonly StoryLine[]
}

/** Why a checked answer is wrong, so that the trainer can give a precise message. */
export type Verdict =
  | { readonly kind: "ok" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "noTable" }
  | { readonly kind: "columns"; readonly got: number; readonly want: number }
  | { readonly kind: "tooMany"; readonly got: number; readonly want: number }
  | { readonly kind: "tooFew"; readonly got: number; readonly want: number }
  | { readonly kind: "order" }
  | { readonly kind: "values" }
  | { readonly kind: "mustUse"; readonly words: readonly string[] }
  | { readonly kind: "wrongAnswer" }

/** Progress in a case: ids of solved steps and the last query of each step. */
export interface Progress {
  readonly caseId: string
  readonly solved: readonly string[]
  readonly drafts: Readonly<Record<string, string>>
  readonly hintsUsed: Readonly<Record<string, number>>
}

/** What the trainer reports to the host app after each solved step. */
export interface Report {
  readonly caseId: string
  readonly stepId: string
  readonly solvedSteps: number
  readonly totalSteps: number
  /** True when the whole case is solved. */
  readonly finished: boolean
  /** From 0 to 1: each solved step gives 1, minus 0.25 per hint, but at least 0.5. */
  readonly score: number
  readonly progress: Progress
}
