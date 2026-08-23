import { describe, expect, test } from "bun:test"
import { formatUsageStatus } from "./status"

describe("formatUsageStatus", () => {
  test("describes an empty filtered result", () => {
    expect(formatUsageStatus([], "codex")).toBe('▣ Usage | No data received for "codex".')
  })

  test("describes when no OpenCode connections are available", () => {
    expect(formatUsageStatus([])).toBe("▣ Usage | No connected OpenCode services.")
  })

  test("shows connected services without usage APIs", () => {
    expect(
      formatUsageStatus([
        {
          timestamp: 0,
          updatedAt: 0,
          provider: "some-provider",
          displayName: "Some Provider",
          connectionLabel: "default",
          integrationID: "some-provider",
          planType: null,
          primary: null,
          secondary: null,
          codeReview: null,
          credits: null,
          isMissing: true,
          missingReason: "OpenCode does not expose a universal usage API for this integration.",
        },
      ]),
    ).toContain("[SOME PROVIDER] (default)")
  })
})
