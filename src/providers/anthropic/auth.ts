import type { Credential } from "@opencode-ai/plugin"
import type { AnthropicAuthData } from "./types"

export function resolveAnthropicAuth(credential: Credential.Value): AnthropicAuthData | null {
  if (credential.type !== "oauth") return null

  return {
    access: credential.access,
    refresh: credential.refresh,
    expires: credential.expires,
  }
}
