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
import { CaseMap } from "./CaseMap.tsx"
import { Notebook } from "./Notebook.tsx"
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

/** The right panel shows the query result or the database schema. */
type Tab = "result" | "schema"

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
  const [tab, setTab] = useState<Tab>("result")
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
    setTab("result")
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
    setTab("result")
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
  const current = currentStep(c, progress)
  const stepNumber = step ? steps.indexOf(step) + 1 : 0
  const chapter = c.chapters.find((ch) => ch.steps.some((s) => s.id === viewing))
  const setQuery = (v: string) => step && update({ ...progress, drafts: { ...progress.drafts, [step.id]: v } })
  const report = makeReport(c, progress, "")

  return (
    <div className="edu-sql">
      <CaseMap case={c} progress={progress} currentId={current?.id} viewing={viewing} onOpen={open} />

      {step === undefined ? (
        <section className="edu-sql-end">
          <div className="edu-sql-stamp" aria-hidden="true">
            Справу
            <br />
            розкрито
          </div>
          <Robot size={72} mood="happy" />
          <Story lines={c.ending} />
          <dl className="edu-sql-stats">
            <div>
              <dt>Кроків</dt>
              <dd>
                {report.solvedSteps}/{report.totalSteps}
              </dd>
            </div>
            <div>
              <dt>Підказок</dt>
              <dd>{Object.values(progress.hintsUsed).reduce((a, b) => a + b, 0)}</dd>
            </div>
            <div>
              <dt>Оцінка</dt>
              <dd>{Math.round(report.score * 100)}%</dd>
            </div>
          </dl>
          <Notebook clues={clues} open />
          <button type="button" className="edu-sql-btn edu-sql-btn-ghost" onClick={restart}>
            ↺ Розслідувати знову
          </button>
        </section>
      ) : (
        <div className="edu-sql-grid">
          <section className="edu-sql-case" aria-label="Завдання">
            <p className="edu-sql-step-label">
              {chapter?.title} · крок {stepNumber} з {steps.length}
            </p>
            <h3>{step.title}</h3>
            <Story lines={step.story} />
            <div className="edu-sql-task">
              <span className="edu-sql-task-icon" aria-hidden="true">
                {step.kind === "query" ? "🎯" : "❓"}
              </span>
              <div>
                <strong>{step.kind === "query" ? "Завдання" : "Питання"}</strong>
                <p>{step.kind === "query" ? step.task : step.question}</p>
              </div>
            </div>
            {step.kind === "answer" && (
              <form className="edu-sql-answer" onSubmit={submitAnswer}>
                <input
                  value={solved ? (step.accepted[0] ?? "") : answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={solved}
                  aria-label="Відповідь"
                  placeholder="Твоя відповідь…"
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
                    <span aria-hidden="true">💡</span> {h}
                  </p>
                ))}
                {hintsShown < step.hints.length && (
                  <button type="button" className="edu-sql-link" onClick={showHint}>
                    {hintsShown === 0 ? "Потрібна підказка" : "Ще одна підказка"} ({hintsShown + 1}/{step.hints.length})
                  </button>
                )}
              </div>
            )}
            {feedback.kind === "wrong" && (
              <p className="edu-sql-wrong" role="status">
                <span aria-hidden="true">🤔</span> {feedback.text}
              </p>
            )}
            {solved && (
              <div className={`edu-sql-clue${feedback.kind === "ok" ? " is-new" : ""}`} role="status">
                <div className="edu-sql-clue-head">
                  <Robot size={40} mood="happy" />
                  <strong>{feedback.kind === "ok" ? "Доказ знайдено!" : "Доказ"}</strong>
                </div>
                <p>{step.clue}</p>
                <button type="button" className="edu-sql-btn" onClick={goNext}>
                  {current ? "Далі →" : "До розгадки →"}
                </button>
              </div>
            )}
            <Notebook clues={clues} open={false} />
          </section>

          <section className="edu-sql-work" aria-label="Запит до бази даних">
            <SqlEditor
              value={query}
              onChange={setQuery}
              onRun={run}
              inserterRef={inserter}
              title={`ліцей.db — ${step.title}`}
              toolbar={
                <>
                  <button type="button" className="edu-sql-btn edu-sql-btn-run" onClick={run} disabled={!sandbox}>
                    <span aria-hidden="true">▶</span> Виконати
                  </button>
                  <button type="button" className="edu-sql-btn edu-sql-btn-ghost" onClick={() => setQuery("")} disabled={query === ""}>
                    Очистити
                  </button>
                  <span className="edu-sql-term-hint">
                    {loadError ? `Не вдалося завантажити SQLite: ${loadError}` : sandbox ? "Ctrl + Enter" : "Завантажую базу даних…"}
                  </span>
                </>
              }
            />
            <div className="edu-sql-panel">
              <div className="edu-sql-tabs" role="tablist" aria-label="Що показати">
                <button type="button" role="tab" aria-selected={tab === "result"} className={tab === "result" ? "is-on" : ""} onClick={() => setTab("result")}>
                  Результат
                </button>
                <button type="button" role="tab" aria-selected={tab === "schema"} className={tab === "schema" ? "is-on" : ""} onClick={() => setTab("schema")}>
                  Таблиці бази <span className="edu-sql-badge">{c.tables.length}</span>
                </button>
              </div>
              <div role="tabpanel" className="edu-sql-panel-body">
                {tab === "result" ? <ResultView result={result} /> : <Schema tables={c.tables} onInsert={(t) => inserter.current?.(t)} />}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
