import { z } from "zod";

/**
 * Zod schemas for GoHighLevel API responses.
 *
 * These are intentionally "loose" (passthrough) on top-level response envelopes because
 * the exact field set returned by a given sub-account/API version can vary. They are
 * refined against the real API response shapes observed via `npm run diagnose` before
 * being relied on for aggregation logic. Unknown extra fields are preserved, not stripped.
 */

export const GhlStageSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    position: z.number().optional(),
  })
  .loose();

export const GhlPipelineSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    stages: z.array(GhlStageSchema).default([]),
  })
  .loose();

export const GhlPipelinesResponseSchema = z
  .object({
    pipelines: z.array(GhlPipelineSchema),
  })
  .loose();

export type GhlStage = z.infer<typeof GhlStageSchema>;
export type GhlPipeline = z.infer<typeof GhlPipelineSchema>;

const nullableString = z.string().nullable().optional();

export const GhlOpportunitySchema = z
  .object({
    id: z.string(),
    name: nullableString,
    pipelineId: z.string(),
    pipelineStageId: nullableString,
    status: nullableString,
    source: nullableString,
    monetaryValue: z.union([z.number(), z.string()]).nullable().optional(),
    contactId: nullableString,
    createdAt: nullableString,
    updatedAt: nullableString,
    lastStatusChangeAt: nullableString,
    lastStageChangeAt: nullableString,
  })
  .loose();

export const GhlOpportunitiesResponseSchema = z
  .object({
    opportunities: z.array(GhlOpportunitySchema),
    meta: z
      .object({
        total: z.number().optional(),
        nextPageUrl: z.string().nullable().optional(),
        startAfter: z.union([z.number(), z.string()]).nullable().optional(),
        startAfterId: nullableString,
      })
      .loose()
      .optional(),
  })
  .loose();

export type GhlOpportunity = z.infer<typeof GhlOpportunitySchema>;

export const GhlContactSchema = z
  .object({
    id: z.string(),
    source: nullableString,
    tags: z.array(z.string()).optional(),
  })
  .loose();

export const GhlContactResponseSchema = z
  .object({
    contact: GhlContactSchema,
  })
  .loose();

export type GhlContact = z.infer<typeof GhlContactSchema>;
