import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import type { SqlJsStatic } from "sql.js"
import {
  allSteps,
  checkAnswer,
  checkQuery,
  currentStep,
  emptyProgress,
  makeReport,
  markSolved,
  Sandbox,
  verdictMessage,
  type Case,
  type Progress,
  type Report,
  type RunResult,
  type Step
} from "../core/index.ts"
import { loadSql } from "./loadSql.ts"
import { ResultView } from "./ResultView.tsx"
import { Robot } from "./Robot.tsx"
import { Schema } from "./Schema.tsx"
import { SqlEditor } from "./SqlEditor.tsx"
import { Story } from "./Story.tsx"
import "./sql.css"

interface Props {
  readonly case: Case
  /** Saved progress to continue. */
  readonly initialProgress?: Progress | undefined
  /** After every change of progress (a solved step, a hint, a draft), to save it. */
  readonly onChange?: (progress: Progress) => void
  /** After every solved step. `report.finished` is true when the case is solved. */
  readonly onStepSolved?: (report: Report) => void
}

const END = "end"

type Feedback = { readonly kind: "ok" } | { readonly kind: "wrong"; readonly text: string } | { readonly kind: "none" }

/** The SQL detective trainer: a story, a database and a query editor. */
export const SqlDetective = ({ case: c, initialProgress, onChange, onStepSolved }: Props) => {
  const [sql, setSql] = useState<SqlJsStatic>()
  const [loadError, setLoadError] = useState<string>()
  const [progress, setProgress] = useState<Progress>(() => (initialProgress?.caseId === c.id ? initialProgress : emptyProgress(c)))
  const [viewing, setViewing] = useState<string>(() => currentStep(c, progress)?.id ?? END)
  const [result, setResult] = useState<RunResult>()
  const [feedback, setFeedback] = useState<Feedback>({ kind: "none" })
  const [answer, setAnswer] = useState("")
  const inserter = useRef<((text: string) => void) | null>(null)

  useEffect(() => {
    let alive = true
    loadSql().then(
      (s) => alive && setSql(s),
      (e: unknown) => alive && setLoadError(e instanceof Error ? e.message : String(e))
    )
    return () => {
      alive = false
    }
  }, [])

  const sandbox = useMemo(() => (sql ? new Sandbox(sql, c.setup) : undefined), [sql, c.setup])
  const steps = useMemo(() => allSteps(c), [c])
  const step: Step | undefined = steps.find((s) => s.id === viewing)
  const solved = step !== undefined && progress.solved.includes(step.id)
  const query = step ? (progress.drafts[step.id] ?? (step.kind === "query" ? step.starter : "")) : ""
  const hintsShown = step ? (progress.hintsUsed[step.id] ?? 0) : 0

  const update = (next: Progress) => {
    setProgress(next)
    onChange?.(next)
  }

  const open = (id: string) => {
    setViewing(id)
    setResult(undefined)
    setFeedback({ kind: "none" })
    setAnswer("")
  }

  const solve = (s: Step) => {
    const next = markSolved(progress, s.id)
    update(next)
    setFeedback({ kind: "ok" })
    onStepSolved?.(makeReport(c, next, s.id))
  }

  const run = () => {
    if (!sandbox || !step) return
    setResult(sandbox.run(query))
    if (step.kind !== "query" || solved) return
    const verdict = checkQuery(sandbox, step, query)
    if (verdict.kind === "ok") solve(step)
    else setFeedback(verdict.kind === "error" ? { kind: "none" } : { kind: "wrong", text: verdictMessage(verdict) })
  }

  const submitAnswer = (e: FormEvent) => {
    e.preventDefault()
    if (!step || step.kind !== "answer" || solved) return
    const verdict = checkAnswer(step, answer)
    if (verdict.kind === "ok") solve(step)
    else setFeedback({ kind: "wrong", text: verdictMessage(verdict) })
  }

  const showHint = () => {
    if (!step) return
    update({ ...progress, hintsUsed: { ...progress.hintsUsed, [step.id]: hintsShown + 1 } })
  }

  const goNext = () => open(currentStep(c, progress)?.id ?? END)

  const restart = () => {
    const fresh = emptyProgress(c)
    update(fresh)
    open(steps[0]?.id ?? END)
  }

  const clues = steps.filter((s) => progress.solved.includes(s.id)).map((s) => s.clue)

  return (
    <div className="edu-sql">
      <header className="edu-sql-head">
        <div>
          <p className="edu-sql-kicker">SQL-детектив · {c.grades} клас</p>
          <h2>{c.title}</h2>
        </div>
        <nav className="edu-sql-map" aria-label="Розділи справи">
          {c.chapters.map((ch) => (
            <div key={ch.id} className="edu-sql-chapter">
              <span className="edu-sql-chapter-title" title={ch.topics}>{ch.title}</span>
              <span className="edu-sql-dots">
                {ch.steps.map((s) => {
                  const done = progress.solved.includes(s.id)
                  const reachable = done || s.id === currentStep(c, progress)?.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!reachable}
                      onClick={() => open(s.id)}
                      className={`edu-sql-dot${done ? " is-done" : ""}${s.id === viewing ? " is-here" : ""}`}
                      aria-label={`${s.title}${done ? " (розкрито)" : ""}`}
                      title={s.title}
                    />
                  )
                })}
              </span>
            </div>
          ))}
        </nav>
      </header>

      {step === undefined ? (
        <section className="edu-sql-end">
          <Story lines={c.ending} />
          <Notebook clues={clues} />
          <button type="button" className="edu-sql-btn" onClick={restart}>
            Розслідувати знову
          </button>
        </section>
      ) : (
        <div className="edu-sql-grid">
          <section className="edu-sql-case" aria-label="Завдання">
            <h3>{step.title}</h3>
            <Story lines={step.story} />
            <div className="edu-sql-task">
              <strong>Завдання.</strong> {step.kind === "query" ? step.task : step.question}
            </div>
            {step.kind === "answer" && (
              <form className="edu-sql-answer" onSubmit={submitAnswer}>
                <input
                  value={solved ? step.accepted[0] ?? "" : answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={solved}
                  aria-label="Відповідь"
                  placeholder="Твоя відповідь"
                />
                <button type="submit" className="edu-sql-btn" disabled={solved || answer.trim() === ""}>
                  Відповісти
                </button>
              </form>
            )}
            {!solved && step.hints.length > 0 && (
              <div className="edu-sql-hints">
                {step.hints.slice(0, hintsShown).map((h, i) => (
                  <p key={i} className="edu-sql-hint">
                    💡 {h}
                  </p>
                ))}
                {hintsShown < step.hints.length && (
                  <button type="button" className="edu-sql-link" onClick={showHint}>
                    {hintsShown === 0 ? "Підказка" : "Ще підказка"}
                  </button>
                )}
              </div>
            )}
            {feedback.kind === "wrong" && <p className="edu-sql-wrong" role="status">{feedback.text}</p>}
            {solved && (
              <div className="edu-sql-clue" role="status">
                <Robot size={36} />
                <div>
                  <strong>{feedback.kind === "ok" ? "Правильно! Новий доказ:" : "Доказ:"}</strong>
                  <p>{step.clue}</p>
                  <button type="button" className="edu-sql-btn" onClick={goNext}>
                    {currentStep(c, progress) ? "Далі →" : "До розгадки →"}
                  </button>
                </div>
              </div>
            )}
            <Notebook clues={clues} />
          </section>

          <section className="edu-sql-work" aria-label="Запит до бази даних">
            <SqlEditor
              value={query}
              onChange={(v) => update({ ...progress, drafts: { ...progress.drafts, [step.id]: v } })}
              onRun={run}
              inserterRef={inserter}
            />
            <div className="edu-sql-run">
              <button type="button" className="edu-sql-btn edu-sql-btn-run" onClick={run} disabled={!sandbox}>
                ▶ Виконати
              </button>
              <span className="edu-sql-muted">
                {loadError ? `Не вдалося завантажити SQLite: ${loadError}` : sandbox ? "Ctrl + Enter" : "Завантажую базу даних…"}
              </span>
            </div>
            {result && <ResultView result={result} />}
            <details className="edu-sql-schema-box" open>
              <summary>Таблиці бази даних</summary>
              <Schema tables={c.tables} onInsert={(t) => inserter.current?.(t)} />
            </details>
          </section>
        </div>
      )}
    </div>
  )
}

const Notebook = ({ clues }: { readonly clues: readonly string[] }) =>
  clues.length === 0 ? null : (
    <details className="edu-sql-notebook">
      <summary>📒 Блокнот детектива ({clues.length})</summary>
      <ol>
        {clues.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ol>
    </details>
  )
