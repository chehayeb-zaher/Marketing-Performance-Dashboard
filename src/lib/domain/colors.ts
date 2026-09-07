/**
 * Stable, validated categorical colors for chart sources.
 *
 * The first 8 hues are the accessibility-skill's validated categorical palette
 * (fixed order, CVD-safe adjacency for stacked bars). This dashboard's requirements
 * forbid ever folding smaller sources into "Other" (every source must stay visible
 * and comparable), so a 9th slot (teal) was added and independently validated with
 * `validate_palette.js` against both the base 8 and the light chart surface - it
 * clears the chroma floor, CVD-separation target, and normal-vision floor. Beyond
 * 9 distinct sources, colors repeat; every chart still labels sources by name in an
 * axis tick, legend, or table, so identity is never carried by color alone.
 */
export const SOURCE_PALETTE = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua/green
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
  "#0c9d8f", // teal (extension slot)
] as const;

/**
 * Assigns each distinct source a fixed color, ordered alphabetically so the mapping
 * doesn't shift when a chart re-sorts sources by its own metric (lead volume, revenue,
 * etc.) - the same source always gets the same color across every chart.
 */
export function buildSourceColorMap(sources: Iterable<string>): Map<string, string> {
  const sorted = [...new Set(sources)].sort((a, b) => a.localeCompare(b));
  const map = new Map<string, string>();
  sorted.forEach((source, i) => {
    map.set(source, SOURCE_PALETTE[i % SOURCE_PALETTE.length]);
  });
  return map;
}

export function colorForSource(source: string, colorMap: Map<string, string>): string {
  return colorMap.get(source) ?? SOURCE_PALETTE[0];
}
