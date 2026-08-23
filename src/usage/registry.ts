/**
 * Maps OpenCode V2 integration credentials to usage-provider auth values.
 */

import type { Credential } from "@opencode-ai/plugin"
import { resolveAnthropicAuth } from "../providers/anthropic/auth"
import type { AnthropicAuthData } from "../providers/anthropic/types"
import type { CodexAuth } from "../providers/codex"
import type { CopilotAuthData } from "../providers/copilot/types"
import type { OpenCodeGoAuth } from "../providers/opencode-go"
import type { OpenRouterAuth } from "../providers/openrouter/types"
import type { ZaiAuth } from "../providers/zai/types"

export type SupportedProviderAuth =
  | { providerID: "codex"; auth: CodexAuth }
  | { providerID: "anthropic"; auth: AnthropicAuthData }
  | { providerID: "copilot"; auth: CopilotAuthData }
  | { providerID: "zai-coding-plan"; auth: ZaiAuth }
  | { providerID: "openrouter"; auth: OpenRouterAuth }
  | { providerID: "opencode-go"; auth: OpenCodeGoAuth }

export type IntegrationAuthResolution =
  | { kind: "supported"; value: SupportedProviderAuth }
  | { kind: "unsupported"; reason: string }

const providerIDs: Record<string, string> = {
  openai: "codex",
  anthropic: "anthropic",
  "github-copilot": "copilot",
  zai: "zai-coding-plan",
  "zai-coding-plan": "zai-coding-plan",
  openrouter: "openrouter",
  "opencode-go": "opencode-go",
}

export function providerIDForIntegration(integrationID: string): string | undefined {
  return providerIDs[integrationID]
}

export function resolveIntegrationAuth(
  integrationID: string,
  credential: Credential.Value,
): IntegrationAuthResolution {
  if (integrationID === "openai") {
    if (credential.type !== "oauth") {
      return { kind: "unsupported", reason: "OpenAI API keys do not expose ChatGPT plan usage." }
    }

    return {
      kind: "supported",
      value: {
        providerID: "codex",
        auth: {
          access: credential.access,
          accountId: readMetadataString(credential.metadata, "accountID", "accountId"),
        },
      },
    }
  }

  if (integrationID === "anthropic") {
    const auth = resolveAnthropicAuth(credential)
    if (!auth) {
      return { kind: "unsupported", reason: "Anthropic API keys do not expose Claude subscription usage." }
    }

    return { kind: "supported", value: { providerID: "anthropic", auth } }
  }

  if (integrationID === "github-copilot") {
    return {
      kind: "supported",
      value: {
        providerID: "copilot",
        auth:
          credential.type === "oauth"
            ? { type: credential.type, access: credential.access, refresh: credential.refresh }
            : { type: credential.type, key: credential.key },
      },
    }
  }

  if (integrationID === "zai" || integrationID === "zai-coding-plan") {
    if (credential.type !== "key") {
      return { kind: "unsupported", reason: "Z.AI usage API requires an API key connection." }
    }

    return { kind: "supported", value: { providerID: "zai-coding-plan", auth: { key: credential.key } } }
  }

  if (integrationID === "openrouter") {
    if (credential.type !== "key") {
      return { kind: "unsupported", reason: "OpenRouter usage API requires an API key connection." }
    }

    return { kind: "supported", value: { providerID: "openrouter", auth: { key: credential.key } } }
  }

  if (integrationID === "opencode-go") {
    if (credential.type !== "key") {
      return { kind: "unsupported", reason: "OpenCode Go usage API requires an API key connection." }
    }

    return { kind: "supported", value: { providerID: "opencode-go", auth: { key: credential.key } } }
  }

  return {
    kind: "unsupported",
    reason: "OpenCode does not expose a universal usage API for this integration.",
  }
}

function readMetadataString(metadata: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === "string" && value) return value
  }
  return undefined
}
