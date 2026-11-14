import { StrictMode, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { decodeShare } from "../sandbox/index.ts"
import { loadFromBrowser, saveToBrowser } from "../ui/sandbox/browserStore.ts"
import { SqlSandbox } from "../ui/sandbox/SqlSandbox.tsx"
import type { SandboxSnapshot } from "../ui/sandbox/snapshot.ts"
import "./demo.css"

const KEY = "demo"
const SAVE_DELAY_MS = 800

const createWorker = () => new Worker(new URL("./sandbox-worker.ts", import.meta.url), { type: "module" })
const shared = decodeShare(window.location.hash)

let timer = 0
const save = (s: SandboxSnapshot) => {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => void saveToBrowser(KEY, s).catch(() => undefined), SAVE_DELAY_MS)
}

const Demo = () => {
  const [initial, setInitial] = useState<SandboxSnapshot | undefined | "loading">("loading")
  useEffect(() => {
    void loadFromBrowser(KEY).then(setInitial)
  }, [])
  return (
    <div className="demo">
      <header className="demo-head">
        <strong>SQL-пісочниця</strong>
        <span>вільне вікно SQL у браузері</span>
        <a href="./" style={{ color: "#fbbf24" }}>
          SQL-детектив →
        </a>
      </header>
      <main className="demo-main">
        {initial === "loading" ? null : <SqlSandbox createWorker={createWorker} initial={initial} shared={shared} onChange={save} />}
      </main>
    </div>
  )
}

const root = document.getElementById("root")
if (root) createRoot(root).render(<StrictMode><Demo /></StrictMode>)
