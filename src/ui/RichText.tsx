import { Fragment } from "react"
import { tokenize } from "./highlight.ts"
import { parseRich, type RichPart } from "./rich-text.ts"

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

/** One part of a marked text (rich-text.ts). Code is SQL here, so it gets the editor colors. */
const Part = ({ part }: { readonly part: RichPart }) => {
  switch (part.kind) {
    case "text":
      return <>{part.text}</>
    case "ui":
      return <strong className="rt-ui">{part.text}</strong>
    case "code":
      return <SqlCode code={part.text} />
    case "name":
      return <span className="rt-name">«{part.text}»</span>
    case "color":
      return <span className={`rt-color rt-${part.color}`}>{part.text}</span>
    case "keys":
      return (
        <span className="rt-keys">
          {part.keys.map((key, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="rt-plus">+</span>}
              <kbd className="rt-key">{key}</kbd>
            </Fragment>
          ))}
        </span>
      )
  }
}

/**
 * A text of a case with the markup of all trainers (rich-text.ts): SQL in `backticks` is shown as code, so that it is
 * not mixed with the words around it; **кнопка** and [k]Ctrl+Enter[/k] stand out. Never sets HTML.
 */
export const RichText = ({ text }: { readonly text: string }) => (
  <>
    {parseRich(text).map((part, i) => (
      <Part key={i} part={part} />
    ))}
  </>
)
