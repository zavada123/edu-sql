import { useEffect, useMemo, useState } from "react"
import type { SqlJsStatic } from "sql.js"
import { checkQuery, type PracticeSet, Sandbox, verdictMessage } from "../../core/index.ts"
import { templateById } from "../../sandbox/index.ts"
import { loadSql } from "../loadSql.ts"
import { RichText } from "../RichText.tsx"

interface Props {
  readonly set: PracticeSet
  /** The template of the open database: the tasks need `set.database`. */
  readonly template: string
  /** Opens the database of the set (its template). */
  readonly onOpenDatabase: () => void
  /** The query to check: the selected text, or the whole editor. */
  readonly query: () => string
}

type Feedback = { readonly kind: "none" } | { readonly kind: "ok" } | { readonly kind: "wrong"; readonly text: string }

const storageKey = (set: PracticeSet) => `edu-sql:practice:${set.id}`

/** Solved task ids from the browser. Private windows and blocked storage give an empty list. */
const readSolved = (set: PracticeSet): readonly string[] => {
  try {
    const raw = window.localStorage.getItem(storageKey(set))
    const parsed: unknown = raw === null ? [] : JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

const writeSolved = (set: PracticeSet, solved: readonly string[]) => {
  try {
    window.localStorage.setItem(storageKey(set), JSON.stringify(solved))
  } catch {
    // The marks stay for this visit only.
  }
}

/**
 * Practice tasks of the sandbox. The check runs the query on a fresh copy of the template, so changes in the live
 * database (an `INSERT`, a dropped table) do not break it. Marks of solved tasks stay in the browser.
 */
export const SandboxPractice = ({ set, template, onOpenDatabase, query }: Props) => {
  const [solved, setSolved] = useState<readonly string[]>([])
  const [current, setCurrent] = useState(set.tasks[0]?.id ?? "")
  const [hints, setHints] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>({ kind: "none" })
  const [sql, setSql] = useState<SqlJsStatic | undefined>(undefined)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    const saved = readSolved(set)
    setSolved(saved)
    setCurrent(set.tasks.find((t) => !saved.includes(t.id))?.id ?? set.tasks[0]?.id ?? "")
  }, [set])

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

  const setup = templateById(set.database)?.setup
  const sandbox = useMemo(() => (sql && setup !== undefined ? new Sandbox(sql, setup) : undefined), [sql, setup])
  const index = set.tasks.findIndex((t) => t.id === current)
  const task = set.tasks[index]
  const next = set.tasks.slice(index + 1).find((t) => !solved.includes(t.id)) ?? set.tasks.find((t) => !solved.includes(t.id) && t.id !== current)

  const open = (id: string) => {
    setCurrent(id)
    setHints(0)
    setFeedback({ kind: "none" })
  }

  const check = () => {
    if (!task || !sandbox) return
    const text = query()
    if (text.trim() === "") {
      setFeedback({ kind: "wrong", text: "Спершу напиши запит у редакторі." })
      return
    }
    const verdict = checkQuery(sandbox, task, text)
    if (verdict.kind !== "ok") {
      setFeedback({ kind: "wrong", text: verdictMessage(verdict) })
      return
    }
    setFeedback({ kind: "ok" })
    if (!solved.includes(task.id)) {
      const all = [...solved, task.id]
      setSolved(all)
      writeSolved(set, all)
    }
  }

  return (
    <div className="edu-sql-sb-practice">
      <p className="edu-sql-sb-practice-source">{set.source}</p>
      <p className="edu-sql-sb-practice-intro">
        <RichText text={set.intro} />
      </p>
      {template !== set.database && (
        <div className="edu-sql-sb-practice-db">
          <p>Ці завдання — до бази «{templateById(set.database)?.title ?? set.database}». Відкрий її, щоб бачити ті самі таблиці.</p>
          <button type="button" className="edu-sql-btn edu-sql-btn-ghost" onClick={onOpenDatabase}>
            Відкрити базу «{templateById(set.database)?.title ?? set.database}»
          </button>
        </div>
      )}
      <p className="edu-sql-sb-practice-count">
        Виконано {solved.filter((id) => set.tasks.some((t) => t.id === id)).length} з {set.tasks.length}
      </p>
      <ol className="edu-sql-sb-practice-list">
        {set.tasks.map((t, i) => (
          <li key={t.id}>
            <button type="button" className={t.id === current ? "is-on" : ""} onClick={() => open(t.id)} aria-current={t.id === current}>
              <span aria-hidden="true">{solved.includes(t.id) ? "✅" : `${i + 1}.`}</span> {t.title}
            </button>
          </li>
        ))}
      </ol>
      {task && (
        <section className="edu-sql-sb-practice-task" aria-label="Завдання">
          <div className="edu-sql-task">
            <span className="edu-sql-task-icon" aria-hidden="true">
              🎯
            </span>
            <div>
              <strong>
                {index + 1}. {task.title}
              </strong>
              <p>
                <RichText text={task.task} />
              </p>
            </div>
          </div>
          <button type="button" className="edu-sql-btn" onClick={check} disabled={!sandbox}>
            Перевірити мій запит
          </button>
          <p className="edu-sql-term-hint">
            {loadError ? `Не вдалося завантажити SQLite: ${loadError}` : "Перевіряю виділений текст, а якщо нічого не виділено — весь редактор."}
          </p>
          {feedback.kind === "ok" && (
            <div className="edu-sql-clue is-new" role="status">
              <p>
                <span aria-hidden="true">🎉</span> Правильно!
              </p>
              {next && (
                <button type="button" className="edu-sql-btn" onClick={() => open(next.id)}>
                  Далі: {next.title} →
                </button>
              )}
            </div>
          )}
          {feedback.kind === "wrong" && (
            <p className="edu-sql-wrong" role="status">
              <span aria-hidden="true">🤔</span> <RichText text={feedback.text} />
            </p>
          )}
          {feedback.kind !== "ok" && task.hints.length > 0 && (
            <div className="edu-sql-hints">
              {task.hints.slice(0, hints).map((h, i) => (
                <p key={i} className="edu-sql-hint">
                  <span aria-hidden="true">💡</span> <RichText text={h} />
                </p>
              ))}
              {hints < task.hints.length && (
                <button type="button" className="edu-sql-link" onClick={() => setHints((n) => n + 1)}>
                  {hints === 0 ? "Потрібна підказка" : "Ще одна підказка"} ({hints + 1}/{task.hints.length})
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
