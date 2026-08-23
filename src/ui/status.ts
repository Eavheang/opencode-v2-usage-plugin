/**
 * Renders usage snapshots into readable status text.
 */

import type { UsageSnapshot } from "../types"
import { formatProxySnapshot } from "./formatters/proxy"
import { formatCopilotSnapshot } from "./formatters/copilot"
import { formatZaiSnapshot } from "./formatters/zai"
import { formatOpenRouterSnapshot } from "./formatters/openrouter"
import { formatAnthropicSnapshot } from "./formatters/anthropic"
import { formatOpenCodeGoSnapshot } from "./formatters/opencode-go"
import { formatBar, formatProviderHeading, formatResetSuffix, formatMissingSnapshot } from "./formatters/shared"

function formatSnapshot(snapshot: UsageSnapshot): string[] {
  if (snapshot.isMissing) return formatMissingSnapshot(snapshot)
  if (snapshot.provider === "proxy") return formatProxySnapshot(snapshot)
  if (snapshot.provider === "copilot") return formatCopilotSnapshot(snapshot)
  if (snapshot.provider === "zai-coding-plan") return formatZaiSnapshot(snapshot)
  if (snapshot.provider === "openrouter") return formatOpenRouterSnapshot(snapshot)
  if (snapshot.provider === "anthropic") return formatAnthropicSnapshot(snapshot)
  if (snapshot.provider === "opencode-go") return formatOpenCodeGoSnapshot(snapshot)

  const plan = snapshot.planType ? ` (${snapshot.planType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())})` : ""
  const lines = [`${formatProviderHeading(snapshot, snapshot.provider)}${plan}`]

  const metrics = [
    { label: "Hourly:", data: snapshot.primary },
    { label: "Weekly:", data: snapshot.secondary },
    { label: "Code Review:", data: snapshot.codeReview }
  ]

  let hasData = false
  for (const m of metrics) {
    if (m.data) {
      const pct = 100 - m.data.usedPercent
      lines.push(`  ${m.label.padEnd(13)} ${formatBar(pct)} ${pct.toFixed(0)}% left${formatResetSuffix(m.data.resetsAt)}`)
      hasData = true
    }
  }

  if (snapshot.credits?.hasCredits) {
    lines.push(`  Credits:      ${snapshot.credits.balance}`)
    hasData = true
  }

  return hasData ? lines : formatMissingSnapshot(snapshot)
}

export function formatUsageStatus(snapshots: UsageSnapshot[], filter?: string): string {
  if (snapshots.length === 0) {
    const filterMsg = filter ? ` for "${filter}"` : ""
    return filter ? `▣ Usage | No data received${filterMsg}.` : "▣ Usage | No connected OpenCode services."
  }

  const lines = ["▣ Usage Status", ""]
  snapshots.forEach((s, i) => {
    lines.push(...formatSnapshot(s))
    if (i < snapshots.length - 1) lines.push("", "---")
  })

  return lines.join("\n")
}
