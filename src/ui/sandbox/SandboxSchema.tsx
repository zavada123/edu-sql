import { plural } from "../../core/index.ts"
import type { SchemaTable } from "../../sandbox/index.ts"

interface Props {
  readonly tables: readonly SchemaTable[]
  readonly onInsert: (text: string) => void
  /** Runs `SELECT * FROM table LIMIT 100`. */
  readonly onPreview: (table: string) => void
  readonly disabled: boolean
}

/** Number of table colors in sql.css (.edu-sql-hue-0 … -5). */
const HUES = 6

/** Tables of the live database. A tap on a name inserts it into the query. */
export const SandboxSchema = ({ tables, onInsert, onPreview, disabled }: Props) =>
  tables.length === 0 ? (
    <div className="edu-sql-sb-empty-schema">
      <p>У базі ще немає таблиць.</p>
      <p>
        Створи першу: <code>CREATE TABLE назва (стовпець ТИП, …);</code> або додай файл <b>.csv</b>.
      </p>
    </div>
  ) : (
    <div className="edu-sql-sb-schema">
      {tables.map((t, i) => (
        <article key={t.name} className={`edu-sql-schema-table edu-sql-hue-${i % HUES}`}>
          <header className="edu-sql-sb-schema-head">
            <button type="button" className="edu-sql-name edu-sql-table-name" onClick={() => onInsert(t.name)} title="Вставити назву в запит">
              <span aria-hidden="true">{t.kind === "view" ? "◫" : "▦"}</span> {t.name}
            </button>
            <span className="edu-sql-sb-rows">
              {t.kind === "view" ? "подання" : `${t.rows} ${plural(t.rows, "рядок", "рядки", "рядків")}`}
            </span>
            <button type="button" className="edu-sql-sb-mini" onClick={() => onPreview(t.name)} disabled={disabled} title="Показати перші 100 рядків">
              Переглянути
            </button>
          </header>
          <ul>
            {t.columns.map((c) => (
              <li key={c.name}>
                <span className="edu-sql-key" title={c.primaryKey ? "первинний ключ" : c.references ? `зовнішній ключ → ${c.references}` : ""}>
                  {c.primaryKey ? "🔑" : c.references ? "🔗" : ""}
                </span>
                <button type="button" className="edu-sql-name" onClick={() => onInsert(c.name)}>
                  {c.name}
                </button>
                <span className="edu-sql-type">
                  {c.type || "—"}
                  {c.notNull ? " · NOT NULL" : ""}
                </span>
                {c.references && <span className="edu-sql-col-note">→ {c.references}</span>}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )

/** Queries of this session, the newest first. */
export const SandboxHistory = ({
  items,
  onOpen,
  onRun,
  disabled
}: {
  readonly items: readonly string[]
  readonly onOpen: (sql: string) => void
  readonly onRun: (sql: string) => void
  readonly disabled: boolean
}) =>
  items.length === 0 ? (
    <p className="edu-sql-sb-empty-schema">Тут будуть запити, які ти виконав(-ла) за цей сеанс.</p>
  ) : (
    <ol className="edu-sql-sb-history">
      {items.map((q, i) => (
        <li key={`${i}-${q.length}`}>
          <pre>{q.length > 400 ? `${q.slice(0, 400)}…` : q}</pre>
          <div>
            <button type="button" className="edu-sql-sb-mini" onClick={() => onOpen(q)}>
              ✎ У редактор
            </button>
            <button type="button" className="edu-sql-sb-mini" onClick={() => onRun(q)} disabled={disabled}>
              ▶ Ще раз
            </button>
          </div>
        </li>
      ))}
    </ol>
  )
