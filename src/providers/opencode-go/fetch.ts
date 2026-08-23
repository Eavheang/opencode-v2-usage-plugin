import { openCodeGoUsageResponseSchema, type OpenCodeGoUsageResponse } from "./types"
import { linkAbortSignal } from "../../utils/abort"

const USAGE_ENDPOINT = "https://opencode.ai/zen/go/v1/usage"
const REQUEST_TIMEOUT_MS = 5000

export async function fetchOpenCodeGoUsage(
  key: string,
  signal?: AbortSignal,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<OpenCodeGoUsageResponse | null> {
  const linked = linkAbortSignal(signal)
  const timeout = setTimeout(() => linked.abort(), timeoutMs)

  try {
    const response = await fetch(USAGE_ENDPOINT, {
      headers: { Authorization: `Bearer ${key}` },
      signal: linked.signal,
    })
    if (!response.ok) return null

    const data = await response.json().catch(() => null)
    const parsed = openCodeGoUsageResponseSchema.safeParse(data)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
    linked.cleanup()
  }
}

export { USAGE_ENDPOINT }
