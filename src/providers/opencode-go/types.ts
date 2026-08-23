import z from "zod"

const usageWindowSchema = z.object({
  status: z.enum(["ok", "rate-limited"]),
  percent: z.number(),
  resetsAt: z.string(),
})

export const openCodeGoUsageResponseSchema = z.object({
  usage: z.object({
    rolling: usageWindowSchema,
    weekly: usageWindowSchema,
    monthly: usageWindowSchema,
  }),
})

export type OpenCodeGoUsageResponse = z.infer<typeof openCodeGoUsageResponseSchema>

export interface OpenCodeGoAuth {
  key: string
}
