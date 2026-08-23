import { Plugin } from "@opencode-ai/plugin/tui"
import { usageRequestMetadataKey } from "./usage/bridge"

const description = "Show usage and rate limits for OpenCode-connected services"

function providerFromInput(input?: string): string {
  const value = input?.trim() ?? ""
  const match = value.match(/^\/usage(?:\s+(.+))?$/i)
  return (match?.[1] ?? value).trim()
}

export default Plugin.define({
  id: "howaboua.usage",
  setup: (ctx) => {
    ctx.keymap.layer(() => ({
      mode: "base",
      commands: [
        {
          id: "howaboua.usage",
          title: "Usage",
          description,
          palette: true,
          slash: { name: "usage", arguments: true },
          run: async (input) => {
            const route = ctx.ui.router.current()
            if (route.type !== "session") {
              ctx.ui.toast.show({
                title: "Usage",
                message: "Open a session before running /usage.",
                variant: "warning",
              })
              return
            }

            await ctx.client.session.synthetic({
              sessionID: route.sessionID,
              text: "",
              metadata: { [usageRequestMetadataKey]: providerFromInput(input) },
            })
          },
        },
      ],
    }))
  },
})
