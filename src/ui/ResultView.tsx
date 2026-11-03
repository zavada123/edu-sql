import { plural, type RunResult } from "../core/index.ts"

/** Rows shown on the page; the count above the table is always the full one. */
const SHOW_ROWS = 200

export const ResultView = ({ result }: { readonly result: RunResult | undefined }) => {
  if (result === undefined)
    return (
      <div className="edu-sql-placeholder">
        <span aria-hidden="true">🔍</span>
        <p>Тут з'явиться відповідь бази даних. Напиши запит і натисни «Виконати».</p>
      </div>
    )
  if (result.kind === "error")
    return (
      <div className="edu-sql-error" role="alert">
        <strong>Помилка в запиті</strong>
        <p>{result.message}</p>
        {result.raw !== result.message && <code>{result.raw}</code>}
      </div>
    )
  if (result.kind === "empty") return <p className="edu-sql-placeholder">Запит виконано, але він не повернув таблиці.</p>
  const { columns, rows } = result.table
  return (
    <div className="edu-sql-result">
      <p className="edu-sql-result-meta">
        <span className="edu-sql-badge">
          {rows.length} {plural(rows.length, "рядок", "рядки", "рядків")}
        </span>
        <span>
          {columns.length} {plural(columns.length, "стовпець", "стовпці", "стовпців")}
          {rows.length > SHOW_ROWS ? ` · показано перші ${SHOW_ROWS}` : ""}
        </span>
      </p>
      {rows.length > 0 && (
        <div className="edu-sql-table-scroll">
          <table className="edu-sql-table">
            <thead>
              <tr>
                <th className="edu-sql-rownum" aria-label="Номер рядка">#</th>
                {columns.map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, SHOW_ROWS).map((r, i) => (
                <tr key={i}>
                  <td className="edu-sql-rownum">{i + 1}</td>
                  {r.map((v, j) => (
                    <td key={j} className={v === null ? "edu-sql-null" : typeof v === "number" ? "edu-sql-num" : undefined}>
                      {v === null ? "NULL" : String(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
