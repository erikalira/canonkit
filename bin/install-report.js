// A short, grouped summary of what `canonkit install` did, built from the
// detailed log lines the install steps already emit. The detailed lines stay
// the source of truth (`--verbose` prints them as they happen); this only
// regroups them, and any line it does not recognise is shown as a note rather
// than dropped, so a new warning can never disappear behind the summary.

import os from "node:os";
import path from "node:path";

const HARNESS = { claude: "Claude Code", codex: "Codex", opencode: "OpenCode", copilot: "GitHub Copilot" };
const ORDER = ["claude", "codex", "opencode", "copilot"];

const norm = (p) => path.resolve(p).replace(/\\/g, "/").toLowerCase();

/** `~/...` for anything under the home folder; the path as given otherwise. */
export function shortPath(p, home = os.homedir()) {
  const h = norm(home);
  const n = p.replace(/\\/g, "/");
  return norm(p) === h ? "~" : norm(p).startsWith(`${h}/`) ? `~${n.slice(n.length - (norm(p).length - h.length))}` : n;
}

function harnessOfDir(dir, home) {
  const d = norm(dir);
  if (d.includes("/.claude/")) return "claude";
  if (d.includes("/.codex/")) return "codex";
  if (d.includes("/opencode")) return "opencode";
  if (d.includes("/.copilot/")) return "copilot";
  if (d.includes("/.agents/")) return "agents";
  return null;
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function renderRemainingItems(remaining) {
  if (!remaining) return [];
  const lines = [
    ["Tools", remaining.tools, "npx canonkit tool add <tool>"],
    ["Specialists", remaining.specialists, "npx canonkit add <name>"],
    ["Stack packs", remaining.stacks, "npx canonkit add <stack>"],
  ].filter(([, names]) => names?.length);
  return lines.length
    ? ["Not installed:", ...lines.map(([label, names, command]) => `  ${label}: ${names.join(", ")} — ${command}`)]
    : ["All catalog project items are active."];
}

/**
 * @param {string[]} lines     every ctx.log line of the run, in order
 * @param {{dryRun?: boolean, version?: string, changed?: Set<string>, home?: string, failed?: boolean}} opts
 * @returns {string[]} the lines to print
 */
export function renderInstallReport(lines, { dryRun = false, version = "", changed = new Set(), home = os.homedir(), failed = false, remaining = null, interactive = false, cancelled = false } = {}) {
  const rows = new Map(); // harness -> { items: [], touched: bool }
  const row = (h) => { if (!rows.has(h)) rows.set(h, { items: [], touched: false }); return rows.get(h); };
  const touchedUnder = (dir) => {
    const root = norm(dir);
    return [...changed].some((f) => norm(f).startsWith(`${root}/`) || norm(f) === root);
  };
  const models = [];
  const blocks = { current: 0, changed: 0 };
  const security = { applied: [], notes: [] };
  const notes = [];
  const toolResults = [];
  let hookHint = false;
  let hookCount = 0;
  let dashboard = false;
  let opencodeAgentsMd = false;
  let stale = null;
  const tracked = {};
  const addNote = (text, kind = "info") => notes.push({ text, kind });

  for (const raw of lines) {
    const line = raw.replace(/^\[dry-run\] /, "");
    if (!line.trim()) continue;
    let m;
    if ((m = /^Installed (\d+) agents -> (.+)$/.exec(line))) {
      const h = harnessOfDir(m[2] + "/", home);
      if (h) { const r = row(h); r.items.push(plural(+m[1], "agent")); r.touched ||= touchedUnder(m[2]); }
    } else if ((m = /^Installed (\d+) hooks? -> (.+)$/.exec(line))) {
      hookCount = +m[1]; const r = row("claude"); r.items.push(plural(hookCount, "hook")); r.touched ||= touchedUnder(m[2]);
    } else if ((m = /^Installed (\d+) Codex hook files? -> (.+)$/.exec(line))) {
      const r = row("codex"); r.items.push("hook"); r.touched ||= touchedUnder(m[2]);
    } else if ((m = /^Installed (\d+) OpenCode hook files? -> (.+)$/.exec(line)) || (m = /^Installed the OpenCode plugin -> (.+?) \(/.exec(line))) {
      const r = row("opencode"); if (!r.items.includes("plugin")) r.items.push("plugin"); r.touched ||= touchedUnder(path.dirname(m[2] ?? m[1]));
    } else if ((m = /^Installed dashboard -> (.+?)(\s{2}\(run: .*)?$/.exec(line))) {
      dashboard = true; const r = row("claude"); r.items.push("dashboard"); r.touched ||= touchedUnder(m[1]);
    } else if ((m = /^Installed (\d+) skills? \(.*\) -> (.+)$/.exec(line))) {
      const h = harnessOfDir(m[2] + "/", home);
      const targetsFor = h === "agents" ? ["codex", "opencode"].filter((k) => rows.has(k)) : [h];
      for (const k of targetsFor.length ? targetsFor : [h]) if (k) { const r = row(k); r.items.push(plural(+m[1], "skill")); r.touched ||= touchedUnder(m[2]); }
    } else if ((m = /^already current: (.+)$/.exec(line))) {
      blocks.current++;
    } else if ((m = /^(appended managed block to|updated managed block in|replaced managed block in|created) (.+)$/.exec(line))) {
      blocks.changed++;
    } else if (/^(Claude Code|Codex|OpenCode|GitHub Copilot): /.test(line)) {
      models.push(line);
    } else if (/^Catalog: /.test(line)) {
      // shown by `canonkit models show`
    } else if (/is not referenced by .*settings\.json|^These hooks are optional|^To opt in explicitly|npx canonkit install --wire-hooks$|^or add under "hooks"|^If an entry already exists|^"(PreToolUse|PostToolUse|SubagentStop|UserPromptSubmit|Stop|SessionStart|PreCompact)":|^\{ .*"hooks":/.test(line.trim())) {
      hookHint = true;
    } else if (/^Core installed\.|^Project items: run npx canonkit list|^cd <project>|^Check the install|^Check native permissions/.test(line.trim())) {
      // replaced by the closing "Next" lines
    } else if ((m = /^Security repository: (.+)$/.exec(line))) {
      security.repo = m[1];
    } else if ((m = /^(?:would apply|Applying) (?:repository control|user Claude setting): (\S+)/.exec(line))) {
      security.applied.push(m[1]);
    } else if (/^WARN security claude: a Windows copy at /.test(line)) {
      // A security setting that was not written and why: shown as its own line, not folded into the note count.
      addNote(line.replace(/^WARN /, ""), "warning");
    } else if ((m = /^WARN security (\w+)(?: |:)/.exec(line))) {
      security.notes.push(line.replace(/^WARN /, ""));
    } else if ((m = /^WARN tool ([\w-]+): (.+)$/.exec(line))) {
      addNote(`${m[1]}: ${m[2]}`, "warning");
    } else if ((m = /^TOOL_SETUP_RESULT: (.+)$/.exec(line))) {
      toolResults.push(m[1]);
    } else if ((m = /^TOOL_SETUP_WOULD: (.+)$/.exec(line))) {
      toolResults.push(`would set up ${m[1]}`);
    } else if (/^Installed (?!\d+ agents?\b|\d+ hooks?\b|\d+ skills?\b|dashboard\b|the OpenCode plugin\b|\d+ Codex hook files?\b|\d+ OpenCode hook files?\b)/.test(line)) {
      addNote(line, "success");
    } else if (/^Stack packs already current:/.test(line)) {
      addNote(line, "success");
    } else if ((m = /^would track \S+ \((\w+)\)$/.exec(line.trim()))) {
      tracked[m[1]] = (tracked[m[1]] ?? 0) + 1;
    } else if (/^would run model discovery/.test(line.trim())) {
      // implied by the dry-run footer
    } else if ((m = /^possible older copies of agents this repo owns: (.+)$/.exec(line.trim()))) {
      const names = m[1].split(", ");
      const suffixes = new Set(names.map((n) => n.slice(n.indexOf("."))));
      stale = { count: names.length, suffix: suffixes.size === 1 ? [...suffixes][0] : null };
    } else if (stale && (m = /^(Codex|OpenCode) (.+?) — remove them yourself once you have checked.?$/.exec(line.trim()))) {
      const what = stale.count === 1 ? "1 old copy" : `${stale.count} old copies`;
      addNote(`${m[1]}: ${what}${stale.suffix ? ` (*${stale.suffix})` : ""} of its agents in the agents folder; ${m[2].replace(/^does not load these$/, "Codex ignores them").replace(/^loads any .md here as an agent$/, "OpenCode loads .md files there as extra agents")}. Delete once checked (names: --verbose)`);
      stale = null;
    } else if (/OpenCode now reads .* instead of ~\/\.claude\/CLAUDE\.md|copy any rule of your own from there/.test(line.trim())) {
      opencodeAgentsMd = true;
    } else if (/^Security version\/runtime checks not executed/.test(line)) {
      addNote(line, "warning");
    } else {
      const text = line.trim().replace(home, "~").replace(home.replace(/\\/g, "/"), "~");
      const kind = /^(?:WARN(?:ING)?\b|ERROR\b|Failed\b|Refusing\b|Partial installation\b)/i.test(text) ? "warning" : "info";
      addNote(text, kind);
    }
  }

  const out = [];
  const verb = dryRun ? "would be" : "";
  if (interactive) {
    const title = cancelled ? "Installation cancelled" : failed ? "Installation incomplete" : dryRun ? "Dry run" : "Installation complete";
    const heading = `── ${title} ──────────`;
    out.push(process.stdout.isTTY && !Object.hasOwn(process.env, "NO_COLOR") && process.env.TERM !== "dumb" ? `\u001b[1m${heading}\u001b[0m` : heading, "");
  }
  out.push(`canonkit ${version}${version ? " · " : ""}install${dryRun ? " (dry run: nothing is written)" : ""}`.trim());
  out.push("");

  const width = Math.max(...[...rows.keys()].map((k) => (HARNESS[k] ?? k).length), 12);
  const harnessKeys = ORDER.filter((k) => rows.has(k));
  let anyChange = blocks.changed > 0 || security.applied.length > 0 || toolResults.length > 0 || notes.some((note) => note.kind === "success");
  for (const k of harnessKeys) {
    const r = rows.get(k);
    const status = dryRun ? "" : r.touched ? "updated" : "up to date";
    if (r.touched) anyChange = true;
    const mark = failed ? "•" : "✓";
    out.push(`  ${mark} ${(HARNESS[k]).padEnd(width)}  ${r.items.join(" · ")}${status ? `   ${status}` : ""}`);
  }
  if (blocks.current + blocks.changed) {
    const total = blocks.current + blocks.changed;
    const status = dryRun ? "" : blocks.changed ? `${blocks.changed} updated` : "up to date";
    out.push(`  ✓ ${"Guidance".padEnd(width)}  ${plural(total, "AGENTS.md/CLAUDE.md file")}${status ? `   ${status}` : ""}`);
  }

  const known = [];
  const inherit = [];
  for (const l of models) {
    const name = l.slice(0, l.indexOf(":"));
    const rest = l.slice(l.indexOf(":") + 2);
    if (/^unknown/.test(rest)) inherit.push(name);
    else known.push(`${name} ${rest.split(";")[0].split(",").length}`);
  }
  const modelBits = [];
  if (known.length) modelBits.push(known.join(" · "));
  if (inherit.length) modelBits.push(`${inherit.join(", ")}: session model`);
  const infoRows = [];
  if (modelBits.length) infoRows.push(["Models", `${modelBits.join(" · ")}   (npx canonkit models show)`]);
  const trackedBits = Object.entries(tracked).map(([state, n]) => `${plural(n, "file")} ${state}`);
  if (trackedBits.length) infoRows.push(["Would change", trackedBits.join(" · ")]);
  if (hookHint) infoRows.push(["CanonKit hooks", "inactive (optional) — to turn on: npx canonkit install --wire-hooks"]);
  if (security.repo || security.applied.length || security.notes.length) {
    const bits = [];
    if (security.applied.length) bits.push(`${plural(security.applied.length, "control")} ${dryRun ? "to apply" : "applied"}`);
    else bits.push("controls already in place");
    if (security.notes.length) bits.push(plural(security.notes.length, "note"));
    infoRows.push(["Security", `${bits.join(" · ")}   (check: npx canonkit doctor)`]);
  }
  if (opencodeAgentsMd) infoRows.push(["OpenCode", "now reads ~/.config/opencode/AGENTS.md; copy any rule of your own from ~/.claude/CLAUDE.md outside the markers"]);
  if (infoRows.length) {
    out.push("");
    const w = Math.max(...infoRows.map(([k]) => k.length));
    for (const [k, v] of infoRows) out.push(`  ${k.padEnd(w)}  ${v}`);
  }

  if (notes.length) {
    out.push("");
    for (const note of notes) {
      const mark = note.kind === "warning" ? "⚠" : note.kind === "success" ? "✓" : "·";
      out.push(`  ${mark} ${note.text}`);
    }
  }
  if (toolResults.length) {
    out.push("");
    out.push("Project tools:");
    for (const result of toolResults) out.push(`  ✓ ${result}`);
  }

  out.push("");
  if (cancelled) out.push("Nothing was written: installation was cancelled.");
  else if (failed) out.push("Install did not finish — see the error below. Re-run `npx canonkit install --verbose` for every step.");
  else if (dryRun) out.push("Nothing was written. Run without --dry-run to apply.");
  else if (!anyChange) out.push("Nothing to update: everything was already current.");
  else out.push("Done.");
  if (remaining) {
    out.push(...renderRemainingItems(remaining));
  } else out.push("Project items: run npx canonkit list to see optional tools, specialists and stack packs.");
  out.push("Next: npx canonkit doctor (verify) · --verbose shows every step");
  return out;
}
