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

/** In all texts of a case, words in `backticks` are SQL: the trainer shows them as code. */
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

/** One SQL word or sign and what it means, for the table of a lesson. */
export interface LessonNote {
  readonly code: string
  readonly text: string
}

/**
 * A step that explains SQL words before the tasks that use them. The student reads it, runs the example
 * and changes it if they want. The step is not checked and does not change the score.
 */
export interface LessonStep {
  readonly kind: "lesson"
  readonly id: string
  readonly title: string
  readonly story: readonly StoryLine[]
  /** What the words do and why, one paragraph per item. */
  readonly explain: readonly string[]
  /** The general form, for example "SELECT стовпці FROM таблиця". */
  readonly syntax: string
  readonly notes: readonly LessonNote[]
  /** A query that the editor starts with, so that the student can run it at once. */
  readonly example: string
}

/** A step that the student must solve: a query or an answer. */
export type TaskStep = QueryStep | AnswerStep

export type Step = TaskStep | LessonStep

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
  /** SQL words for the buttons under the editor, for one tap on a phone. */
  readonly chips: readonly string[]
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

/** Progress in a case. */
export interface Progress {
  readonly caseId: string
  /** Ids of solved steps, in the order they were solved. */
  readonly solved: readonly string[]
  /** The accepted query or answer of each solved step, so that a server can check the case again. */
  readonly answers: Readonly<Record<string, string>>
  /** The last text in the editor of each step. */
  readonly drafts: Readonly<Record<string, string>>
  readonly hintsUsed: Readonly<Record<string, number>>
}

/** One step after `checkCase` ran the saved answer again. */
export interface StepCheck {
  readonly stepId: string
  readonly passed: boolean
}

/** What the trainer reports to the host app after each solved step. */
export interface Report {
  readonly caseId: string
  readonly stepId: string
  /** Solved task steps; lessons are not counted. */
  readonly solvedSteps: number
  readonly totalSteps: number
  /** True when all task steps are solved. */
  readonly finished: boolean
  /** From 0 to 1: each solved task step gives 1, minus 0.25 per hint, but at least 0.5. */
  readonly score: number
  readonly progress: Progress
}
