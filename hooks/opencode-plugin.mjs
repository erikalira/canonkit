/**
 * canonkit — the OpenCode 2 plugin. Installed as plugins/canonkit.js in the
 * OpenCode config folder (bin/cli.js: OPENCODE_PLUGIN), beside a canonkit/
 * folder holding HOOK_FILES.opencode.
 *
 * It holds no gate logic: it loads ../canonkit/canonkit-opencode.js and
 * registers file gates on tool `execute.before` and shell gates on
 * `shell.create.before`, after OpenCode resolves the shell executable. The only
 * export is the V2 definition, { id, setup } (Plugin.define returns its
 * argument, so no @opencode/plugin dependency is needed). OpenCode 1 plugins
 * are a different API and are not supported.
 *
 * setup never throws: a load failure disables both gates; a registration
 * failure disables only that domain. Each failure writes one diagnostic line.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function warn(what, e, coverage = 'OpenCode gates') {
  try {
    process.stderr.write(`canonkit: ${what} (${(e && e.code) || (e && e.message) || 'error'}); the ${coverage} are off until canonkit is reinstalled.\n`);
  } catch (_) {}
}

export default {
  id: 'canonkit',
  async setup(ctx) {
    let adapter;
    try {
      adapter = require('../canonkit/canonkit-opencode.js');
    } catch (e) {
      warn('cannot load ../canonkit/canonkit-opencode.js beside plugins/canonkit.js', e);
      return;
    }
    try {
      await ctx.tool.hook('execute.before', (event) => {
        // Read on every call: the plugin instance's directory, '' when missing
        // (the core counts every file as in the project then, the stricter side).
        let cwd = '';
        try {
          // Shells are checked once, after the runtime resolves their dialect.
          if (event && (event.tool === 'shell' || event.tool === 'bash')) return;
          const dir = ctx && ctx.location && ctx.location.directory;
          if (typeof dir === 'string') cwd = dir;
        } catch (_) {}
        adapter.onExecuteBefore(event, cwd);
      });
    } catch (e) {
      warn('cannot register the execute.before hook', e, 'OpenCode file gates');
    }
    try {
      await ctx.shell.hook('create.before', adapter.onShellCreate);
    } catch (e) {
      warn('cannot register the shell.create.before hook', e, 'OpenCode shell gates');
    }
  },
};
