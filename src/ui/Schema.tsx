import type { TableInfo } from "../core/index.ts"

interface Props {
  readonly tables: readonly TableInfo[]
  readonly onInsert: (text: string) => void
}

/** Tables and columns of the case. A tap inserts the name into the query. */
export const Schema = ({ tables, onInsert }: Props) => (
  <div className="edu-sql-schema">
    {tables.map((t) => (
      <details key={t.name} className="edu-sql-schema-table">
        <summary>
          <button type="button" className="edu-sql-name" onClick={() => onInsert(t.name)} title="Вставити назву таблиці">
            {t.name}
          </button>
          <span className="edu-sql-muted">{t.note}</span>
        </summary>
        <ul>
          {t.columns.map((c) => (
            <li key={c.name}>
              <button type="button" className="edu-sql-name" onClick={() => onInsert(c.name)} title="Вставити назву стовпця">
                {c.name}
              </button>
              <span className="edu-sql-type">{c.type}</span>
              <span className="edu-sql-muted">{c.note}</span>
            </li>
          ))}
        </ul>
      </details>
    ))}
  </div>
)
