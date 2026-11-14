import { useState } from "react"
import { plural, type ResultTable } from "../../core/index.ts"
import { resultToCsv, resultToTsv, SANDBOX_MAX_ROWS, type StatementResult } from "../../sandbox/index.ts"
import { RichText } from "../RichText.tsx"
import { downloadFile } from "./download.ts"

/** What the results panel shows after a run. */
export type RunView =
  | { readonly kind: "none" }
  | { readonly kind: "results"; readonly results: readonly StatementResult[] }
  /** A message without statements: a timeout, an undo, a loaded file. */
  | { readonly kind: "note"; readonly tone: "info" | "error"; readonly text: string }

/** Rows that the page renders at first; the student can show more. */
const PAGE_ROWS = 200

const short = (sql: string): string => {
  const one = sql.replace(/\s+/g, " ").trim()
  return one.length > 70 ? `${one.slice(0, 70)}…` : one
}

const DataTable = ({ table, truncated }: { readonly table: ResultTable; readonly truncated: boolean }) => {
  const [shown, setShown] = useState(PAGE_ROWS)
  const [copied, setCopied] = useState(false)
  const { columns, rows } = table
  const copy = () => {
    navigator.clipboard?.writeText(resultToTsv(table)).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      },
      () => setCopied(false)
    )
  }
  return (
    <div className="edu-sql-result">
      <div className="edu-sql-result-meta">
        <span className="edu-sql-badge">
          {truncated ? `перші ${SANDBOX_MAX_ROWS}` : rows.length} {plural(rows.length, "рядок", "рядки", "рядків")}
        </span>
        <span>
          {columns.length} {plural(columns.length, "стовпець", "стовпці", "стовпців")}
        </span>
        <span className="edu-sql-sb-spacer" />
        <button type="button" className="edu-sql-sb-mini" onClick={copy} title="Скопіювати таблицю, щоб вставити в Excel або Google Таблиці">
          {copied ? "✓ Скопійовано" : "⧉ Копіювати"}
        </button>
        <button
          type="button"
          className="edu-sql-sb-mini"
          onClick={() => downloadFile("результат.csv", resultToCsv(table), "text/csv;charset=utf-8")}
          title="Завантажити таблицю як .csv для Excel"
        >
          ⬇ CSV
        </button>
      </div>
      {truncated && (
        <p className="edu-sql-sb-warn">
          Запит повертає понад {SANDBOX_MAX_ROWS} рядків, тож показано лише перші. Додай <code>WHERE</code> або <code>LIMIT</code>.
        </p>
      )}
      {rows.length > 0 ? (
        <div className="edu-sql-table-scroll">
          <table className="edu-sql-table">
            <thead>
              <tr>
                <th className="edu-sql-rownum" aria-label="Номер рядка">
                  #
                </th>
                {columns.map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, shown).map((r, i) => (
                <tr key={i}>
                  <td className="edu-sql-rownum">{i + 1}</td>
                  {r.map((v, j) => (
                    <td key={j} className={v === null ? "edu-sql-null" : typeof v === "number" ? "edu-sql-num" : undefined} title={typeof v === "string" && v.length > 40 ? v : undefined}>
                      {v === null ? "NULL" : String(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="edu-sql-placeholder">Жодного рядка: таблиця порожня або жоден рядок не підійшов під умову.</p>
      )}
      {rows.length > shown && (
        <button type="button" className="edu-sql-btn edu-sql-btn-ghost edu-sql-sb-more" onClick={() => setShown(shown + 500)}>
          Показати ще {Math.min(500, rows.length - shown)} з {rows.length - shown}
        </button>
      )}
    </div>
  )
}

const ErrorBox = ({ result }: { readonly result: Extract<StatementResult, { kind: "error" }> }) => (
  <div className="edu-sql-error" role="alert">
    <strong>Помилка в рядку {result.line}</strong>
    <p>
      <RichText text={result.message} />
    </p>
    <details className="edu-sql-sb-raw">
      <summary>Що написав SQLite</summary>
      <code>{result.raw}</code>
      <code className="edu-sql-sb-stmt">{short(result.sql)}</code>
    </details>
  </div>
)

/** Results of every statement: a tab for each table and a log of all statements. */
export const SandboxResults = ({ view }: { readonly view: RunView }) => {
  const [picked, setPicked] = useState<{ readonly view: RunView; readonly tab: number } | null>(null)
  if (view.kind === "none")
    return (
      <div className="edu-sql-placeholder">
        <span aria-hidden="true">🗄️</span>
        <p>
          Тут з'являться результати. Напиши запит і натисни «Виконати все» (Ctrl + Enter). Кілька запитів розділяй крапкою з комою <code>;</code>.
        </p>
      </div>
    )
  if (view.kind === "note")
    return (
      <div className={view.tone === "error" ? "edu-sql-error" : "edu-sql-sb-note"} role={view.tone === "error" ? "alert" : "status"}>
        <RichText text={view.text} />
      </div>
    )
  const tables = view.results.flatMap((r, i) => (r.kind === "table" ? [{ r, i }] : []))
  const error = view.results.find((r) => r.kind === "error")
  const logTab = tables.length
  const defaultTab = error || tables.length === 0 ? logTab : tables.length - 1
  const tab = picked && picked.view === view ? picked.tab : defaultTab
  const current = tables[tab]
  return (
    <div className="edu-sql-sb-results">
      {error?.kind === "error" && <ErrorBox result={error} />}
      {(tables.length > 0 || view.results.length > 1) && (
        <div className="edu-sql-sb-rtabs" role="tablist" aria-label="Результати запитів">
          {tables.map(({ r }, n) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={tab === n}
              className={tab === n ? "is-on" : ""}
              onClick={() => setPicked({ view, tab: n })}
              title={short(r.sql)}
            >
              ▦ Таблиця {n + 1} <small>рядок {r.line}</small>
            </button>
          ))}
          <button type="button" role="tab" aria-selected={tab === logTab} className={tab === logTab ? "is-on" : ""} onClick={() => setPicked({ view, tab: logTab })}>
            ☰ Журнал <small>{view.results.length}</small>
          </button>
        </div>
      )}
      {current?.r.kind === "table" ? (
        <DataTable key={`${tab}-${current.i}`} table={current.r.table} truncated={current.r.truncated} />
      ) : (
        <ol className="edu-sql-sb-log">
          {view.results.map((r, i) => (
            <li key={i} className={`is-${r.kind}`}>
              <span className="edu-sql-sb-log-mark" aria-hidden="true">
                {r.kind === "error" ? "✗" : r.kind === "table" ? "▦" : "✓"}
              </span>
              <span className="edu-sql-sb-log-line">рядок {r.line}</span>
              <span className="edu-sql-sb-log-text">
                {r.kind === "change"
                  ? r.message
                  : r.kind === "table"
                    ? `Таблиця: ${r.table.rows.length} ${plural(r.table.rows.length, "рядок", "рядки", "рядків")}`
                    : "Помилка, далі запити не виконувались"}
              </span>
              <code>{short(r.sql)}</code>
            </li>
          ))}
          {view.results.length === 0 && <li className="is-change">Немає жодного запиту: текст порожній або лише коментарі.</li>}
        </ol>
      )}
    </div>
  )
}
