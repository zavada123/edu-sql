import type { Sandbox } from "./run.ts"
import type { AnswerStep, Cell, Progress, QueryStep, Report, ResultTable, Step, Verdict, Case } from "./types.ts"

const DECIMALS = 6

/** A cell as a comparable string: 5 and 5.0 are equal, text is compared without edge spaces. */
const cellKey = (c: Cell): string => {
  if (c === null) return "\u0000null"
  if (typeof c === "number") return String(Number(c.toFixed(DECIMALS)))
  return c.trim()
}

const rowKey = (row: readonly Cell[]): string => JSON.stringify(row.map(cellKey))

const sameMultiset = (a: readonly string[], b: readonly string[]): boolean => {
  const counts = new Map<string, number>()
  for (const k of a) counts.set(k, (counts.get(k) ?? 0) + 1)
  for (const k of b) {
    const n = counts.get(k) ?? 0
    if (n === 0) return false
    counts.set(k, n - 1)
  }
  return true
}

/**
 * Compares the student's table with the correct one. Column names are ignored,
 * so `SELECT name AS ім_я` is accepted; the order of columns matters.
 */
export const compareTables = (got: ResultTable, want: ResultTable, ordered: boolean): Verdict => {
  if (got.columns.length !== want.columns.length) return { kind: "columns", got: got.columns.length, want: want.columns.length }
  if (got.rows.length > want.rows.length) return { kind: "tooMany", got: got.rows.length, want: want.rows.length }
  if (got.rows.length < want.rows.length) return { kind: "tooFew", got: got.rows.length, want: want.rows.length }
  const g = got.rows.map(rowKey)
  const w = want.rows.map(rowKey)
  if (!sameMultiset(g, w)) return { kind: "values" }
  if (ordered && g.some((k, i) => k !== w[i])) return { kind: "order" }
  return { kind: "ok" }
}

/** Removes comments, text in quotes and quoted names, so that `WHERE name = 'JOIN'` does not count as using JOIN. */
const codeOnly = (sql: string): string =>
  sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^']|'')*'|"(?:[^"]|"")*"/g, "''")

/** SQL words from `words` that the query does not contain. */
export const missingWords = (sql: string, words: readonly string[]): string[] => {
  const code = codeOnly(sql).toUpperCase()
  return words.filter((w) => !new RegExp(`\\b${w.toUpperCase().replace(/\s+/g, "\\s+")}\\b`).test(code))
}

/** Runs the student's query and the reference query and compares the results. */
export const checkQuery = (sandbox: Sandbox, step: QueryStep, sql: string): Verdict => {
  const got = sandbox.run(sql)
  if (got.kind === "error") return { kind: "error", message: got.message }
  if (got.kind === "empty") return { kind: "noTable" }
  const want = sandbox.run(step.solution)
  if (want.kind !== "table") return { kind: "error", message: "У самому завданні помилка: еталонний запит не працює." }
  const verdict = compareTables(got.table, want.table, step.ordered)
  if (verdict.kind !== "ok") return verdict
  const missing = missingWords(sql, step.mustUse)
  return missing.length > 0 ? { kind: "mustUse", words: missing } : verdict
}

/** Lower case, single spaces, ґ = г, ё = е, apostrophes unified. */
export const normalizeAnswer = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/ґ/g, "г")
    .replace(/[’ʼ`]/g, "'")
    .replace(/[.,!]+$/g, "")
    .replace(/\s+/g, " ")

export const checkAnswer = (step: AnswerStep, text: string): Verdict => {
  const a = normalizeAnswer(text)
  return step.accepted.some((x) => normalizeAnswer(x) === a) ? { kind: "ok" } : { kind: "wrongAnswer" }
}

/** A short message about a verdict, in Ukrainian. */
export const verdictMessage = (v: Verdict): string => {
  switch (v.kind) {
    case "ok":
      return "Правильно!"
    case "error":
      return v.message
    case "noTable":
      return "Запит нічого не показав. Почни з SELECT."
    case "columns":
      return `У результаті ${v.got} ${plural(v.got, "стовпець", "стовпці", "стовпців")}, а потрібно ${v.want}. Перевір, що написано після SELECT.`
    case "tooMany":
      return `Рядків забагато: ${v.got}, а потрібно ${v.want}. Додай або уточни умову WHERE.`
    case "tooFew":
      return `Рядків замало: ${v.got}, а потрібно ${v.want}. Можливо, умова надто сувора.`
    case "order":
      return "Рядки правильні, але порядок інший. Перевір ORDER BY: за зростанням (ASC) чи за спаданням (DESC)?"
    case "values":
      return "Кількість рядків правильна, але значення не ті. Перевір умову й вибрані стовпці."
    case "mustUse":
      return `Результат правильний, але в цьому завданні треба використати ${v.words.join(", ")}.`
    case "wrongAnswer":
      return "Ні, це не так. Перевір ще раз результати своїх запитів."
  }
}

/** Ukrainian plural form for a count. */
export const plural = (n: number, one: string, few: string, many: string): string => {
  const d = Math.abs(n) % 100
  const u = d % 10
  if (d > 10 && d < 20) return many
  if (u === 1) return one
  if (u >= 2 && u <= 4) return few
  return many
}

export const allSteps = (c: Case): Step[] => c.chapters.flatMap((ch) => ch.steps)

export const emptyProgress = (c: Case): Progress => ({ caseId: c.id, solved: [], drafts: {}, hintsUsed: {} })

/** The first step that is not solved yet, or undefined when the case is finished. */
export const currentStep = (c: Case, p: Progress): Step | undefined => allSteps(c).find((s) => !p.solved.includes(s.id))

export const markSolved = (p: Progress, stepId: string): Progress =>
  p.solved.includes(stepId) ? p : { ...p, solved: [...p.solved, stepId] }

/** Each hint costs a quarter of the step, but a solved step gives at least half. */
const HINT_COST = 0.25
const MIN_STEP_POINTS = 0.5

export const makeReport = (c: Case, p: Progress, stepId: string): Report => {
  const steps = allSteps(c)
  const solved = steps.filter((s) => p.solved.includes(s.id))
  const points = solved.reduce((sum, s) => sum + Math.max(MIN_STEP_POINTS, 1 - HINT_COST * (p.hintsUsed[s.id] ?? 0)), 0)
  return {
    caseId: c.id,
    stepId,
    solvedSteps: solved.length,
    totalSteps: steps.length,
    finished: solved.length === steps.length,
    score: steps.length === 0 ? 0 : Number((points / steps.length).toFixed(2)),
    progress: p
  }
}
