import { describe, expect, test } from "bun:test"
import { formatUsageStatus } from "./status"

describe("formatUsageStatus", () => {
  test("describes an empty filtered result", () => {
    expect(formatUsageStatus([], "codex")).toBe('▣ Usage | No data received for "codex".')
  })
})
