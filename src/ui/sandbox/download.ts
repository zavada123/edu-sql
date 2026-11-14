/** Gives the browser a file to save. */
export const downloadFile = (name: string, data: BlobPart, type: string): void => {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** A file name from the database name: no signs that file systems refuse. */
export const fileBase = (name: string): string => name.replace(/[\\/:*?"<>|]+/g, "_").trim() || "база"
