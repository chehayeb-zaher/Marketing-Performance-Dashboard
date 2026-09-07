import "server-only";
import { ghlGet } from "./http";
import { GhlOpportunitiesResponseSchema, type GhlOpportunity } from "./schemas";
import { getGhlEnv } from "./env";

const PAGE_LIMIT = 100;
const MAX_PAGES = 500; // hard safety cap (50k opportunities) against a runaway pagination loop

export interface OpportunityDateRange {
  /** Inclusive UTC ISO start instant. */
  startIso: string;
  /** Exclusive UTC ISO end instant. */
  endIsoExclusive: string;
}

/**
 * Fetches every opportunity for a pipeline within a date range.
 *
 * The GHL /opportunities/search endpoint accepts `date`/`endDate` as epoch-millisecond
 * filters on the opportunity's created date (confirmed empirically: narrowing the window
 * to a period with no records returns meta.total=0). We pass them as a server-side
 * prefilter to limit pagination volume, then re-check createdAt client-side against the
 * exact [start, end) boundary so correctness doesn't depend on GHL's own inclusive/exclusive
 * convention for `endDate`.
 *
 * Pagination follows the API's own cursor (meta.startAfter/startAfterId), stopping once
 * meta.nextPage is absent/null or a short page is returned.
 */
export async function getAllOpportunities(
  pipelineId: string,
  range: OpportunityDateRange,
): Promise<GhlOpportunity[]> {
  const env = getGhlEnv();
  const all: GhlOpportunity[] = [];

  const dateFilter = Date.parse(range.startIso);
  const endDateFilter = Date.parse(range.endIsoExclusive);

  let startAfter: string | number | undefined;
  let startAfterId: string | undefined;
  let page = 0;

  while (page < MAX_PAGES) {
    page += 1;

    const raw = await ghlGet("/opportunities/search", {
      locationId: env.GHL_LOCATION_ID,
      pipelineId,
      limit: PAGE_LIMIT,
      date: dateFilter,
      endDate: endDateFilter,
      startAfter,
      startAfterId,
    });

    const parsed = GhlOpportunitiesResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `GoHighLevel opportunities response did not match the expected shape on page ${page}: ${parsed.error.message}`,
      );
    }

    const { opportunities, meta } = parsed.data;
    all.push(...opportunities);

    const hasNextPage = Boolean((meta as { nextPage?: unknown } | undefined)?.nextPage);
    const gotFullPage = opportunities.length === PAGE_LIMIT;

    if (opportunities.length === 0) break;
    if (!hasNextPage && !gotFullPage) break;

    const last = opportunities[opportunities.length - 1];
    startAfterId = meta?.startAfterId ?? last.id;
    startAfter = meta?.startAfter ?? undefined;
  }

  // Client-side safety net for the exact [start, end) boundary, independent of GHL's
  // own inclusive/exclusive convention for the `endDate` query param.
  return all.filter((o) => {
    if (!o.createdAt) return true; // keep; cleaning/data-quality layer flags missing dates
    const created = Date.parse(o.createdAt);
    return created >= dateFilter && created < endDateFilter;
  });
}
