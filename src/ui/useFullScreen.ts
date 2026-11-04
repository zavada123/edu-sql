import { useCallback, useEffect, useState, type RefObject } from "react"

/**
 * Full screen for the trainer. Where the browser has the Fullscreen API, the trainer fills the screen;
 * elsewhere (Safari on iPhone) it covers the page. Esc exits in both cases.
 */
export const useFullScreen = (target: RefObject<HTMLElement | null>) => {
  const [native, setNative] = useState(false)
  const [covered, setCovered] = useState(false)

  useEffect(() => {
    const onChange = () => setNative(document.fullscreenElement !== null && document.fullscreenElement === target.current)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [target])

  // The page under the covering trainer does not scroll, and Esc closes it.
  useEffect(() => {
    if (!covered) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCovered(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener("keydown", onKey)
    }
  }, [covered])

  const toggle = useCallback(() => {
    const el = target.current
    if (!el) return
    if (native) {
      void document.exitFullscreen().catch(() => setNative(false))
      return
    }
    if (covered) {
      setCovered(false)
      return
    }
    if (typeof el.requestFullscreen === "function" && document.fullscreenEnabled) {
      el.requestFullscreen().catch(() => setCovered(true))
      return
    }
    setCovered(true)
  }, [target, native, covered])

  return { on: native || covered, toggle }
}
