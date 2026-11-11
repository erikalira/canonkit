// A grouped, short rendering of `canonkit doctor`'s rows. Every row the checks
// produce is still counted and every WARN/FAIL still shows by name; `--verbose`
// prints the rows exactly as the checks wrote them.

const WIDTH = 100;

function wrap(text, indent, first = indent) {
  const words = text.split(" ");
  const lines = [];
  let line = first;
  for (const w of words) {
    if (line.trim() && line.length + w.length + 1 > WIDTH) { lines.push(line); line = indent; }
    line += (line.endsWith(" ") || line === "" ? "" : " ") + w;
  }
  if (line.trim()) lines.push(line);
  return lines;
}

const mark = (s) => (s === "OK" ? "✓" : s === "FAIL" ? "✗" : "!");
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** The short word a security row boils down to: its status ("partial") or first clause. */
function label(detail) {
  const head = detail.split(/[:;]/)[0].trim();
  return clip(head, 40);
}

/**
 * @param {{status: string, check: string, detail: string, more?: string[]}[]} rows
 * @returns {{lines: string[], failed: number}}
 */
export function renderDoctorReport(rows) {
  const failed = rows.filter((r) => r.status === "FAIL").length;
  const warned = rows.filter((r) => r.status === "WARN").length;
  const general = rows.filter((r) => !r.check.startsWith("security "));
  const security = rows.filter((r) => r.check.startsWith("security "));
  const out = ["canonkit doctor", ""];

  const ok = general.filter((r) => r.status === "OK");
  const attention = general.filter((r) => r.status !== "OK");
  if (ok.length) {
    out.push(`  ✓ ${ok.length} check${ok.length === 1 ? "" : "s"} passed`);
    out.push(...wrap(ok.map((r) => r.check).join(" · "), "      "));
  }
  for (const r of attention) {
    out.push("");
    out.push(...wrap(`${clip(r.detail, 220)}`, "      ", `  ${mark(r.status)} ${r.check}  `).map((l, i) => (i === 0 ? l : l)));
    for (const m of r.more ?? []) out.push(`      ${clip(m, 160)}`);
  }

  if (security.length) {
    out.push("");
    const sOk = security.filter((r) => r.status === "OK").length;
    out.push(`  Security   ${sOk} ok · ${security.length - sOk} to review`);
    const groups = new Map();
    let remediation = null;
    for (const r of security) {
      const [, group, ...rest] = r.check.split(" ");
      if (group === "remediation") { remediation = r; continue; }
      const name = rest.join(" ");
      const item = group === "environment" ? r.detail.split(";")[0] : `${name || "policy"} ${label(r.detail)}`;
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(`${mark(r.status)} ${item}`);
    }
    const w = Math.max(...[...groups.keys()].map((k) => k.length));
    for (const [group, items] of groups) out.push(...wrap(items.join(" · "), `      ${" ".repeat(w + 2)}`, `    ${group.padEnd(w)}  `));
    if (remediation) out.push("", ...wrap("Fix what Claude Code supports: npx canonkit install --claude (run from the repository). Stronger shell isolation needs WSL2 or a container.", "    ", "  → "));
  }

  out.push("");
  const tail = failed ? `${failed} check${failed === 1 ? "" : "s"} failed.` : "No check failed.";
  out.push(warned ? `${tail} ${warned} warning${warned === 1 ? "" : "s"}; full text: npx canonkit doctor --verbose` : tail);
  return { lines: out, failed };
}
