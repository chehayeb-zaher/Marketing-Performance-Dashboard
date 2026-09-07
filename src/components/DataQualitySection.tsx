import type { DataQualitySummary } from "@/lib/domain/dashboardTypes";
import { formatNumber } from "@/lib/ui/format";
import { Card, SectionHeading } from "./ui/Card";

const EXCLUSION_TAGS_DISPLAY = ["demo-data", "sandbox", "internal", "backdate-test", "dq - duplicate"];

export function DataQualitySection({
  dataQuality,
  timezone,
}: {
  dataQuality: DataQualitySummary;
  timezone: string;
}) {
  const stats: { label: string; value: string }[] = [
    { label: "Records fetched", value: formatNumber(dataQuality.totalFetched) },
    { label: "Included as valid leads", value: formatNumber(dataQuality.includedCount) },
    { label: "Excluded (test/internal data)", value: formatNumber(dataQuality.excludedCount) },
    { label: "Unattributed (blank source)", value: formatNumber(dataQuality.unattributedCount) },
    { label: "Invalid/missing revenue values", value: formatNumber(dataQuality.invalidMonetaryValueCount) },
    { label: "Stale open opportunities", value: formatNumber(dataQuality.staleOpenCount) },
  ];

  const reasonEntries = Object.entries(dataQuality.excludedByReason).sort((a, b) => b[1] - a[1]);

  return (
    <Card className="p-5">
      <SectionHeading
        title="Data Quality & Methodology"
        description="How this dashboard decides what counts, in plain language."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-black/[.08] p-3">
            <div className="text-xl font-bold tabular-nums text-ink">{s.value}</div>
            <div className="text-xs text-ink-secondary mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {reasonEntries.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-ink mb-2">Excluded records by reason</h3>
          <ul className="text-sm text-ink-secondary space-y-1">
            {reasonEntries.map(([reason, count]) => (
              <li key={reason} className="flex justify-between max-w-md border-b border-black/[.05] py-1">
                <span className="capitalize">{reason}</span>
                <span className="tabular-nums font-medium text-ink">{formatNumber(count)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="prose-sm text-sm text-ink-secondary space-y-3 max-w-3xl">
        <h3 className="text-sm font-semibold text-ink">Methodology</h3>
        <p>
          <strong className="text-ink">What&apos;s excluded:</strong> an opportunity is excluded only when its
          linked contact carries one of these tags (matched regardless of capitalization):{" "}
          {EXCLUSION_TAGS_DISPLAY.map((t) => (
            <code key={t} className="rounded bg-black/[.05] px-1 py-0.5 mx-0.5 text-xs">
              {t}
            </code>
          ))}
          . The tag <code className="rounded bg-black/[.05] px-1 py-0.5 text-xs">dash-project</code> never causes
          exclusion by itself; if it appears alongside one of the tags above, the opportunity is still excluded.
          Contacts are never excluded just because their name looks like test data.
        </p>
        <p>
          <strong className="text-ink">Source attribution:</strong> a lead&apos;s source is the opportunity&apos;s
          own source field if present, otherwise its contact&apos;s source, otherwise it&apos;s labeled
          &quot;Unattributed&quot; - and kept as its own category rather than dropped or merged into another
          source.
        </p>
        <p>
          <strong className="text-ink">Revenue:</strong> only opportunities with status exactly
          &quot;won&quot; count toward closed revenue. A missing or non-numeric revenue value is treated as $0
          and counted separately above rather than silently ignored.
        </p>
        <p>
          <strong className="text-ink">Stale leads:</strong> an open opportunity is flagged stale if it hasn&apos;t
          changed stage in {dataQuality.staleThresholdDays}+ days.
          {dataQuality.staleUsingProxyCount > 0
            ? ` GoHighLevel didn't provide a real stage-change timestamp for ${dataQuality.staleUsingProxyCount} of these, so the record's last-updated time was used as a labeled proxy.`
            : " Real stage-change timestamps were available for every open opportunity, so no proxy was needed."}
          {" "}Stale opportunities are flagged, not removed - they still count toward volume, pipeline position, and conversion.
        </p>
        <p>
          <strong className="text-ink">Conversion inference:</strong> the pipeline stages are configured in
          GoHighLevel in a fixed order (position 0 through 7), and this dashboard infers that a lead currently at
          stage N has &quot;reached&quot; every stage from 0 through N. Because a few of this pipeline&apos;s stages
          represent negative outcomes (e.g. Disqualified, Cancelled, Lost) rather than forward progress, treat the
          funnel shape as a rough read on where leads land today, not a strict step-by-step conversion path.
        </p>
        <p>
          <strong className="text-ink">Date range:</strong> an opportunity is included if its created date falls
          within the selected period, evaluated in the {timezone} timezone with the end date treated as exclusive
          (e.g. selecting through Sep 30 includes everything up to but not past Oct 1, midnight).
        </p>
        {dataQuality.missingContactCount > 0 && (
          <p>
            <strong className="text-ink">Note:</strong> {dataQuality.missingContactCount} opportunit
            {dataQuality.missingContactCount === 1 ? "y" : "ies"} referenced a contact record that couldn&apos;t be
            retrieved, so tag-based exclusion couldn&apos;t be checked for {dataQuality.missingContactCount === 1 ? "it" : "them"} - {dataQuality.missingContactCount === 1 ? "it was" : "they were"} kept rather than assumed excluded.
          </p>
        )}
      </div>
    </Card>
  );
}
