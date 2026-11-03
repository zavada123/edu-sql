interface Props {
  readonly clues: readonly string[]
  /** Open by default on the final screen, closed while the student works. */
  readonly open: boolean
}

/** Evidence board: every solved step pins a note. */
export const Notebook = ({ clues, open }: Props) =>
  clues.length === 0 ? null : (
    <details className="edu-sql-notebook" open={open}>
      <summary>
        <span aria-hidden="true">📌</span> Дошка доказів <span className="edu-sql-badge">{clues.length}</span>
      </summary>
      <ol className="edu-sql-notes">
        {clues.map((c, i) => (
          <li key={i} className="edu-sql-note" style={{ rotate: `${((i * 7) % 5) - 2}deg` }}>
            <span className="edu-sql-note-num">#{i + 1}</span>
            {c}
          </li>
        ))}
      </ol>
    </details>
  )
