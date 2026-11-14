/** What a share link keeps: the editor text and the template. The database itself does not fit in a link. */
export interface SharedQueries {
  readonly template: string
  readonly queries: string
}

/** Prefix of the address hash: `#sql=…`. */
export const SHARE_PREFIX = "#sql="

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
}

const fromBase64Url = (text: string): Uint8Array => {
  const bin = atob(text.replaceAll("-", "+").replaceAll("_", "/"))
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
}

/** The hash part of a share link. */
export const encodeShare = (shared: SharedQueries): string =>
  SHARE_PREFIX + toBase64Url(new TextEncoder().encode(JSON.stringify({ t: shared.template, q: shared.queries })))

/** Reads a share hash; undefined when the hash is not a valid share. */
export const decodeShare = (hash: string): SharedQueries | undefined => {
  if (!hash.startsWith(SHARE_PREFIX)) return undefined
  try {
    const data: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(hash.slice(SHARE_PREFIX.length))))
    if (typeof data !== "object" || data === null || !("t" in data) || !("q" in data)) return undefined
    const { t, q } = data
    return typeof t === "string" && typeof q === "string" ? { template: t, queries: q } : undefined
  } catch {
    return undefined
  }
}
