"use client";

import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { formatDateDisplay, formatTimeAgo } from "@/lib/ui/format";

export interface DateRangeInclusive {
  start: string;
  endInclusive: string;
}

export type DashboardStatus = "loading" | "live" | "stale-error";

interface DashboardHeaderProps {
  pipelineName: string | undefined;
  range: DateRangeInclusive;
  onRangeChange: (range: DateRangeInclusive) => void;
  onResetDefault: () => void;
  isDefaultRange: boolean;
  status: DashboardStatus;
  lastUpdatedIso: string | undefined;
  isValidating: boolean;
  onRefresh: () => void;
  errorMessage?: string;
}

export function DashboardHeader({
  pipelineName,
  range,
  onRangeChange,
  onResetDefault,
  isDefaultRange,
  status,
  lastUpdatedIso,
  isValidating,
  onRefresh,
  errorMessage,
}: DashboardHeaderProps) {
  return (
    <header className="border-b border-black/[.08] bg-surface-1">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-brand">Marketing Performance</h1>
            <p className="mt-1 text-sm text-ink-secondary">
              {formatDateDisplay(range.start)} – {formatDateDisplay(range.endInclusive)}
              {pipelineName ? ` · ${pipelineName}` : ""}
            </p>
          </div>
          <StatusIndicator status={status} lastUpdatedIso={lastUpdatedIso} isValidating={isValidating} />
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-4">
          <DateField
            label="Start date"
            value={range.start}
            max={range.endInclusive}
            onChange={(value) => onRangeChange({ ...range, start: value })}
          />
          <DateField
            label="End date"
            value={range.endInclusive}
            min={range.start}
            onChange={(value) => onRangeChange({ ...range, endInclusive: value })}
          />

          {!isDefaultRange && (
            <button
              type="button"
              onClick={onResetDefault}
              className="h-9 rounded-md border border-black/[.12] px-3 text-sm text-ink-secondary hover:bg-black/[.03]"
            >
              Reset to default period
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isValidating}
            className="ml-auto flex h-9 items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {status === "stale-error" && errorMessage && (
          <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-status-critical">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Refresh failed ({errorMessage}). Showing the last successful data
            {lastUpdatedIso ? ` from ${formatTimeAgo(lastUpdatedIso)}` : ""} - it may be stale.
          </p>
        )}
      </div>
    </header>
  );
}

function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink-secondary">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="h-9 rounded-md border border-black/[.15] bg-white px-2 text-sm text-ink"
      />
    </label>
  );
}

function StatusIndicator({
  status,
  lastUpdatedIso,
  isValidating,
}: {
  status: DashboardStatus;
  lastUpdatedIso: string | undefined;
  isValidating: boolean;
}) {
  if (status === "loading") {
    return (
      <span className="flex items-center gap-1.5 text-sm text-ink-secondary" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading…
      </span>
    );
  }

  if (status === "stale-error") {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-status-critical" role="status">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        Refresh failed - showing stale data
      </span>
    );
  }

  return (
    <span className="flex flex-col items-end gap-1 text-sm" role="status">
      <span className="flex items-center gap-1.5 font-medium text-status-good">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {isValidating ? "Refreshing…" : "Live"}
      </span>
      {lastUpdatedIso && (
        <span className="text-xs text-ink-muted">Last updated {formatTimeAgo(lastUpdatedIso)}</span>
      )}
    </span>
  );
}
