/**
 * providers/copilot/index.ts
 * Main entry point for the GitHub Copilot usage provider.
 */

import type { UsageProvider } from "../base.js"
import type { UsageSnapshot, CopilotQuota } from "../../types.js"
import {
  toCopilotQuotaFromInternal,
  type CopilotInternalUserResponse,
} from "./response.js"
import type { CopilotAuthData } from "./types.js"
import { linkAbortSignal } from "../../utils/abort.js"

const GITHUB_API_BASE_URL = "https://api.github.com"
const COPILOT_INTERNAL_USER_URL = `${GITHUB_API_BASE_URL}/copilot_internal/user`
const COPILOT_TOKEN_EXCHANGE_URL = `${GITHUB_API_BASE_URL}/copilot_internal/v2/token`

const COPILOT_VERSION = "0.35.0"
const EDITOR_VERSION = "vscode/1.107.0"
const EDITOR_PLUGIN_VERSION = `copilot-chat/${COPILOT_VERSION}`
const USER_AGENT = `GitHubCopilotChat/${COPILOT_VERSION}`

const COPILOT_HEADERS: Record<string, string> = {
  "User-Agent": USER_AGENT,
  "Editor-Version": EDITOR_VERSION,
  "Editor-Plugin-Version": EDITOR_PLUGIN_VERSION,
  "Copilot-Integration-Id": "vscode-chat",
}

const REQUEST_TIMEOUT_MS = 3000

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
  signal?: AbortSignal,
): Promise<Response> {
  const linked = linkAbortSignal(signal)
  const timeoutId = setTimeout(() => linked.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: linked.signal,
    })
  } finally {
    clearTimeout(timeoutId)
    linked.cleanup()
  }
}

async function exchangeForCopilotToken(
  oauthToken: string,
  signal?: AbortSignal,
  timeoutMs?: number,
): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(COPILOT_TOKEN_EXCHANGE_URL, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${oauthToken}`,
        ...COPILOT_HEADERS,
      },
    }, timeoutMs, signal)

    if (!response.ok) return null
    const data = (await response.json()) as { token: string }
    return data.token
  } catch {
    return null
  }
}

export const CopilotProvider: UsageProvider<CopilotAuthData> = {
  id: "copilot",
  displayName: "GitHub Copilot",

  async fetchUsage(auth, options): Promise<UsageSnapshot | null> {
    const now = Date.now()
    let quota: CopilotQuota | null = null

    const oauthToken = auth?.refresh || auth?.access || auth?.key
    if (oauthToken) {
      try {
        let resp = await fetchWithTimeout(COPILOT_INTERNAL_USER_URL, {
          headers: {
            Accept: "application/json",
            Authorization: `token ${oauthToken}`,
            ...COPILOT_HEADERS,
          },
        }, options?.timeoutMs, options?.signal)

        if (!resp.ok) {
          const copilotToken = await exchangeForCopilotToken(oauthToken, options?.signal, options?.timeoutMs)
          if (copilotToken) {
            resp = await fetchWithTimeout(COPILOT_INTERNAL_USER_URL, {
              headers: {
                Accept: "application/json",
                Authorization: `Bearer ${copilotToken}`,
                ...COPILOT_HEADERS,
              },
            }, options?.timeoutMs, options?.signal)
          }
        }

        if (resp.ok) {
          const data = (await resp.json()) as CopilotInternalUserResponse
          quota = toCopilotQuotaFromInternal(data)
        }
      } catch {
      }
    }

    if (!quota) return null

    return {
      timestamp: now,
      provider: "copilot",
      planType: null,
      primary: null,
      secondary: null,
      codeReview: null,
      credits: null,
      copilotQuota: quota,
      updatedAt: now,
    }
  },
}
