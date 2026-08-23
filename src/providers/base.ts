/**
 * Provider interface for fetching and parsing usage snapshots.
 * Each provider encapsulates its own auth and response logic.
 */

import type { UsageSnapshot } from "../types"

export interface UsageFetchOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

export interface UsageProvider<TAuth = unknown> {
  id: string
  displayName: string
  usageEndpoint?: string
  parseRateLimitHeaders?: (headers: Record<string, string>) => UsageSnapshot | null
  fetchUsage?: (auth: TAuth, options?: UsageFetchOptions) => Promise<UsageSnapshot | null>
}
