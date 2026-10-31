#!/usr/bin/env node
/**
 * canonkit — the Codex adapter for the hook's core.
 *
 * Wired (in $CODEX_HOME/hooks.json) to PreToolUse. Runs stdin -> normalizeCodex
 * -> evaluate() (canonkit-hook.js, installed beside this file) -> output, exit.
 *
 * WHAT CODEX CAN ENFORCE. Codex honours a PreToolUse deny and nothing softer:
 * `permissionDecision: "ask"` is "parsed but not supported yet", so Codex marks
 * the hook run as failed and runs the tool anyway. An ask would be a gate that
 * silently fails open. This adapter therefore outputs a deny or nothing, and
 * only for the kinds CODEX_GATE_MODES marks `enforce`; every other kind is left
 * to the codex-block text and the model's judgment.
 *
 * ONE CALL, SEVERAL EVENTS. A shell call is one Bash event. An apply_patch call
 * is one Write event per file it touches, so the per-file gates see each file:
 * Add File and Update File carry their `+` lines as content, a Move to
 * destination is gated as a file of its own, and Delete File gives the path
 * only. The first deny wins.
 *
 * No log. The env passes logDir: null and the `logs` evaluate() returns are
 * dropped: there is no Codex activity log in 2.2.
 *
 * DESIGN RULE: fail-open, as in canonkit-hook.js. Any internal error -> nothing
 * on stdout, exit 0. The core is required inside run()'s try, so a missing
 * canonkit-hook.js is one line on stderr and exit 0, not a crash at load; a plain
 * require() of this file (tests, doctor) runs nothing.
 */
const fs = require('fs');
const os = require('os');

// What Codex does with each kind (the modes are documented beside
// CLAUDE_GATE_MODES in canonkit-hook.js). Only a deny reaches Codex: the bypass
// and hard-secret gates. The asks become text; the Stop gate, the context-size
// reminder and the dispatch log are not offered.
const CODEX_GATE_MODES = Object.freeze({
  'git-bypass': 'enforce',
  'secret-block': 'enforce',
  git: 'text',
  'secret-ask': 'text',
  'perf-budget': 'text',
  'high-risk-surface': 'text',
  'definition-of-done': 'off',
  'context-size': 'off',
  'dispatch-log': 'off',
});

// ---- CODEX'S INPUT (2.2, from the docs; the first shapes checked on a capture) ----
// Every assumption about the shape of Codex's stdin is in this block, so a new
// capture corrects it in one place.
// Source: learn.chatgpt.com/docs/hooks.md and the PreToolUse input schema
// (codex-rs/hooks/schema/generated), read 2026-10-30. Captured from
// codex-cli 0.166.0 on Windows (test/fixtures/codex/): the stdin keys below
// (no agent_id/agent_type on a main-session call), Bash with a string
// tool_input.command, apply_patch with the patch in tool_input.command and an
// absolute Windows path after `*** Add File:`. The other shapes are defensive.
//   stdin    one JSON object: hook_event_name "PreToolUse", tool_name,
//            tool_input, tool_use_id, cwd, session_id, transcript_path (string
//            or null), turn_id, model, permission_mode; agent_id/agent_type on a
//            subagent (schema only).
//   shell    tool_name "Bash" (shell and unified exec both "match as Bash");
//            tool_input.command is a string. Defensively also: the names in
//            SHELL_TOOLS, tool_input.cmd, a bare string tool_input, and an argv
//            array (a trailing `-c`/`-lc`/`-Command` script is taken as the
//            command, anything else is joined with spaces).
//   patch    tool_name "apply_patch" ("hook input still reports tool_name:
//            apply_patch"; Edit and Write are matcher aliases, not names).
//            tool_input.command is the patch text, "*** Begin Patch" ...
//            "*** End Patch". Defensively also: tool_name Edit or Write, the
//            text under tool_input.input or tool_input.patch, a bare string
//            tool_input, and a shell command that carries a patch (the
//            `apply_patch <<'EOF'` form), which is gated as both.
//   other    any other tool, or any event but PreToolUse (or none), is not gated.
const SHELL_TOOLS = new Set(['Bash', 'shell', 'local_shell', 'exec_command', 'unified_exec']);
const PATCH_TOOLS = new Set(['apply_patch', 'Edit', 'Write']);
const SCRIPT_FLAG = /^-(c|lc|ic|Command)$/i;
const PATCH_BEGIN = '*** Begin Patch';
// The apply_patch grammar's file headers. `+` lines are content; ` ` and `-`
// lines, `@@` hunk headers and `*** End of File` are not.
const PATCH_HEADER = /^\*\*\* (Add File|Update File|Delete File|Move to): (.+)$/;

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v) => (typeof v === 'string' ? v : '');

function shellCommand(ti) {
  const cmd = typeof ti === 'string' ? ti : isObj(ti) ? (ti.command ?? ti.cmd) : undefined;
  if (typeof cmd === 'string') return cmd;
  if (Array.isArray(cmd) && cmd.every((a) => typeof a === 'string')) {
    const n = cmd.length;
    return n >= 3 && SCRIPT_FLAG.test(cmd[n - 2]) ? cmd[n - 1] : cmd.join(' ');
  }
  return '';
}

function patchText(ti) {
  if (typeof ti === 'string') return ti;
  if (!isObj(ti)) return '';
  for (const v of [ti.command, ti.input, ti.patch]) {
    if (typeof v === 'string' && v.includes(PATCH_BEGIN)) return v;
  }
  return str(ti.command) || str(ti.input) || str(ti.patch);
}

// One { path, content } per file the patch writes, in patch order. An Update
// with a Move to gives two: the source, then the destination with the same
// content. A Delete gives its path with no content.
function parsePatch(text) {
  const files = [];
  let current = null;
  for (const raw of String(text).split('\n')) {
    const line = raw.replace(/\r$/, '');
    const m = PATCH_HEADER.exec(line.trim());
    if (m) {
      const [, op, p] = m;
      if (op === 'Move to') {
        if (current && current.op === 'Update File') current.moveTo = p.trim();
        continue;
      }
      current = { op, path: p.trim(), lines: [] };
      files.push(current);
      continue;
    }
    if (current && current.op !== 'Delete File' && line.startsWith('+')) current.lines.push(line.slice(1));
  }
  const out = [];
  for (const f of files) {
    const content = f.lines.join('\n');
    out.push({ path: f.path, content });
    if (f.moveTo) out.push({ path: f.moveTo, content });
  }
  return out;
}

// The Write events for a patch. A text that holds no file header still has
// its content scanned, under no path: a shape this parser misread must not
// cost the hard-secret deny.
function patchEvents(text, base) {
  const files = parsePatch(text);
  if (!files.length) return text ? [{ ...base, tool: 'Write', toolInput: { file_path: '', content: text } }] : [];
  return files.map((f) => ({ ...base, tool: 'Write', toolInput: { file_path: f.path, content: f.content } }));
}

// Codex's hook input into evaluate()'s events: none, one, or one per file.
function normalizeCodex(input, fallbackCwd) {
  if (!isObj(input)) return [];
  const event = str(input.hook_event_name);
  if (event !== 'PreToolUse' && event !== '') return [];
  const tool = str(input.tool_name);
  const ti = input.tool_input;
  const base = {
    event: 'PreToolUse',
    cwd: typeof input.cwd === 'string' && input.cwd ? input.cwd : fallbackCwd,
    session: str(input.session_id),
    toolUseId: input.tool_use_id,
    agentId: input.agent_id,
    agentType: input.agent_type,
    transcriptPath: input.transcript_path,
  };
  if (SHELL_TOOLS.has(tool)) {
    const command = shellCommand(ti);
    const shell = { ...base, tool: 'Bash', toolInput: { command } };
    return command.includes(PATCH_BEGIN) ? [shell, ...patchEvents(command, base)] : [shell];
  }
  if (PATCH_TOOLS.has(tool)) {
    const text = patchText(ti);
    if (text) return patchEvents(text, base);
    // Not a patch at all: a Claude-style file write, if that is what came.
    if (isObj(ti) && (typeof ti.file_path === 'string' || typeof ti.path === 'string')) {
      return [{ ...base, tool: 'Write', toolInput: { file_path: ti.file_path ?? ti.path, content: str(ti.content) || str(ti.new_string) } }];
    }
  }
  return [];
}
// ---- end of the assumed input shapes ----

function codexEnv() {
  return { logDir: null, legacyLogDir: undefined, projectDir: undefined, home: os.homedir() };
}

// The decision in the shape Codex reads on stdout, or null for none. Only a deny
// of an `enforce` kind is output: never an ask, which Codex would run anyway.
function codexOutput({ decision, kind, reason }) {
  if (decision !== 'deny' || CODEX_GATE_MODES[kind] !== 'enforce') return null;
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } };
}

function main() {
  let core;
  try {
    core = require('./canonkit-hook.js');
  } catch (e) {
    process.stderr.write(`canonkit: cannot load canonkit-hook.js beside canonkit-codex.js (${e && e.code || 'error'}); the Codex gates are off until canonkit is reinstalled.\n`);
    process.exit(0);
  }
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch (_) {}
  let input = null;
  try { input = JSON.parse(raw); } catch (_) {}

  const env = codexEnv();
  for (const evt of normalizeCodex(input, process.cwd())) {
    const out = codexOutput(core.evaluate(evt, env));
    if (out) {
      process.stdout.write(JSON.stringify(out));
      break; // the first deny wins
    }
  }
  process.exit(0);
}

function run() {
  try { main(); } catch (_) { process.exit(0); /* fail-open */ }
}

module.exports = { run, normalizeCodex, parsePatch, codexOutput, CODEX_GATE_MODES };

// Run only as the hook itself; required anywhere else, nothing runs.
if (require.main === module) run();
