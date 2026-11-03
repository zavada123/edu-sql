import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import { cases, type Progress, type Report } from "../core/index.ts"
import { SqlDetective } from "../ui/SqlDetective.tsx"
import "./demo.css"

const firstCase = cases[0]
if (!firstCase) throw new Error("Немає жодної справи")

const params = new URLSearchParams(window.location.search)
/** ?embed=1 hides the demo header and sends reports to the parent page (iframe). */
const embedded = params.get("embed") === "1"
const STORAGE = `edu-sql:${firstCase.id}`

const loadProgress = (): Progress | undefined => {
  try {
    const raw = localStorage.getItem(STORAGE)
    return raw ? (JSON.parse(raw) satisfies Progress) : undefined
  } catch {
    return undefined
  }
}

const saveProgress = (p: Progress) => {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(p))
  } catch {
    // Private mode: progress lives only in this tab.
  }
}

/** In an iframe the host page listens: window.addEventListener("message", e => e.data.type === "edu-sql:report"). */
const sendToParent = (report: Report) => {
  if (window.parent !== window) window.parent.postMessage({ type: "edu-sql:report", report }, "*")
}

const Demo = () => {
  const [last, setLast] = useState<Report>()
  const onStepSolved = (r: Report) => {
    setLast(r)
    sendToParent(r)
  }
  const trainer = <SqlDetective case={firstCase} initialProgress={loadProgress()} onChange={saveProgress} onStepSolved={onStepSolved} />
  if (embedded) return trainer
  return (
    <div className="demo">
      <header className="demo-head">
        <strong>SQL-детектив</strong>
        <span>тренажер баз даних для школярів</span>
      </header>
      <main className="demo-main">
        {trainer}
        {last && (
          <details className="demo-report">
            <summary>Що отримає платформа (onStepSolved)</summary>
            <pre>{JSON.stringify({ ...last, progress: undefined }, null, 2)}</pre>
          </details>
        )}
      </main>
    </div>
  )
}

const root = document.getElementById("root")
if (root) createRoot(root).render(<StrictMode><Demo /></StrictMode>)
