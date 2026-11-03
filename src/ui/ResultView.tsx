import { plural, type RunResult } from "../core/index.ts"

/** Rows shown on the page; the count above the table is always the full one. */
const SHOW_ROWS = 200

export const ResultView = ({ result }: { readonly result: RunResult }) => {
  if (result.kind === "error") return <p className="edu-sql-error" role="alert">{result.message}</p>
  if (result.kind === "empty") return <p className="edu-sql-muted">Запит виконано, але він не повернув таблиці.</p>
  const { columns, rows } = result.table
  return (
    <div className="edu-sql-result">
      <p className="edu-sql-muted">
        {rows.length} {plural(rows.length, "рядок", "рядки", "рядків")}
        {rows.length > SHOW_ROWS ? `, показано перші ${SHOW_ROWS}` : ""}
      </p>
      {rows.length > 0 && (
        <div className="edu-sql-table-scroll">
          <table className="edu-sql-table">
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, SHOW_ROWS).map((r, i) => (
                <tr key={i}>
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
