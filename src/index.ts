import { Plugin } from "@opencode-ai/plugin"
import { fetchUsageSnapshots, resolveProviderFilter } from "./usage"
import { formatUsageStatus } from "./ui"

const description = "Show API usage and rate limits (anthropic/codex/proxy/copilot/zai/openrouter)"

export const UsagePlugin = Plugin.define({
  id: "howaboua.usage",
  setup: async (ctx) => {
    await ctx.command.transform((commands) => {
      commands.update("usage", (command) => {
        command.description = description
        command.template =
          'Call the howaboua.usage tool with provider "$ARGUMENTS". Return the tool content verbatim without commentary.'
      })
    })

    await ctx.tool.transform((tools) => {
      tools.add({
        name: "usage",
        description,
        input: {
          type: "object",
          properties: {
            provider: {
              type: "string",
              description: "Optional provider name or alias, or support",
            },
          },
          additionalProperties: false,
        },
        options: {
          namespace: "howaboua",
          codemode: false,
        },
        execute: async (input) => {
          const value =
            typeof input === "object" && input !== null
              ? (input as Record<string, unknown>).provider
              : undefined
          const provider = typeof value === "string" ? value.trim() : ""

          if (provider.toLowerCase() === "support") {
            return {
              content: "▣ Support Mirrowel Proxy\n\nSupport our lord and savior: https://ko-fi.com/mirrowel",
            }
          }

          const filter = resolveProviderFilter(provider)
          const effectiveFilter = filter ? provider : undefined
          const snapshots = await fetchUsageSnapshots(effectiveFilter)

          return { content: formatUsageStatus(snapshots, effectiveFilter) }
        },
      })
    })
  },
})

export default UsagePlugin
