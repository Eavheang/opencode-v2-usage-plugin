import { Plugin } from "@opencode-ai/plugin"
import { fetchUsageSnapshots, resolveProviderFilter } from "./usage"
import { formatUsageStatus } from "./ui"
import { usageRequestMetadataKey } from "./usage/bridge"

const description = "Show usage and rate limits for OpenCode-connected services"
const supportMessage = "▣ Support Mirrowel Proxy\n\nSupport our lord and savior: https://ko-fi.com/mirrowel"

type UsageIntegration = Parameters<typeof fetchUsageSnapshots>[0]

async function getUsageContent(integration: UsageIntegration, provider: string): Promise<string> {
  if (provider.toLowerCase() === "support") return supportMessage

  const effectiveFilter = resolveProviderFilter(provider)
  const snapshots = await fetchUsageSnapshots(integration, effectiveFilter)
  return formatUsageStatus(snapshots, effectiveFilter)
}

export const UsagePlugin = Plugin.define({
  id: "howaboua.usage",
  tui: true,
  setup: async (ctx) => {
    const controller = new AbortController()

    const requestTask = (async () => {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        if (event.type !== "session.synthetic") continue

        const value = event.data.metadata?.[usageRequestMetadataKey]
        if (typeof value !== "string") continue

        const content = await getUsageContent(ctx.integration, value.trim()).catch(() => "▣ Usage | Request failed.")
        await ctx.session.synthetic({
          sessionID: event.data.sessionID,
          text: content,
        }).catch(() => {})
      }
    })().catch(() => {})

    await ctx.command.transform((commands) => {
      commands.update("usage", (command) => {
        command.description = description
        command.template =
          'Call the howaboua.usage tool. If a provider argument is present, pass it as provider; otherwise omit provider. Return the tool content verbatim without commentary. Arguments: $ARGUMENTS'
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

          return { content: await getUsageContent(ctx.integration, provider) }
        },
      })
    })

    return async () => {
      controller.abort()
      await requestTask
    }
  },
})

export default UsagePlugin
