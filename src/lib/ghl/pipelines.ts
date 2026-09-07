import "server-only";
import { ghlGet } from "./http";
import { GhlPipelinesResponseSchema, type GhlPipeline } from "./schemas";
import { getGhlEnv } from "./env";

/** Fetches all pipelines for the configured location. */
export async function getPipelines(): Promise<GhlPipeline[]> {
  const env = getGhlEnv();
  const raw = await ghlGet("/opportunities/pipelines", { locationId: env.GHL_LOCATION_ID });
  const parsed = GhlPipelinesResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(
      `GoHighLevel pipelines response did not match the expected shape: ${parsed.error.message}`,
    );
  }

  return parsed.data.pipelines;
}

/** Fetches all pipelines and returns the one matching `name` (case-insensitive, trimmed). */
export async function getPipelineByName(name: string): Promise<GhlPipeline> {
  const pipelines = await getPipelines();
  const target = name.trim().toLowerCase();
  const match = pipelines.find((p) => p.name.trim().toLowerCase() === target);

  if (!match) {
    const available = pipelines.map((p) => p.name).join(", ") || "(none returned)";
    throw new Error(
      `No pipeline named "${name}" was found for this location. Available pipelines: ${available}`,
    );
  }

  return match;
}

/** Fetches all pipelines and returns the one matching `id`. */
export async function getPipelineById(id: string): Promise<GhlPipeline> {
  const pipelines = await getPipelines();
  const match = pipelines.find((p) => p.id === id);

  if (!match) {
    throw new Error(`No pipeline found with id "${id}" for this location.`);
  }

  return match;
}

/** Returns a pipeline's stages sorted by their API-provided position/order. */
export function getOrderedStages(pipeline: GhlPipeline) {
  return [...pipeline.stages].sort((a, b) => {
    if (a.position !== undefined && b.position !== undefined) return a.position - b.position;
    return 0;
  });
}
