import {
  anthropicProfileResponseSchema,
  anthropicUsageResponseSchema,
  oauthUsageHeaders,
  type AnthropicProfileResponse,
  type AnthropicUsageResponse,
} from "./types.js"
import { linkAbortSignal } from "../../utils/abort.js"

const USAGE_ENDPOINT = "https://api.anthropic.com/api/oauth/usage"
const PROFILE_ENDPOINT = "https://api.anthropic.com/api/oauth/profile"
const REQUEST_TIMEOUT_MS = 5000

async function fetchOAuthJson(
  url: string,
  token: string,
  signal?: AbortSignal,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<unknown | null> {
  const linked = linkAbortSignal(signal)
  const timeout = setTimeout(() => linked.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...oauthUsageHeaders,
      },
      signal: linked.signal,
    })

    if (!response.ok) return null
    return await response.json().catch(() => null)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
    linked.cleanup()
  }
}

export async function fetchAnthropicUsage(
  token: string,
  signal?: AbortSignal,
  timeoutMs?: number,
): Promise<AnthropicUsageResponse | null> {
  const data = await fetchOAuthJson(USAGE_ENDPOINT, token, signal, timeoutMs)
  if (!data) return null
  const parsed = anthropicUsageResponseSchema.safeParse(data)
  if (!parsed.success) return null
  return parsed.data
}

export async function fetchAnthropicProfile(
  token: string,
  signal?: AbortSignal,
  timeoutMs?: number,
): Promise<AnthropicProfileResponse | null> {
  const data = await fetchOAuthJson(PROFILE_ENDPOINT, token, signal, timeoutMs)
  if (!data) return null
  const parsed = anthropicProfileResponseSchema.safeParse(data)
  if (!parsed.success) return null
  return parsed.data
}
