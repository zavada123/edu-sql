import { useRef, type KeyboardEvent, type ReactNode } from "react"
import { tokenize } from "./highlight.ts"

interface Props {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly onRun: () => void
  /** Called with a function that inserts text at the cursor, for the word buttons and the schema. */
  readonly inserterRef: { current: ((text: string) => void) | null }
  /** Shown in the title bar of the editor window. */
  readonly title: string
  /** Buttons under the editor: Run and others. */
  readonly toolbar: ReactNode
}

/** Words for one tap on a phone, where typing SQL is slow. */
const CHIPS = ["SELECT", "*", "FROM", "WHERE", "AND", "=", ">=", "''", "ORDER BY", "DESC", "LIMIT", "LIKE", "'%%'", "COUNT(*)", "GROUP BY", "JOIN", "ON"]

/** A textarea over a colored copy of the same text: simple SQL coloring without a code editor library. */
export const SqlEditor = ({ value, onChange, onRun, inserterRef, title, toolbar }: Props) => {
  const area = useRef<HTMLTextAreaElement>(null)
  const back = useRef<HTMLPreElement>(null)

  const insert = (text: string) => {
    const el = area.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b } = el
    const before = value.slice(0, a)
    const pad = before === "" || /\s$/.test(before) || text.startsWith(",") ? "" : " "
    const piece = pad + text + (/^(''|'%%'|COUNT\(\*\))$/.test(text) ? "" : " ")
    const next = before + piece + value.slice(b)
    onChange(next)
    // Put the cursor inside the quotes for '' and '%%'.
    const inner = text === "''" ? 1 : text === "'%%'" ? 2 : 0
    const pos = a + piece.length - (inner > 0 ? inner : 0)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }
  inserterRef.current = insert

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onRun()
    }
  }

  const sync = () => {
    if (area.current && back.current) {
      back.current.scrollTop = area.current.scrollTop
      back.current.scrollLeft = area.current.scrollLeft
    }
  }

  return (
    <div className="edu-sql-term">
      <div className="edu-sql-term-bar">
        <span className="edu-sql-term-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="edu-sql-term-title">{title}</span>
        <span className="edu-sql-term-db" aria-hidden="true">
          SQLite
        </span>
      </div>
      <div className="edu-sql-editor">
        <pre ref={back} className="edu-sql-code" aria-hidden="true">
          {tokenize(value).map((t, i) => (
            <span key={i} className={`edu-sql-t-${t.kind}`}>
              {t.text}
            </span>
          ))}
          {"\n"}
        </pre>
        <textarea
          ref={area}
          className="edu-sql-input"
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          aria-label="Запит SQL"
          placeholder="SELECT * FROM …"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          onScroll={sync}
        />
      </div>
      <div className="edu-sql-term-tools">{toolbar}</div>
      <div className="edu-sql-chips" aria-label="Вставити слово SQL">
        {CHIPS.map((c) => (
          <button key={c} type="button" className="edu-sql-chip" onClick={() => insert(c)}>
            {c === "''" ? "' '" : c === "'%%'" ? "'% %'" : c}
          </button>
        ))}
      </div>
    </div>
  )
}
