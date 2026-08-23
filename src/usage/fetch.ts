/**
 * Fetches usage for connections currently known by OpenCode V2.
 */

import type { ConnectionInfo, IntegrationApi, IntegrationInfo } from "@opencode-ai/client"
import type { Credential } from "@opencode-ai/plugin"
import type { UsageSnapshot } from "../types"
import { providers } from "../providers"
import { loadUsageConfig } from "./config"
import { providerIDForIntegration, resolveIntegrationAuth } from "./registry"

type IntegrationContext = Pick<IntegrationApi, "list"> & {
  connection: {
    resolve: (connection: ConnectionInfo) => Promise<Credential.Value | undefined>
  }
}

type UsageTarget = {
  integration: IntegrationInfo
  connection: ConnectionInfo
  providerID?: string
}

const providerAliases: Record<string, string> = {
  codex: "codex",
  openai: "codex",
  gpt: "codex",
  anthropic: "anthropic",
  claude: "anthropic",
  copilot: "copilot",
  github: "copilot",
  "github-copilot": "copilot",
  zai: "zai-coding-plan",
  glm: "zai-coding-plan",
  "zai-coding-plan": "zai-coding-plan",
  openrouter: "openrouter",
  or: "openrouter",
  go: "opencode-go",
  "opencode-go": "opencode-go",
  zen: "opencode",
  opencode: "opencode",
  proxy: "proxy",
  agy: "proxy",
  gemini: "proxy",
}

export async function fetchUsageSnapshots(
  integration: IntegrationContext,
  filter?: string,
): Promise<UsageSnapshot[]> {
  const target = resolveFilter(filter)
  const config = await loadUsageConfig().catch(() => null)
  const toggles = config?.providers ?? {}
  const timeoutMs = normalizeTimeout(config?.timeout)

  if (target === "proxy") return fetchProxySnapshot(toggles.proxy !== false, timeoutMs)

  let integrations: IntegrationInfo[]
  try {
    integrations = (await withTimeout((signal) => integration.list(undefined, { signal }), timeoutMs)).data
  } catch {
    return [unavailableSnapshot("opencode", "OpenCode integrations could not be listed.", "OpenCode")]
  }

  const targets: UsageTarget[] = integrations.flatMap((item) =>
    item.connections.map((connection) => ({
      integration: item,
      connection,
      providerID: providerIDForIntegration(item.id),
    })),
  )
  const selected = targets.filter(({ integration: item, providerID }) => {
    if (!isEnabled(item.id, providerID, toggles)) return false
    return !target || matchesFilter(target, item, providerID)
  })

  return Promise.all(
    deduplicateZaiTargets(selected).map((item) => fetchConnectionUsage(integration, item, timeoutMs)),
  )
}

function resolveFilter(filter: unknown): string | undefined {
  const normalized = typeof filter === "string" ? filter.toLowerCase().trim() : ""
  if (!normalized) return undefined
  return providerAliases[normalized] ?? normalized
}

export function resolveProviderFilter(filter?: unknown): string | undefined {
  return resolveFilter(filter)
}

function matchesFilter(target: string, integration: IntegrationInfo, providerID?: string): boolean {
  return (
    target === integration.id.toLowerCase() ||
    target === integration.name.toLowerCase() ||
    target === providerID
  )
}

function isEnabled(
  integrationID: string,
  providerID: string | undefined,
  toggles: Record<string, boolean | undefined>,
): boolean {
  return toggles[integrationID] !== false && (!providerID || toggles[providerID] !== false)
}

async function fetchConnectionUsage(
  context: IntegrationContext,
  target: {
    integration: IntegrationInfo
    connection: ConnectionInfo
    providerID?: string
  },
  timeoutMs: number,
): Promise<UsageSnapshot> {
  const { integration, connection, providerID } = target
  const metadata = {
    integrationID: integration.id,
    displayName: integration.name,
    connectionID: connection.type === "credential" ? connection.id : connection.name,
    connectionLabel: connection.type === "credential" ? connection.label : connection.name,
  }

  if (!providerID) {
    return unavailableSnapshot(
      integration.id,
      "OpenCode does not expose a universal usage API for this integration.",
      integration.name,
      metadata,
      "unsupported",
    )
  }

  let credential: Credential.Value | undefined
  try {
    credential = await withTimeout(() => context.connection.resolve(connection), timeoutMs)
  } catch {
    return unavailableSnapshot(integration.id, "OpenCode credential could not be resolved.", integration.name, metadata)
  }

  if (!credential) {
    return unavailableSnapshot(integration.id, "OpenCode credential could not be resolved.", integration.name, metadata)
  }

  const resolved = resolveIntegrationAuth(integration.id, credential)
  if (resolved.kind === "unsupported") {
    return unavailableSnapshot(integration.id, resolved.reason, integration.name, metadata, "unsupported")
  }

  const provider = providers[resolved.value.providerID]
  if (!provider?.fetchUsage) {
    return unavailableSnapshot(
      integration.id,
      "Usage adapter is not registered.",
      integration.name,
      metadata,
      "unsupported",
    )
  }

  const fetchUsage = provider.fetchUsage
  try {
    const snapshot = await withTimeout(
      (signal) => fetchUsage(resolved.value.auth, { signal, timeoutMs }),
      timeoutMs,
    )
    if (!snapshot) {
      return unavailableSnapshot(
        integration.id,
        "Usage endpoint returned no usable data.",
        integration.name,
        metadata,
      )
    }
    return { ...snapshot, ...metadata }
  } catch {
    return unavailableSnapshot(integration.id, "Usage request failed.", integration.name, metadata)
  }
}

async function fetchProxySnapshot(enabled: boolean, timeoutMs: number): Promise<UsageSnapshot[]> {
  if (!enabled) return []

  try {
    const snapshot = await withTimeout(
      (signal) => providers.proxy.fetchUsage?.(undefined, { signal, timeoutMs }) ?? Promise.resolve(null),
      timeoutMs,
    )
    return snapshot ? [snapshot] : [unavailableSnapshot("proxy", "Proxy usage endpoint returned no usable data.", "Proxy")]
  } catch {
    return [unavailableSnapshot("proxy", "Proxy usage request failed.", "Proxy")]
  }
}

async function withTimeout<T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      task(controller.signal),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort()
          reject(new Error("Usage request timed out"))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function normalizeTimeout(timeout: number | undefined): number {
  return typeof timeout === "number" && Number.isFinite(timeout) && timeout > 0 ? timeout : 10000
}

function deduplicateZaiTargets(targets: UsageTarget[]): UsageTarget[] {
  const result: UsageTarget[] = []
  const indexes = new Map<string, number>()

  for (const target of targets) {
    if (target.providerID !== "zai-coding-plan") {
      result.push(target)
      continue
    }

    const connectionKey =
      target.connection.type === "env"
        ? `env:${target.connection.name}`
        : `credential:${target.connection.id}`
    const existingIndex = indexes.get(connectionKey)
    if (existingIndex === undefined) {
      indexes.set(connectionKey, result.length)
      result.push(target)
      continue
    }

    const existing = result[existingIndex]
    if (existing.integration.id !== "zai-coding-plan" && target.integration.id === "zai-coding-plan") {
      result[existingIndex] = target
    }
  }

  return result
}

function unavailableSnapshot(
  provider: string,
  reason: string,
  displayName: string,
  metadata: Partial<UsageSnapshot> = {},
  missingKind: UsageSnapshot["missingKind"] = "unavailable",
): UsageSnapshot {
  const now = Date.now()
  return {
    timestamp: now,
    updatedAt: now,
    provider,
    planType: null,
    primary: null,
    secondary: null,
    codeReview: null,
    credits: null,
    isMissing: true,
    missingKind,
    missingReason: reason,
    displayName,
    ...metadata,
  }
}
