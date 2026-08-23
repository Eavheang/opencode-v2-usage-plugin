import { describe, expect, test } from "bun:test"
import { resolveProviderFilter } from "./fetch"

describe("usage filter resolution", () => {
  test("treats empty and non-string arguments as no filter", () => {
    expect(resolveProviderFilter("")).toBeUndefined()
    expect(resolveProviderFilter(undefined)).toBeUndefined()
    expect(resolveProviderFilter(42)).toBeUndefined()
  })

  test("normalizes provider aliases", () => {
    expect(resolveProviderFilter(" OpenAI ")).toBe("codex")
    expect(resolveProviderFilter("go")).toBe("opencode-go")
  })
})
