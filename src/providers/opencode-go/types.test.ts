import { describe, expect, test } from "bun:test"
import { openCodeGoUsageResponseSchema } from "./types"

describe("OpenCode Go usage response", () => {
  test("accepts subscription usage windows", () => {
    const parsed = openCodeGoUsageResponseSchema.safeParse({
      usage: {
        rolling: { status: "ok", percent: 20, resetsAt: "2026-08-23T12:00:00.000Z" },
        weekly: { status: "ok", percent: 30, resetsAt: "2026-08-24T12:00:00.000Z" },
        monthly: { status: "rate-limited", percent: 100, resetsAt: "2026-09-01T12:00:00.000Z" },
      },
    })

    expect(parsed.success).toBe(true)
  })
})
