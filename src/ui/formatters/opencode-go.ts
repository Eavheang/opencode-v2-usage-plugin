import type { UsageSnapshot } from "../../types"
import { formatBar, formatMissingSnapshot, formatProviderHeading, formatResetSuffixISO } from "./shared"

export function formatOpenCodeGoSnapshot(snapshot: UsageSnapshot): string[] {
  const quota = snapshot.opencodeGoQuota
  if (!quota) return formatMissingSnapshot(snapshot)

  const lines = [formatProviderHeading(snapshot, "OpenCode Go")]
  for (const [label, window] of [
    ["Rolling", quota.rolling],
    ["Weekly", quota.weekly],
    ["Monthly", quota.monthly],
  ] as const) {
    const left = window.status === "rate-limited" ? 0 : Math.max(0, Math.min(100, 100 - window.percent))
    const suffix = window.status === "rate-limited" ? " (rate limited)" : formatResetSuffixISO(window.resetsAt)
    lines.push(`  ${`${label}:`.padEnd(13)} ${formatBar(left)} ${left.toFixed(0)}% left${suffix}`)
  }

  return lines
}
