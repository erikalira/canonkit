import path from "node:path";

const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const mentionsKit = (handler) => object(handler) && typeof handler.command === "string" && /(?:canonkit-hook|meu-time-hook)\.js/i.test(handler.command);

// Removal needs stronger attribution than the historical wiring recognizer:
// a file with the same name in somebody else's directory is not ours.
export function isCanonicalClaudeHook(handler, configDir, platform = process.platform) {
  const P = platform === "win32" ? path.win32 : path.posix;
  if (!P.isAbsolute(configDir)) throw new Error("Claude hook migration requires an absolute configuration root");
  const normalize = (file) => platform === "win32" ? P.normalize(file).toLowerCase() : P.normalize(file);
  const owned = new Set(["canonkit-hook.js", "meu-time-hook.js"].map((name) => normalize(P.join(configDir, "hooks", name))));
  if (!object(handler) || handler.type !== "command" || typeof handler.command !== "string") return false;
  const match = /^[ \t]*node[ \t]+(?:"([^"\r\n]+)"|'([^'\r\n]+)'|([^\s"']+))[ \t]*$/.exec(handler.command);
  const file = match && (match[1] ?? match[2] ?? match[3]);
  // Conservatively reject expansion, shell operators and multiline commands,
  // even inside quotes. Do not resolve paths supplied by project content.
  const segments = file?.split(platform === "win32" ? /[\\/]/ : /\//) ?? [];
  return Boolean(file && !segments.some((part) => part === "." || part === "..") && !/[\r\n$`%!;|&<>()]/.test(file) && P.isAbsolute(file) && owned.has(normalize(file)));
}

export function migrateClaudeHooks(data, configDir, platform = process.platform) {
  // Validate the trusted root even when there are no handlers to inspect.
  isCanonicalClaudeHook(null, configDir, platform);
  const out = structuredClone(data), removed = [], ambiguous = [];
  if (out.hooks === undefined) return { data: out, removed, ambiguous };
  if (!object(out.hooks)) throw new Error("Invalid hooks object for native migration; nothing was written");
  Object.entries(out.hooks).forEach(([event, groups], eventIndex) => {
    if (!Array.isArray(groups)) throw new Error("Invalid hook event array for native migration; nothing was written");
    const next = [];
    groups.forEach((group, groupIndex) => {
      if (!object(group) || !Array.isArray(group.hooks) || group.hooks.some((handler) => !object(handler))) throw new Error("Invalid hook group or handler for native migration; nothing was written");
      const kept = group.hooks.filter((handler, handlerIndex) => {
        const location = `hooks[${eventIndex}][${groupIndex}].hooks[${handlerIndex}]`;
        if (isCanonicalClaudeHook(handler, configDir, platform)) { removed.push(location); return false; }
        if (mentionsKit(handler)) ambiguous.push(location);
        return true;
      });
      if (kept.length === group.hooks.length) next.push(group);
      else if (kept.length || Object.keys(group).some((key) => !["matcher", "hooks"].includes(key))) next.push({ ...group, hooks: kept });
    });
    if (next.length || groups.length === 0) out.hooks[event] = next;
    else delete out.hooks[event];
  });
  if (removed.length && Object.keys(out.hooks).length === 0) delete out.hooks;
  return { data: out, removed, ambiguous };
}
