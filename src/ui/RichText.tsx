import { tokenize } from "./highlight.ts"

/** Splits a text of a case into plain parts and SQL parts. SQL is marked with `backticks`. */
export const splitSql = (text: string): { readonly sql: boolean; readonly text: string }[] =>
  text
    .split("`")
    .map((part, i) => ({ sql: i % 2 === 1, text: part }))
    .filter((p) => p.text !== "")

/** SQL in a line of text: a dark chip with the same colors as the editor. */
export const SqlCode = ({ code }: { readonly code: string }) => (
  <code className="edu-sql-inline">
    {tokenize(code).map((t, i) => (
      <span key={i} className={`edu-sql-t-${t.kind}`}>
        {t.text}
      </span>
    ))}
  </code>
)

/** A text of a case where SQL in `backticks` is shown as code, so that it is not mixed with the words around it. */
export const RichText = ({ text }: { readonly text: string }) => (
  <>{splitSql(text).map((p, i) => (p.sql ? <SqlCode key={i} code={p.text} /> : <span key={i}>{p.text}</span>))}</>
)
