import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react"
import { practiceFor, practiceSets } from "../../core/index.ts"
import {
  decodeText,
  encodeShare,
  formatBytes,
  InlineClient,
  isSqliteFile,
  MAX_DATABASE_BYTES,
  MAX_TEXT_FILE_BYTES,
  MAX_UNDO_DATABASE_BYTES,
  quoteName,
  templateById,
  templates,
  UndoStack,
  WorkerClient,
  type DatabaseSource,
  type DatabaseState,
  type SandboxClient,
  type SandboxResponse,
  type SchemaTable,
  type SharedQueries,
  type StatementResult,
  type Template
} from "../../sandbox/index.ts"
import { copyLink } from "../copy-link.ts"
import { loadSql } from "../loadSql.ts"
import { SqlEditor, type EditorSelection } from "../SqlEditor.tsx"
import { useFullScreen } from "../useFullScreen.ts"
import { CsvWizard } from "./CsvWizard.tsx"
import { downloadFile, fileBase } from "./download.ts"
import { SandboxResults, type RunView } from "./SandboxResults.tsx"
import { SandboxPractice } from "./SandboxPractice.tsx"
import { SandboxHistory, SandboxSchema } from "./SandboxSchema.tsx"
import type { SandboxSnapshot } from "./snapshot.ts"
import "../sql.css"
import "./sandbox.css"

export interface SqlSandboxProps {
  /**
   * Starts the Web Worker of the sandbox (`import "edu-sql/worker"` in a worker file of the host app). With a worker a
   * long query stops after 5 seconds; without it the database runs on the page.
   */
  readonly createWorker?: (() => Worker) | undefined
  /** The saved database to continue. */
  readonly initial?: SandboxSnapshot | undefined
  /** The editor text and the template from a share link. It wins over `initial`. */
  readonly shared?: SharedQueries | undefined
  /** After every change of the data, the editor text or the name. The host saves it (with a pause). */
  readonly onChange?: ((snapshot: SandboxSnapshot) => void) | undefined
  /**
   * The student opened another database (a template, a file, a share link), not the saved one from `initial`.
   * Comes before the `onChange` of the new database, so a host with several saved databases starts a new record.
   */
  readonly onNewDatabase?: (() => void) | undefined
  /** Save status of the host, for example «Збережено в кабінеті». */
  readonly saveStatus?: ReactNode
  /** Extra buttons of the host in the toolbar, for example «Мої бази». */
  readonly toolbarExtra?: ReactNode
  /**
   * The link for a share hash (`#sql=…`): now or later (a short link from a server; the promise must not fail).
   * By default this page with the hash.
   */
  readonly shareUrl?: ((hash: string) => string | Promise<string>) | undefined
}

const defaultShareUrl = (hash: string): string => `${window.location.href.replace(/#.*$/, "")}${hash}`

/** SQL words for one tap on a phone. */
const CHIPS = [
  "SELECT",
  "*",
  "FROM",
  "WHERE",
  "AND",
  "ORDER BY",
  "GROUP BY",
  "COUNT(*)",
  "JOIN",
  "ON",
  "LIMIT",
  "CREATE TABLE",
  "INTEGER",
  "TEXT",
  "PRIMARY KEY",
  "INSERT INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE FROM",
  "''",
  "=",
  ",",
  ";"
] as const

/** Session history keeps this many queries. */
const MAX_HISTORY = 30

type Side = "schema" | "history" | "practice"
type MobileTab = "query" | "result" | "schema" | "practice"
type Csv = { readonly fileName: string; readonly bytes: Uint8Array }

const extension = (name: string): string => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ""

const shiftLines = (results: readonly StatementResult[], startLine: number): StatementResult[] =>
  results.map((r) => ({ ...r, line: r.line + startLine - 1 }))

/** A table name for SQL: quotes only when the name needs them. */
const sqlName = (name: string): string => (/^[\p{L}_][\p{L}\p{N}_]*$/u.test(name) ? name : quoteName(name))

const starterFor = (schema: readonly SchemaTable[]): string => {
  const first = schema[0]
  return first ? `SELECT * FROM ${sqlName(first.name)} LIMIT 20;\n` : ""
}

const failureText = (res: SandboxResponse): string =>
  res.kind === "failed"
    ? res.message
    : res.kind === "timeout"
      ? `Запит виконувався довше за ${res.seconds} с, тому його зупинено. Можливо, \`WITH RECURSIVE\` не має умови зупинки або таблиці з'єднано без \`ON\`. База повернулася до стану після останньої зміни.`
      : ""

/**
 * A free SQL window: the student creates or opens a database and runs any queries. The «Завдання» tab has practice
 * tasks with a check (`practiceSets`), without scores.
 */
export const SqlSandbox = ({ createWorker, initial, shared, onChange, onNewDatabase, saveStatus, toolbarExtra, shareUrl = defaultShareUrl }: SqlSandboxProps) => {
  const [client, setClient] = useState<SandboxClient>()
  const [hasDb, setHasDb] = useState(false)
  const [starting, setStarting] = useState(true)
  const [choosing, setChoosing] = useState(false)
  const [name, setName] = useState(initial?.name ?? "")
  const [template, setTemplate] = useState(initial?.template ?? "")
  const [queries, setQueries] = useState(initial?.queries ?? "")
  const [image, setImage] = useState<Uint8Array | null>(null)
  const [size, setSize] = useState(0)
  const [schema, setSchema] = useState<readonly SchemaTable[]>([])
  const [view, setView] = useState<RunView>({ kind: "none" })
  const [undo, setUndo] = useState(() => new UndoStack())
  const [history, setHistory] = useState<readonly string[]>([])
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [side, setSide] = useState<Side>("schema")
  const [mobile, setMobile] = useState<MobileTab>("query")
  const [csv, setCsv] = useState<Csv | null>(null)
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState("")
  const inserter = useRef<((text: string) => void) | null>(null)
  const selection = useRef<(() => EditorSelection) | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const csvInput = useRef<HTMLInputElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const imageRef = useRef<Uint8Array | null>(null)
  const screen = useFullScreen(root)

  useEffect(() => {
    const c: SandboxClient = createWorker ? new WorkerClient(createWorker) : new InlineClient(loadSql())
    setClient(c)
    return () => c.dispose()
  }, [createWorker])

  /** Takes the new state of the database. A changed image goes to the undo stack first. */
  const applyState = useCallback((state: DatabaseState, keepUndo: boolean) => {
    setSchema(state.schema)
    setSize(state.size)
    setSaveError(state.saveError)
    if (!state.image) return
    const before = imageRef.current
    if (keepUndo && before && before.length <= MAX_UNDO_DATABASE_BYTES) setUndo((u) => u.push(before))
    imageRef.current = state.image
    setImage(state.image)
  }, [])

  const flash = (text: string) => {
    setNotice(text)
    window.setTimeout(() => setNotice((n) => (n === text ? "" : n)), 2500)
  }

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onNewRef = useRef(onNewDatabase)
  onNewRef.current = onNewDatabase

  /** Opens a new database. Returns false when the source could not be opened (the old database stays). */
  const openDatabase = useCallback(
    async (
      source: DatabaseSource,
      next: { readonly name: string; readonly template: string; readonly queries: string | null; readonly saved: boolean }
    ): Promise<boolean> => {
      if (!client) return false
      setBusy(true)
      const res = await client.request({ kind: "open", source })
      setBusy(false)
      if (res.kind !== "opened") {
        setView({ kind: "note", tone: "error", text: failureText(res) })
        return false
      }
      if (!next.saved) onNewRef.current?.()
      setUndo(new UndoStack())
      imageRef.current = null
      applyState(res.state, false)
      setHasDb(true)
      setChoosing(false)
      setName(next.name)
      setTemplate(next.template)
      setQueries(next.queries ?? starterFor(res.state.schema))
      const errors = res.exec?.results.filter((r) => r.kind === "error") ?? []
      setView(errors.length > 0 && res.exec ? { kind: "results", results: res.exec.results } : { kind: "none" })
      setMobile("query")
      return true
    },
    [client, applyState]
  )

  const openTemplate = (t: Template, queriesText: string | null = null) =>
    openDatabase(t.setup === "" ? { kind: "empty" } : { kind: "script", sql: t.setup }, { name: t.title, template: t.id, queries: queriesText ?? t.starter, saved: false })

  // First open: a share link, then the saved database, else the start screen.
  useEffect(() => {
    if (!client) return
    let alive = true
    const first = async () => {
      if (shared) {
        const t = templateById(shared.template) ?? templates[0]
        if (t) await openDatabase(t.setup === "" ? { kind: "empty" } : { kind: "script", sql: t.setup }, { name: t.title, template: t.id, queries: shared.queries, saved: false })
      } else if (initial?.image) {
        const ok = await openDatabase({ kind: "image", bytes: initial.image }, { name: initial.name, template: initial.template, queries: initial.queries, saved: true })
        if (!ok) setChoosing(true)
      } else setChoosing(true)
      if (alive) setStarting(false)
    }
    void first()
    return () => {
      alive = false
    }
    // Only once per client: later changes of `initial` come from our own onChange.
  }, [client])

  // The host saves every change.
  useEffect(() => {
    if (hasDb) onChangeRef.current?.({ name, template, queries, image })
  }, [hasDb, name, template, queries, image])

  /** Runs SQL on the live database. `startLine` is the editor line of the first character. */
  const runSql = useCallback(
    async (text: string, startLine: number, remember: boolean): Promise<readonly StatementResult[] | null> => {
      if (!client || busy) return null
      setBusy(true)
      const res = await client.request({ kind: "exec", sql: text })
      setBusy(false)
      setMobile("result")
      if (remember && text.trim() !== "") setHistory((h) => [text, ...h.filter((x) => x !== text)].slice(0, MAX_HISTORY))
      if (res.kind === "executed") {
        applyState(res.state, res.exec.changed)
        const results = shiftLines(res.exec.results, startLine)
        setView({ kind: "results", results })
        return results
      }
      setView({ kind: "note", tone: "error", text: failureText(res) })
      if (res.kind === "timeout") {
        // The worker opened the last image again: read its schema.
        const fresh = await client.request({ kind: "exec", sql: "" })
        if (fresh.kind === "executed") applyState(fresh.state, false)
      }
      return null
    },
    [client, busy, applyState]
  )

  const runAll = () => void runSql(queries, 1, true)
  const runSelected = () => {
    const sel = selection.current?.() ?? { text: "", line: 1 }
    if (sel.text.trim() === "") {
      setView({ kind: "note", tone: "info", text: "Спочатку виділи мишкою або пальцем частину тексту, яку треба виконати." })
      setMobile("result")
      return
    }
    void runSql(sel.text, sel.line, true)
  }

  /** Tasks for the open template, else the first set. */
  const practice = practiceFor(template) ?? practiceSets[0] ?? null

  const preview = (table: string) => void runSql(`SELECT * FROM ${sqlName(table)} LIMIT 100;`, 1, true)

  const doUndo = async () => {
    const top = undo.pop()
    if (!client || !top) return
    setBusy(true)
    const res = await client.request({ kind: "open", source: { kind: "image", bytes: top.image } })
    setBusy(false)
    if (res.kind !== "opened") {
      setView({ kind: "note", tone: "error", text: failureText(res) })
      return
    }
    setUndo(top.rest)
    imageRef.current = null
    applyState(res.state, false)
    setView({ kind: "note", tone: "info", text: "Останню зміну даних скасовано. База така, як була перед нею." })
  }

  const handleFile = async (file: File) => {
    const ext = extension(file.name)
    const textual = ["csv", "tsv", "txt", "sql"].includes(ext)
    const limit = textual ? MAX_TEXT_FILE_BYTES : MAX_DATABASE_BYTES
    if (file.size > limit) {
      setView({ kind: "note", tone: "error", text: `Файл «${file.name}» завеликий (${formatBytes(file.size)}). Найбільше можна ${formatBytes(limit)}.` })
      setMobile("result")
      return
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const base = file.name.replace(/\.[^.]*$/, "") || "база"
    if (isSqliteFile(bytes)) {
      await openDatabase({ kind: "image", bytes }, { name: base, template: "", queries: null, saved: false })
      return
    }
    if (ext === "csv" || ext === "tsv" || ext === "txt") {
      setCsv({ fileName: file.name, bytes })
      return
    }
    if (ext === "sql") {
      const ok = await openDatabase({ kind: "script", sql: decodeText(bytes, "auto").text }, { name: base, template: "", queries: null, saved: false })
      if (ok) flash(`Базу «${base}» створено зі скрипту`)
      return
    }
    setView({
      kind: "note",
      tone: "error",
      text: `Не знаю, як відкрити «${file.name}». Підходять бази SQLite (.sqlite, .db), скрипти .sql і таблиці .csv.`
    })
    setMobile("result")
  }

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) void handleFile(file)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  const importCsv = async (sql: string, table: string) => {
    setCsv(null)
    if (!hasDb) {
      const ok = await openDatabase({ kind: "empty" }, { name: table, template: "", queries: "", saved: false })
      if (!ok) return
    }
    const results = await runSql(sql, 1, false)
    if (results && !results.some((r) => r.kind === "error")) {
      setView({ kind: "note", tone: "info", text: `Таблицю «${table}» створено з файлу. Подивись її в панелі «Таблиці» або напиши запит.` })
      setQueries((q) => (q.trim() === "" ? `SELECT * FROM ${sqlName(table)} LIMIT 20;\n` : q))
    }
  }

  const saveSqlite = () => image && downloadFile(`${fileBase(name)}.sqlite`, image.slice(), "application/vnd.sqlite3")
  const saveDump = async () => {
    if (!client) return
    const res = await client.request({ kind: "dump" })
    if (res.kind === "dumped") downloadFile(`${fileBase(name)}.sql`, res.sql, "application/sql;charset=utf-8")
    else setView({ kind: "note", tone: "error", text: failureText(res) })
  }
  const saveQueries = () => downloadFile(`${fileBase(name)}-запити.sql`, queries, "application/sql;charset=utf-8")
  const share = async () => {
    const link = await copyLink(shareUrl(encodeShare({ template, queries })), navigator.clipboard)
    // A link to copy by hand stays on the screen: a short notice goes away before the student copies it.
    if (link.kind === "copied") flash("Посилання скопійовано. У ньому лише текст запитів і шаблон, а не твої дані.")
    else setNotice(`Скопіюй посилання: ${link.url}`)
  }

  const tooBig = size > MAX_DATABASE_BYTES
  const status = saveError ?? (tooBig ? `База завелика (${formatBytes(size)}), найбільше ${formatBytes(MAX_DATABASE_BYTES)}: її не буде збережено.` : null)

  return (
    <div
      ref={root}
      className={`edu-sql edu-sql-sb is-m-${mobile}${screen.on ? " is-full" : ""}${dragging ? " is-drag" : ""}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <input ref={fileInput} type="file" hidden accept=".sqlite,.sqlite3,.db,.db3,.sql,.csv,.tsv,.txt" onChange={onPick} />
      <input ref={csvInput} type="file" hidden accept=".csv,.tsv,.txt" onChange={onPick} />

      <header className="edu-sql-sb-bar">
        <div className="edu-sql-sb-title">
          <span className="edu-sql-sb-logo" aria-hidden="true">
            🗄️
          </span>
          {hasDb && !choosing ? (
            <input className="edu-sql-sb-name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Назва бази" spellCheck={false} maxLength={80} />
          ) : (
            <strong>SQL-пісочниця</strong>
          )}
          {hasDb && !choosing && <span className="edu-sql-sb-size">{formatBytes(size || 1)}</span>}
        </div>
        <div className="edu-sql-sb-actions">
          <button type="button" className="edu-sql-sb-tool" onClick={() => setChoosing(true)} disabled={busy || choosing}>
            ＋ <span>Нова</span>
          </button>
          <button type="button" className="edu-sql-sb-tool" onClick={() => fileInput.current?.click()} disabled={busy}>
            📂 <span>Відкрити файл</span>
          </button>
          {toolbarExtra}
          {hasDb && !choosing && (
            <>
              <button type="button" className="edu-sql-sb-tool" onClick={() => csvInput.current?.click()} disabled={busy} title="Додати таблицю з файлу .csv">
                ⊕ <span>Додати CSV</span>
              </button>
              <details className="edu-sql-sb-menu">
                <summary className="edu-sql-sb-tool">
                  💾 <span>Зберегти</span>
                </summary>
                <div className="edu-sql-sb-menu-list" onClick={(e) => e.currentTarget.parentElement?.removeAttribute("open")}>
                  <button type="button" onClick={saveSqlite} disabled={!image}>
                    Базу як файл <b>.sqlite</b>
                  </button>
                  <button type="button" onClick={() => void saveDump()}>
                    Базу як скрипт <b>.sql</b>
                  </button>
                  <button type="button" onClick={saveQueries}>
                    Текст запитів <b>.sql</b>
                  </button>
                  <button type="button" onClick={() => void share()}>
                    🔗 Посилання на запити
                  </button>
                </div>
              </details>
              <button type="button" className="edu-sql-sb-tool" onClick={() => void doUndo()} disabled={busy || undo.size === 0} title="Повернути базу до стану перед останньою зміною">
                ↶ <span>Скасувати</span>
                {undo.size > 0 && <small>{undo.size}</small>}
              </button>
            </>
          )}
          <button type="button" className="edu-sql-full-btn" onClick={screen.toggle} aria-pressed={screen.on} title={screen.on ? "Вийти з повного екрана (Esc)" : "На весь екран"}>
            <span aria-hidden="true">{screen.on ? "✕" : "⛶"}</span>
            <span className="edu-sql-full-label">{screen.on ? "Згорнути" : "На весь екран"}</span>
          </button>
        </div>
      </header>

      {(status || saveStatus || notice) && (
        <p className={`edu-sql-sb-status${status ? " is-bad" : ""}`} role="status">
          {notice || status || saveStatus}
        </p>
      )}

      {choosing || !hasDb ? (
        <section className="edu-sql-sb-start" aria-label="Вибір бази даних">
          {starting ? (
            <p className="edu-sql-placeholder">Завантажую SQLite…</p>
          ) : (
            <>
              <div className="edu-sql-sb-start-head">
                <h3>З чого почнемо?</h3>
                <p>Створи порожню базу, візьми готову з таблицями або відкрий свій файл. Усе працює просто в браузері.</p>
              </div>
              <div className="edu-sql-sb-cards">
                {templates.map((t) => (
                  <button key={t.id} type="button" className="edu-sql-sb-card" onClick={() => void openTemplate(t)} disabled={busy || !client}>
                    <span className="edu-sql-sb-card-icon" aria-hidden="true">
                      {t.icon}
                    </span>
                    <strong>{t.title}</strong>
                    <span>{t.note}</span>
                  </button>
                ))}
                <button type="button" className="edu-sql-sb-card is-file" onClick={() => fileInput.current?.click()} disabled={busy || !client}>
                  <span className="edu-sql-sb-card-icon" aria-hidden="true">
                    📂
                  </span>
                  <strong>Відкрити файл</strong>
                  <span>База SQLite (.sqlite, .db), скрипт .sql або таблиця .csv з Excel. Можна просто перетягнути файл сюди.</span>
                </button>
              </div>
              {hasDb && (
                <button type="button" className="edu-sql-btn edu-sql-btn-ghost" onClick={() => setChoosing(false)}>
                  ← Повернутися до «{name}»
                </button>
              )}
              {view.kind === "note" && view.tone === "error" && <SandboxResults view={view} />}
            </>
          )}
        </section>
      ) : (
        <>
          <div className="edu-sql-sb-mtabs" role="tablist" aria-label="Що показати">
            {(
              [
                ["query", "Запит"],
                ["result", "Результат"],
                ["schema", "Таблиці"],
                ["practice", "Завдання"]
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mobile === id}
                className={mobile === id ? "is-on" : ""}
                onClick={() => {
                  setMobile(id)
                  if (id === "schema" || id === "practice") setSide(id)
                }}
              >
                {label}
                {id === "schema" && <span className="edu-sql-badge">{schema.length}</span>}
              </button>
            ))}
          </div>
          <div className="edu-sql-sb-grid">
            <aside className="edu-sql-panel edu-sql-sb-side">
              <div className="edu-sql-tabs" role="tablist" aria-label="Бічна панель">
                <button type="button" role="tab" aria-selected={side === "schema"} className={side === "schema" ? "is-on" : ""} onClick={() => setSide("schema")}>
                  Таблиці <span className="edu-sql-badge">{schema.length}</span>
                </button>
                <button type="button" role="tab" aria-selected={side === "history"} className={side === "history" ? "is-on" : ""} onClick={() => setSide("history")}>
                  Історія
                </button>
                <button type="button" role="tab" aria-selected={side === "practice"} className={side === "practice" ? "is-on" : ""} onClick={() => setSide("practice")}>
                  Завдання
                </button>
              </div>
              <div className="edu-sql-panel-body">
                {side === "schema" ? (
                  <SandboxSchema tables={schema} onInsert={(t) => inserter.current?.(t)} onPreview={preview} disabled={busy} />
                ) : side === "practice" && practice !== null ? (
                  <SandboxPractice
                    set={practice}
                    template={template}
                    onOpenDatabase={() => {
                      const t = templateById(practice.database)
                      if (t) void openTemplate(t, queries)
                    }}
                    query={() => {
                      const sel = selection.current?.().text ?? ""
                      return sel.trim() === "" ? queries : sel
                    }}
                  />
                ) : (
                  <SandboxHistory
                    items={history}
                    onOpen={(q) => {
                      setQueries(q)
                      setMobile("query")
                    }}
                    onRun={(q) => void runSql(q, 1, true)}
                    disabled={busy}
                  />
                )}
              </div>
            </aside>
            <section className="edu-sql-sb-main">
              <div className="edu-sql-sb-editor">
                <SqlEditor
                  className="edu-sql-sb-term"
                  value={queries}
                  onChange={setQueries}
                  onRun={runAll}
                  onRunSelection={runSelected}
                  selectionRef={selection}
                  inserterRef={inserter}
                  chips={CHIPS}
                  title={`${name || "база"}.sqlite`}
                  toolbar={
                    <>
                      <button type="button" className="edu-sql-btn edu-sql-btn-run" onClick={runAll} disabled={busy || !client}>
                        <span aria-hidden="true">▶</span> Виконати все
                      </button>
                      <button type="button" className="edu-sql-btn edu-sql-btn-ghost" onClick={runSelected} disabled={busy || !client} title="Ctrl + Shift + Enter">
                        Виконати виділене
                      </button>
                      <span className="edu-sql-term-hint">{busy ? "Виконую…" : "Ctrl + Enter"}</span>
                    </>
                  }
                />
              </div>
              <div className="edu-sql-panel edu-sql-sb-out">
                <div className="edu-sql-sb-out-head">Результат</div>
                <div className="edu-sql-panel-body">
                  <SandboxResults view={view} />
                </div>
              </div>
            </section>
          </div>
        </>
      )}

      {csv && <CsvWizard fileName={csv.fileName} bytes={csv.bytes} onImport={(sql, table) => void importCsv(sql, table)} onCancel={() => setCsv(null)} />}
      {dragging && (
        <div className="edu-sql-sb-drop" aria-hidden="true">
          Відпусти файл, щоб відкрити його
        </div>
      )}
    </div>
  )
}
