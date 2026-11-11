/**
 * Vendor-neutral tool access levels for agent sources (`access: <level>`).
 *
 * The level limits which tools are exposed to an agent's context. It is NOT a
 * security boundary: an agent with a shell can still write files.
 *
 * Defined once here; bin/cli.js and scripts/validate.mjs both read it.
 */

export const ACCESS_LEVELS = ["read", "inspect", "write-docs", "full"];

// Frontmatter keys a harness would act on as a tool or context restriction.
// Sources may not carry them: the restriction comes only from `access`.
export const RESERVED_KEYS = ["tools", "disallowedTools", "skills", "mcpServers", "omitClaudeMd"];

/** The reserved key a frontmatter line declares (any case, optional quotes or space before the colon), or null. */
export function reservedKeyOf(line) {
  const m = /^\s*["']?([A-Za-z]+)["']?\s*:/.exec(line);
  return m ? (RESERVED_KEYS.find((k) => k.toLowerCase() === m[1].toLowerCase()) ?? null) : null;
}

// Tools every restricted level keeps: shell (tests, git diff), reading,
// web research and cited skills. The report is the subagent's final message;
// no peer-messaging tool is exposed.
const READ_TOOLS = ["Read", "Grep", "Glob", "Bash", "WebSearch", "WebFetch", "Skill"];

/**
 * Claude Code translation: the frontmatter key and value to add, or null for
 * no restriction. `read` and `write-docs` are allowlists (no MCP tools);
 * `inspect` is a denylist so MCP tools stay, whatever name they were installed
 * under.
 */
export function claudeRestriction(level) {
  switch (level) {
    case "read":
      return { key: "tools", value: READ_TOOLS.join(", ") };
    case "write-docs":
      return { key: "tools", value: [...READ_TOOLS, "Edit", "Write"].join(", ") };
    case "inspect":
      return { key: "disallowedTools", value: "Edit, Write, NotebookEdit" };
    default:
      return null;
  }
}

/** Human-readable effective restriction for a level on a harness. */
export function describeRestriction(level, harness = "claude") {
  if (!level) return "none (inherits everything)";
  if (harness !== "claude") return "none (not translated for this harness)";
  const r = claudeRestriction(level);
  if (!r) return "none";
  return r.key === "tools" ? `allowlist: ${r.value}` : `denylist: ${r.value}`;
}

/**
 * Check frontmatter lines (no delimiters) of one source. Returns an error
 * message or null.
 */
export function accessProblem(frontLines) {
  const raw = frontLines.map((l) => l.replace(/\r$/, ""));
  for (const key of RESERVED_KEYS) {
    if (raw.some((l) => reservedKeyOf(l) === key)) {
      return `reserved key '${key}' — tool restrictions come only from 'access: ${ACCESS_LEVELS.join(" | ")}' (a limit on exposed tools, not a security boundary)`;
    }
  }
  const lines = raw.filter((l) => /^access\s*:/i.test(l));
  if (!lines.length) return null;
  if (lines.length > 1) return "'access' declared more than once";
  const m = /^access: ([a-z-]+)$/.exec(lines[0]);
  if (!m) return `malformed access line '${lines[0]}' — write a single lowercase 'access: <level>'`;
  if (!ACCESS_LEVELS.includes(m[1])) return `access is '${m[1]}' — expected ${ACCESS_LEVELS.join(", ")}`;
  return null;
}
