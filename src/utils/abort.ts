export function linkAbortSignal(signal?: AbortSignal): {
  signal: AbortSignal
  abort: () => void
  cleanup: () => void
} {
  const controller = new AbortController()
  if (!signal) return { signal: controller.signal, abort: () => controller.abort(), cleanup: () => {} }

  const abort = () => controller.abort()
  if (signal.aborted) abort()
  else signal.addEventListener("abort", abort, { once: true })

  return {
    signal: controller.signal,
    abort: () => controller.abort(),
    cleanup: () => signal.removeEventListener("abort", abort),
  }
}
