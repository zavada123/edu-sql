import { useMemo, useState } from "react"
import {
  ColumnTypes,
  columnNames,
  CsvDelimiters,
  csvToSql,
  decodeText,
  detectDelimiter,
  guessTypes,
  parseCsv,
  tableNameFromFile,
  TextEncodings,
  type ColumnType,
  type CsvDelimiter,
  type TextEncoding
} from "../../sandbox/index.ts"

interface Props {
  readonly fileName: string
  readonly bytes: Uint8Array
  /** Gets the SQL that creates the table and fills it. */
  readonly onImport: (sql: string, table: string) => void
  readonly onCancel: () => void
}

const DELIMITER_LABEL: Record<CsvDelimiter, string> = {
  [CsvDelimiters.Comma]: "кома ,",
  [CsvDelimiters.Semicolon]: "крапка з комою ;",
  [CsvDelimiters.Tab]: "табуляція"
}

const ENCODING_LABEL: Record<TextEncoding | "auto", string> = {
  auto: "визначити самому",
  [TextEncodings.Utf8]: "UTF-8",
  [TextEncodings.Windows1251]: "Windows-1251 (старий Excel)"
}

const TYPE_LABEL: Record<ColumnType, string> = {
  [ColumnTypes.Integer]: "INTEGER · ціле",
  [ColumnTypes.Real]: "REAL · дробове",
  [ColumnTypes.Text]: "TEXT · текст"
}

const PREVIEW_ROWS = 5

/** The CSV wizard: a table name, the separator, the encoding, the header row and the column types. */
export const CsvWizard = ({ fileName, bytes, onImport, onCancel }: Props) => {
  const [encoding, setEncoding] = useState<TextEncoding | "auto">("auto")
  const decoded = useMemo(() => decodeText(bytes, encoding), [bytes, encoding])
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(() => detectDelimiter(decodeText(bytes, "auto").text))
  const [hasHeader, setHasHeader] = useState(true)
  const [table, setTable] = useState(() => tableNameFromFile(fileName))
  const parsed = useMemo(() => parseCsv(decoded.text, delimiter), [decoded.text, delimiter])
  const width = parsed.reduce((m, r) => Math.max(m, r.length), 0)
  const header = hasHeader ? (parsed[0] ?? []) : []
  const rows = hasHeader ? parsed.slice(1) : parsed
  const names = columnNames(Array.from({ length: width }, (_, i) => header[i] ?? ""))
  const guessed = useMemo(() => guessTypes(rows, width), [rows, width])
  const [types, setTypes] = useState<Record<number, ColumnType>>({})
  const typeOf = (i: number): ColumnType => types[i] ?? guessed[i] ?? ColumnTypes.Text
  const ready = width > 0 && table.trim() !== ""

  const submit = () => {
    if (!ready) return
    const name = table.trim()
    onImport(csvToSql({ table: name, columns: names, types: names.map((_, i) => typeOf(i)), rows }), name)
  }

  return (
    <div className="edu-sql-sb-dialog" role="dialog" aria-modal="true" aria-label="Імпорт таблиці з CSV">
      <div className="edu-sql-sb-dialog-box">
        <h3>Таблиця з файлу «{fileName}»</h3>
        <div className="edu-sql-sb-form">
          <label>
            Назва таблиці
            <input value={table} onChange={(e) => setTable(e.target.value)} spellCheck={false} />
          </label>
          <label>
            Роздільник
            <select value={delimiter} onChange={(e) => setDelimiter(Object.values(CsvDelimiters).find((d) => d === e.target.value) ?? CsvDelimiters.Comma)}>
              {Object.values(CsvDelimiters).map((d) => (
                <option key={d} value={d}>
                  {DELIMITER_LABEL[d]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Кодування
            <select value={encoding} onChange={(e) => setEncoding(e.target.value === "auto" ? "auto" : (Object.values(TextEncodings).find((x) => x === e.target.value) ?? "auto"))}>
              {(["auto", TextEncodings.Utf8, TextEncodings.Windows1251] as const).map((x) => (
                <option key={x} value={x}>
                  {ENCODING_LABEL[x]}
                  {x === "auto" ? ` (${decoded.encoding === TextEncodings.Utf8 ? "UTF-8" : "Windows-1251"})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="edu-sql-sb-check">
            <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
            Перший рядок містить назви стовпців
          </label>
        </div>
        <p className="edu-sql-sb-dialog-note">
          {rows.length} рядків, {width} стовпців. Перевір типи: їх визначено за значеннями, але можна змінити.
        </p>
        <div className="edu-sql-table-scroll edu-sql-sb-preview">
          <table className="edu-sql-table">
            <thead>
              <tr>
                {names.map((n, i) => (
                  <th key={i}>
                    <div>{n}</div>
                    <select
                      aria-label={`Тип стовпця ${n}`}
                      value={typeOf(i)}
                      onChange={(e) => setTypes({ ...types, [i]: Object.values(ColumnTypes).find((t) => t === e.target.value) ?? ColumnTypes.Text })}
                    >
                      {Object.values(ColumnTypes).map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                <tr key={i}>
                  {names.map((_, j) => (
                    <td key={j}>{r[j] ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="edu-sql-sb-dialog-actions">
          <button type="button" className="edu-sql-btn edu-sql-btn-ghost" onClick={onCancel}>
            Скасувати
          </button>
          <button type="button" className="edu-sql-btn edu-sql-btn-run" onClick={submit} disabled={!ready}>
            Створити таблицю
          </button>
        </div>
      </div>
    </div>
  )
}
