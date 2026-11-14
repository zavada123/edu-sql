import type { SandboxSnapshot } from "./snapshot.ts"

const DB_NAME = "edu-sql-sandbox"
const STORE = "databases"

const openStore = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error("IndexedDB недоступна"))
  })

const isSnapshot = (v: unknown): v is SandboxSnapshot =>
  typeof v === "object" &&
  v !== null &&
  "name" in v &&
  typeof v.name === "string" &&
  "template" in v &&
  typeof v.template === "string" &&
  "queries" in v &&
  typeof v.queries === "string" &&
  "image" in v &&
  (v.image === null || v.image instanceof Uint8Array)

/**
 * Keeps the guest's database in IndexedDB of this browser: binary data of a few megabytes does not fit in
 * `localStorage`. Rejects when the browser has no IndexedDB (private mode in some browsers).
 */
export const saveToBrowser = (key: string, snapshot: SandboxSnapshot): Promise<void> =>
  openStore().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite")
        tx.objectStore(STORE).put(snapshot, key)
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error ?? new Error("Не вдалося зберегти"))
        }
      })
  )

/** The saved database, or undefined when there is none or the browser has no IndexedDB. */
export const loadFromBrowser = (key: string): Promise<SandboxSnapshot | undefined> =>
  openStore().then(
    (db) =>
      new Promise<SandboxSnapshot | undefined>((resolve) => {
        const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key)
        req.onsuccess = () => {
          db.close()
          const v: unknown = req.result
          resolve(isSnapshot(v) ? v : undefined)
        }
        req.onerror = () => {
          db.close()
          resolve(undefined)
        }
      }),
    () => undefined
  )
