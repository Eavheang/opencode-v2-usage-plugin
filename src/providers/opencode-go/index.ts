import type { UsageProvider } from "../base"
import type { UsageSnapshot } from "../../types"
import { fetchOpenCodeGoUsage } from "./fetch"
import type { OpenCodeGoAuth } from "./types"

export const OpenCodeGoProvider: UsageProvider<OpenCodeGoAuth> = {
  id: "opencode-go",
  displayName: "OpenCode Go",
  usageEndpoint: "https://opencode.ai/zen/go/v1/usage",

  async fetchUsage(auth, options): Promise<UsageSnapshot | null> {
    if (!auth?.key) return null
    const response = await fetchOpenCodeGoUsage(auth.key, options?.signal, options?.timeoutMs)
    if (!response) return null

    const now = Date.now()
    return {
      timestamp: now,
      updatedAt: now,
      provider: "opencode-go",
      planType: "go",
      primary: null,
      secondary: null,
      codeReview: null,
      credits: null,
      opencodeGoQuota: response.usage,
    }
  },
}

export type { OpenCodeGoAuth } from "./types"
