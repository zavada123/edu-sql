import type { ReactNode } from "react"
import { isStepDone, taskSteps, type Case, type Progress } from "../core/index.ts"

interface Props {
  readonly case: Case
  readonly progress: Progress
  /** The step the student can open next, or undefined when the case is solved. */
  readonly currentId: string | undefined
  readonly viewing: string
  readonly onOpen: (stepId: string) => void
  /** Buttons in the corner of the header, for example the full screen button. */
  readonly actions: ReactNode
}

/** The case header: title, a progress bar and the chapters with their steps. */
export const CaseMap = ({ case: c, progress, currentId, viewing, onOpen, actions }: Props) => {
  const tasks = taskSteps(c)
  const total = tasks.length
  const done = tasks.filter((s) => progress.solved.includes(s.id)).length
  const isDone = (id: string) => isStepDone(c, progress, id)
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <header className="edu-sql-head">
      <div className="edu-sql-head-top">
        <div className="edu-sql-folder" aria-hidden="true">
          <span>SQL</span>
        </div>
        <div className="edu-sql-head-text">
          <p className="edu-sql-kicker">Справа · {c.grades} клас</p>
          <h2 className="edu-sql-title">{c.title}</h2>
        </div>
        <div className="edu-sql-meter" aria-label={`Розкрито ${done} з ${total}`}>
          <div className="edu-sql-meter-num">
            <strong>{done}</strong>/{total}
          </div>
          <div className="edu-sql-meter-bar">
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>
        {actions}
      </div>
      <nav className="edu-sql-map" aria-label="Розділи справи">
        {c.chapters.map((ch, chIndex) => {
          const chDone = ch.steps.every((s) => isDone(s.id))
          const active = ch.steps.some((s) => s.id === viewing)
          return (
            <div key={ch.id} className={`edu-sql-chapter${chDone ? " is-done" : ""}${active ? " is-active" : ""}`}>
              <span className="edu-sql-chapter-title">
                <span className="edu-sql-chapter-num">{chDone ? "✓" : chIndex + 1}</span>
                <span className="edu-sql-chapter-name">{ch.title}</span>
              </span>
              <span className="edu-sql-chapter-topics">{ch.topics}</span>
              <span className="edu-sql-dots">
                {ch.steps.map((s) => {
                  const solved = isDone(s.id)
                  const reachable = solved || s.id === currentId
                  const lesson = s.kind === "lesson"
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!reachable}
                      onClick={() => onOpen(s.id)}
                      className={`edu-sql-dot${lesson ? " is-lesson" : ""}${solved ? " is-done" : ""}${s.id === viewing ? " is-here" : ""}`}
                      aria-label={`${s.title}${solved ? (lesson ? " (прочитано)" : " (розкрито)") : reachable ? " (поточний крок)" : " (ще закрито)"}`}
                      title={s.title}
                    />
                  )
                })}
              </span>
            </div>
          )
        })}
      </nav>
    </header>
  )
}
