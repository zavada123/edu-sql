import type { ColumnInfo, TableInfo } from "../core/index.ts"

interface Props {
  readonly tables: readonly TableInfo[]
  readonly onInsert: (text: string) => void
}

type KeyKind = "primary" | "foreign" | "none"

/** The column is a key when its note says so: "(ключ)" or a link like "(people.id)". */
const keyKind = (c: ColumnInfo): KeyKind => (/\(ключ\)/.test(c.note) ? "primary" : /\(\w+\.id\)/.test(c.note) ? "foreign" : "none")

/** Number of table colors in sql.css (.edu-sql-hue-0 … -4). */
const HUES = 5

const KEY_MARK: Record<KeyKind, string> = { primary: "🔑", foreign: "🔗", none: "" }
const KEY_LABEL: Record<KeyKind, string> = { primary: "ключ", foreign: "зв'язок з іншою таблицею", none: "" }

/** Tables of the case as cards. A tap on a name inserts it into the query. */
export const Schema = ({ tables, onInsert }: Props) => (
  <div className="edu-sql-schema">
    {tables.map((t, i) => (
      <article key={t.name} className={`edu-sql-schema-table edu-sql-hue-${i % HUES}`}>
        <header>
          <button type="button" className="edu-sql-name edu-sql-table-name" onClick={() => onInsert(t.name)} title="Вставити назву таблиці">
            <span aria-hidden="true">▦</span> {t.name}
          </button>
          <p>{t.note}</p>
        </header>
        <ul>
          {t.columns.map((c) => {
            const k = keyKind(c)
            return (
              <li key={c.name}>
                <span className="edu-sql-key" title={KEY_LABEL[k]} aria-label={KEY_LABEL[k]}>
                  {KEY_MARK[k]}
                </span>
                <button type="button" className="edu-sql-name" onClick={() => onInsert(c.name)} title={c.note}>
                  {c.name}
                </button>
                <span className="edu-sql-type">{c.type}</span>
                <span className="edu-sql-col-note">{c.note.replace(/\s*\((ключ|\w+\.id)\)/, "")}</span>
              </li>
            )
          })}
        </ul>
      </article>
    ))}
  </div>
)
