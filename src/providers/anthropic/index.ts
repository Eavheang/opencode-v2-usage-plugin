import type { UsageProvider } from "../base.js"
import type { UsageSnapshot } from "../../types.js"
import { fetchAnthropicProfile, fetchAnthropicUsage } from "./fetch.js"
import { buildAnthropicQuota, inferAnthropicPlanType } from "./parse.js"
import type { AnthropicAuthData } from "./types.js"

export const AnthropicProvider: UsageProvider<AnthropicAuthData> = {
  id: "anthropic",
  displayName: "Anthropic Claude",
  usageEndpoint: "https://api.anthropic.com/api/oauth/usage",

  async fetchUsage(auth, options): Promise<UsageSnapshot | null> {
    if (!auth?.access) return null

    const [usage, profile] = await Promise.all([
      fetchAnthropicUsage(auth.access, options?.signal, options?.timeoutMs),
      fetchAnthropicProfile(auth.access, options?.signal, options?.timeoutMs),
    ])

    if (!usage) return null

    return {
      timestamp: Date.now(),
      updatedAt: Date.now(),
      provider: "anthropic",
      planType: inferAnthropicPlanType(profile),
      primary: null,
      secondary: null,
      codeReview: null,
      credits: null,
      anthropicQuota: buildAnthropicQuota(usage, profile),
    }
  },
}
