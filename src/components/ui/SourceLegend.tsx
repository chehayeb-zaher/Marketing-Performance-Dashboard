import { colorForSource } from "@/lib/domain/colors";

/**
 * A plain-HTML legend rather than Recharts' built-in <Legend>. Recharts' legend silently
 * drops entries when there isn't enough estimated width for all of them (observed with 9+
 * sources) instead of wrapping to another row - this always renders every source.
 */
export function SourceLegend({ sources, colorMap }: { sources: string[]; colorMap: Map<string, string> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3 text-xs text-ink-secondary" aria-label="Source color key">
      {sources.map((source) => (
        <li key={source} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: colorForSource(source, colorMap) }}
            aria-hidden="true"
          />
          {source}
        </li>
      ))}
    </ul>
  );
}
