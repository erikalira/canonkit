/** Shared, plain-text renderer for current/recommended configuration rows. */

const LIMIT = 78;
const NOT_SET = "(not set)";
const MARKERS = new Set(["=", "->", "+", "!"]);
const LEGEND = "= already recommended; -> replaced; + added; ! no recommendation";

function cell(value) {
  return value === undefined || value === null || value === "" ? NOT_SET : String(value);
}

function shorten(value, max) {
  if (value.length <= max) return value;
  if (max < 4) return value.slice(0, max);
  return `${value.slice(0, max - 3)}...`;
}

function rowText(row, { limit = LIMIT, padded = true } = {}) {
  const marker = MARKERS.has(row.marker) ? row.marker : "!";
  const label = String(row.label ?? "");
  const current = cell(row.current);
  const recommended = row.reason && marker === "!"
    ? `${cell(row.recommended)} (${row.reason})`
    : cell(row.recommended);
  const gap = "  ";
  const target = Math.min(LIMIT, Math.max(1, limit));
  if (!padded) {
    // Prefixes such as "Applying project security: " consume part of the
    // terminal width. Keep the current value, marker, and recommendation
    // intact, shortening the diagnostic label first.
    const valueWidth = current.length + gap.length + marker.length + gap.length + recommended.length;
    const labelWidth = Math.max(1, target - valueWidth - gap.length);
    return [shorten(label, labelWidth), current, marker, recommended].join(gap);
  }

  // Keep the label intact whenever possible (long security keys are useful
  // diagnostics); trim values first if a catalog id makes the row too wide.
  const labelWidth = Math.min(label.length, Math.max(1, target - 20));
  const remaining = Math.max(3, target - labelWidth - gap.length * 3 - marker.length);
  let currentWidth = Math.min(current.length, Math.max(1, Math.floor((remaining - 1) / 2)));
  let recommendedWidth = Math.max(1, remaining - currentWidth);
  if (recommended.length > recommendedWidth) recommendedWidth = Math.min(recommended.length, remaining - currentWidth);
  if (currentWidth + recommendedWidth > remaining) currentWidth = Math.max(1, remaining - recommendedWidth);
  const out = [
    shorten(label, labelWidth).padEnd(labelWidth),
    shorten(current, currentWidth).padEnd(currentWidth),
    marker,
    shorten(recommended, recommendedWidth),
  ].join(gap);
  return out.length > target ? out.slice(0, target) : out;
}

function paddedRows(rows, { limit = LIMIT } = {}) {
  if (!rows.length) return [];
  const target = Math.min(LIMIT, Math.max(1, limit));
  const prepared = rows.map((row) => ({
    label: String(row.label ?? ""),
    current: cell(row.current),
    marker: MARKERS.has(row.marker) ? row.marker : "!",
    recommended: row.reason && row.marker === "!" ? `${cell(row.recommended)} (${row.reason})` : cell(row.recommended),
  }));
  const gap = 2;
  const labelWidth = Math.min(Math.max(...prepared.map((r) => r.label.length)), Math.max(1, target - 20));
  const currentWidth = Math.min(Math.max(...prepared.map((r) => r.current.length)), Math.max(1, Math.floor((target - labelWidth - gap * 3 - 1) / 2)));
  const recommendedWidth = Math.max(1, target - labelWidth - currentWidth - gap * 3 - 1);
  return prepared.map((r) => [
    shorten(r.label, labelWidth).padEnd(labelWidth),
    shorten(r.current, currentWidth).padEnd(currentWidth),
    r.marker,
    shorten(r.recommended, recommendedWidth),
  ].join("  ").slice(0, target));
}

/**
 * Render one related row group. Matching rows in a security group collapse to
 * a count; an all-matching group gets one compact summary line.
 */
function renderChangeRows(rows, {
  label = "Changes",
  security = false,
  padded = true,
  limit = LIMIT,
  legend = false,
} = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const matching = list.filter((row) => row.marker === "=");
  const changed = list.filter((row) => row.marker !== "=");
  const lines = [];
  const visible = [];
  if (legend) lines.push(LEGEND);
  if (list.length && matching.length === list.length) {
    visible.push({ label, current: `${list.length} rows`, marker: "=", recommended: "already recommended" });
  } else {
    if (security && matching.length) {
      visible.push({ label: `${label} already recommended`, current: `${matching.length} rows`, marker: "=", recommended: "unchanged" });
    } else if (matching.length) {
      visible.push(...matching);
    }
    visible.push(...changed);
  }
  lines.push(...(padded ? paddedRows(visible, { limit }) : visible.map((row) => rowText(row, { limit, padded: false }))));
  return lines.join("\n");
}

function renderChangeBlocks(blocks, { padded = true, limit = LIMIT, legend = true } = {}) {
  const out = [];
  let needsLegend = legend;
  for (const block of blocks ?? []) {
    const rendered = renderChangeRows(block.rows, {
      label: block.label,
      security: block.security,
      padded,
      limit,
      legend: needsLegend,
    });
    if (rendered) {
      out.push(rendered);
      needsLegend = false;
    }
  }
  return out.join(padded ? "\n\n" : "\n");
}

export { LIMIT, NOT_SET, LEGEND, rowText, renderChangeRows, renderChangeBlocks };
