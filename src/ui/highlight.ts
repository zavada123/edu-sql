/** Kinds of SQL tokens that the editor colors. */
export type TokenKind = "keyword" | "string" | "number" | "comment" | "plain"

export interface Token {
  readonly kind: TokenKind
  readonly text: string
}

const KEYWORDS = new Set(
  (
    "SELECT FROM WHERE AND OR NOT IN IS NULL LIKE BETWEEN ORDER BY ASC DESC LIMIT OFFSET GROUP HAVING " +
    "JOIN INNER LEFT RIGHT FULL OUTER CROSS ON AS DISTINCT COUNT SUM AVG MIN MAX LOWER UPPER LENGTH " +
    "UNION ALL CASE WHEN THEN ELSE END INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE DROP WITH EXISTS"
  ).split(" ")
)

const TOKEN = /(--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|('(?:[^']|'')*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]+)|([\s\S])/g

/** Splits SQL into colored tokens. Unclosed strings and comments color to the end. */
export const tokenize = (sql: string): Token[] => {
  const out: Token[] = []
  for (const m of sql.matchAll(TOKEN)) {
    const [text, comment, str, num, word] = m
    const kind: TokenKind =
      comment !== undefined ? "comment"
      : str !== undefined ? "string"
      : num !== undefined ? "number"
      : word !== undefined && KEYWORDS.has(word.toUpperCase()) ? "keyword"
      : "plain"
    const prev = out[out.length - 1]
    if (prev && prev.kind === kind && kind === "plain") out[out.length - 1] = { kind, text: prev.text + text }
    else out.push({ kind, text })
  }
  return out
}
