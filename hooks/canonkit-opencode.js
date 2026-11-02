/**
 * canonkit — the OpenCode adapter for the hook's core (OpenCode 2 only).
 *
 * Loaded in-process by the plugin (hooks/opencode-plugin.mjs, installed as
 * plugins/canonkit.js), which registers file gates on tool `execute.before`
 * and onShellCreate on `shell.create.before`. Runs event -> normalizeOpencode -> evaluate()
 * (canonkit-hook.js, installed beside this file) -> a throw or nothing.
 *
 * WHAT OPENCODE CAN ENFORCE FROM HERE. A throw in either before-hook refuses the
 * call. File-tool errors carry the reason; shell-error presentation depends on
 * OpenCode's hook bridge. There is no softer
 * answer from this hook, so only the kinds OPENCODE_GATE_MODES marks `enforce`
 * throw; every other kind is left to the opencode-block text and the model's
 * judgment (commit/push prompting is OpenCode permission config, slice 11).
 *
 * IN-PROCESS, SO NOTHING ELSE. This runs inside the OpenCode server: no stdin,
 * no stdout, no process.exit, no log (the env passes logDir: null and the
 * `logs` evaluate() returns are dropped).
 *
 * ERROR CONTRACT. onExecuteBefore throws `new Error(reason)` on a deny of an
 * `enforce` kind and on nothing else: every internal error is swallowed, so a
 * bug here lets the call through (fail-open) and never blocks one. The decision
 * is taken inside a try and the throw happens outside it, so the intended throw
 * is never swallowed.
 *
 * The core is required at load: a missing canonkit-hook.js makes this file fail
 * to load, which the plugin catches (one line on stderr, no hook registered).
 * Loading runs nothing else.
 */
const os = require('os');
const core = require('./canonkit-hook.js');

// What OpenCode does with each kind (the modes are documented beside
// CLAUDE_GATE_MODES in canonkit-hook.js). The same as Codex: only a deny reaches
// OpenCode from a plugin hook. The asks become text; the Stop gate, the
// context-size reminder and the dispatch log are not offered.
const OPENCODE_GATE_MODES = Object.freeze({
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

// ---- OPENCODE'S INPUT, AS ASSUMED (2.2, from the V2 docs) ----
// Every assumption about the shape of OpenCode's hook event is in this block, so
// a real capture corrects it in one place. Slice 9 (opencode v2.1.4, Windows,
// test/fixtures/opencode/) confirmed the event keys, shell and write, and saw
// subagent and execute calls; edit and patch are still from the docs.
// Sources, read 2026-10-31 in github.com/anomalyco/opencode (branch dev):
// packages/plugin/src/promise/tool.ts (the `execute.before` event type),
// services/www/src/docs/content/build/plugins/server.mdx (Tools, Lifecycle),
// services/www/src/docs/content/build/plugins/migrate-v1.mdx ("V1 plugin
// implementations do not run in V2"), services/www/src/docs/content/tools.mdx
// (tool ids and arguments). OpenCode 1's `tool.execute.before(input, output)`
// is not supported: there is no V1 path here.
//   event    one mutable object per call: tool, sessionID, agent, messageID,
//            id (the call id), input (the tool's arguments, typed unknown). No
//            cwd: the plugin passes ctx.location.directory, '' when missing.
//   shell    tool "shell", input.command a string. A command that carries a
//            patch (`*** Begin Patch`) is gated as a patch too. In the plugin,
//            shell.create.before supplies the resolved shell and actual cwd;
//            execute.before skips shell calls so no wrong-dialect check runs first.
// Source for the resolved invocation: OpenCode v2.1.4 packages/core/src/shell.ts
// and packages/plugin/src/promise/shell.ts, inspected 2026-11-02.
//   edit     tool "edit", input { path, oldString, newString, replaceAll }.
//   write    tool "write", input { path, content }; path as the model wrote
//            it, relative to the instance directory when relative.
//   patch    tool "patch", input.patchText in the apply_patch grammar (offered
//            to GPT models only); read with the core's patchWrites.
//   aliases  `filePath` is accepted for `path`, tool `bash` for `shell`, and an
//            input that arrives as a JSON string is parsed (defensive only).
//   other    any other tool (read, subagent, execute, ...) is not gated. A
//            subagent's own calls reach this hook as their own events, with
//            the child's sessionID and agent. execute's input is { code }.
const PATCH_BEGIN = '*** Begin Patch';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v) => (typeof v === 'string' ? v : '');
const pathOf = (input) => str(input.path) || str(input.filePath);

// The tool's arguments as an object. OpenCode repairs a JSON-string input
// before plugin hooks run (ToolInputRepair), but that is unverified until a
// capture: a string is parsed here, and one that is not JSON for an object
// gives no event (fail-open).
function inputOf(input) {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input);
  } catch (_) {
    return null;
  }
}

// One OpenCode hook event into evaluate()'s events: none, one, or one per file.
function normalizeOpencode(event, cwd, { shell, platform = process.platform } = {}) {
  if (!isObj(event)) return [];
  const tool = str(event.tool);
  const input = inputOf(event.input);
  if (!isObj(input)) return [];
  const base = {
    event: 'PreToolUse',
    cwd: str(cwd),
    session: str(event.sessionID),
    toolUseId: event.id,
  };
  const patchEvents = (text) => core.patchWrites(text).map((f) => ({ ...base, tool: 'Write', toolInput: { file_path: f.path, content: f.content } }));

  if (tool === 'shell' || tool === 'bash') {
    const command = str(input.command);
    const evt = { ...base, tool: core.shellTool(shell, platform), toolInput: { command } };
    return command.includes(PATCH_BEGIN) ? [evt, ...patchEvents(command)] : [evt];
  }
  if (tool === 'edit') {
    return [{ ...base, tool: 'Edit', toolInput: { file_path: pathOf(input), new_string: str(input.newString) } }];
  }
  if (tool === 'write') {
    return [{ ...base, tool: 'Write', toolInput: { file_path: pathOf(input), content: str(input.content) } }];
  }
  if (tool === 'patch') {
    const text = str(input.patchText);
    return text ? patchEvents(text) : [];
  }
  return [];
}
// ---- end of the assumed input shapes ----

function opencodeEnv() {
  return { logDir: null, legacyLogDir: undefined, projectDir: undefined, home: os.homedir() };
}

// The reason to refuse the call with, or null for none. Only a deny of an
// `enforce` kind refuses: never an ask, which a plugin hook cannot make.
function opencodeDecision({ decision, kind, reason } = {}) {
  if (decision !== 'deny' || OPENCODE_GATE_MODES[kind] !== 'enforce') return null;
  return String(reason || 'canonkit gate: blocked.');
}

// Shared file/resolved-shell evaluation. Throws Error(reason) on the first deny of an
// `enforce` kind; returns on everything else, internal errors included.
function onExecuteBefore(event, cwd, options) {
  let reason = null;
  try {
    const env = opencodeEnv();
    for (const evt of normalizeOpencode(event, cwd, options)) {
      reason = opencodeDecision(core.evaluate(evt, env));
      if (reason) break; // the first deny wins
    }
  } catch (_) {
    reason = null; // fail-open
  }
  if (reason) throw new Error(reason);
}

// The shell runtime has resolved the executable here; tool.execute.before has
// only a generic shell name and cannot distinguish Bash from PowerShell.
function onShellCreate(invocation) {
  let event, cwd, shell;
  try {
    if (!isObj(invocation)) return;
    event = { tool: 'shell', input: { command: invocation.command } };
    cwd = invocation.cwd;
    shell = invocation.shell;
  } catch (_) { return; }
  onExecuteBefore(event, cwd, { shell });
}

module.exports = { normalizeOpencode, opencodeDecision, onExecuteBefore, onShellCreate, OPENCODE_GATE_MODES };
