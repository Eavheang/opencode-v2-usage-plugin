import { describe, expect, test } from "bun:test"
import { providerIDForIntegration, resolveIntegrationAuth } from "./registry"

describe("OpenCode integration auth", () => {
  test("maps ChatGPT OAuth to Codex usage auth", () => {
    const result = resolveIntegrationAuth("openai", {
      type: "oauth",
      methodID: "chatgpt-browser",
      refresh: "refresh",
      access: "access",
      expires: Date.now() + 60_000,
      metadata: { accountID: "account" },
    })

    expect(result).toEqual({
      kind: "supported",
      value: { providerID: "codex", auth: { access: "access", accountId: "account" } },
    })
  })

  test("rejects OpenAI API keys for ChatGPT usage", () => {
    expect(resolveIntegrationAuth("openai", { type: "key", key: "api-key" })).toEqual({
      kind: "unsupported",
      reason: "OpenAI API keys do not expose ChatGPT plan usage.",
    })
  })

  test("maps OpenCode Go keys", () => {
    expect(resolveIntegrationAuth("opencode-go", { type: "key", key: "go-key" })).toEqual({
      kind: "supported",
      value: { providerID: "opencode-go", auth: { key: "go-key" } },
    })
  })

  test("leaves unknown integrations without an adapter", () => {
    expect(providerIDForIntegration("some-provider")).toBeUndefined()
    expect(resolveIntegrationAuth("some-provider", { type: "key", key: "key" })).toEqual({
      kind: "unsupported",
      reason: "OpenCode does not expose a universal usage API for this integration.",
    })
  })
})
