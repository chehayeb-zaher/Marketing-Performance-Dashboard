import useSWR from "swr";
import type { DashboardData } from "@/lib/domain/dashboardTypes";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

class FetchError extends Error {
  status?: number;
}

async function fetcher(url: string): Promise<DashboardData> {
  const res = await fetch(url);
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      message = body.message || body.error || message;
    } catch {
      // ignore body parse failures, use the generic message
    }
    const err = new FetchError(message);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export interface UseDashboardDataParams {
  start: string;
  /** Exclusive end date (YYYY-MM-DD). */
  end: string;
  pipelineId?: string;
}

export function useDashboardData({ start, end, pipelineId }: UseDashboardDataParams) {
  const params = new URLSearchParams({ start, end });
  if (pipelineId) params.set("pipelineId", pipelineId);
  const key = `/api/dashboard?${params.toString()}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<DashboardData>(key, fetcher, {
    refreshInterval: FIVE_MINUTES_MS,
    revalidateOnFocus: true,
    revalidateOnMount: true,
    dedupingInterval: 5_000,
    keepPreviousData: true,
  });

  return {
    data,
    error: error as Error | undefined,
    isLoading,
    isValidating,
    refresh: () => mutate(),
  };
}
