import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildDashboardData } from "@/lib/domain/buildDashboard";
import type { DashboardData } from "@/lib/domain/dashboardTypes";
import { DEFAULT_REPORT_RANGE } from "@/lib/reportDateRange";
import { GhlApiError } from "@/lib/ghl/http";

export const dynamic = "force-dynamic";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be in YYYY-MM-DD format");

const querySchema = z.object({
  start: dateStringSchema.optional(),
  end: dateStringSchema.optional(),
  pipelineId: z.string().min(1).optional(),
});

interface CacheEntry {
  expiresAt: number;
  payload: DashboardData;
}

// Short in-memory cache so rapid manual refreshes / multiple viewers within the same
// server instance don't re-hit the GHL API on every request. Per-instance only; fine for
// this scope, and SWR's own polling interval (5 min) is the primary throttle.
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsedQuery = querySchema.safeParse({
    start: searchParams.get("start") ?? undefined,
    end: searchParams.get("end") ?? undefined,
    pipelineId: searchParams.get("pipelineId") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsedQuery.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { start, end, pipelineId } = parsedQuery.data;
  const range = {
    start: start ?? DEFAULT_REPORT_RANGE.start,
    // "end" is the exclusive end-of-range boundary, matching the default's convention.
    endExclusive: end ?? DEFAULT_REPORT_RANGE.endExclusive,
  };

  if (range.start >= range.endExclusive) {
    return NextResponse.json({ error: "'start' must be earlier than 'end'" }, { status: 400 });
  }

  const cacheKey = JSON.stringify({ range, pipelineId: pipelineId ?? null });
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload);
  }

  try {
    const payload = await buildDashboardData({ range, pipelineId });
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof GhlApiError) {
      return NextResponse.json(
        { error: "Failed to retrieve data from GoHighLevel", message: err.message },
        { status: 502 },
      );
    }
    console.error("Unhandled /api/dashboard error:", err);
    return NextResponse.json(
      { error: "Internal server error", message: (err as Error).message },
      { status: 500 },
    );
  }
}
