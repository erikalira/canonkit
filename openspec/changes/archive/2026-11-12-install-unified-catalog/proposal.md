## Why

`canonkit install` only offers the harnesses (Claude Code, Codex, OpenCode, Copilot). Everything else canonkit can install lives behind separate commands the user has to already know about: domain specialists and stack packs through `canonkit add <name>`, optional tools through `canonkit tool add <name>`. Today the install ends with a text hint ("Domain specialists are per project: npx canonkit add <name>"), so a new user never sees that specialists, stacks or tools exist unless they read the docs or run `canonkit list`.

## What Changes

- The interactive `canonkit install` menu becomes a single guided flow that offers, after the harness choice, every installable category: **tools** (graphify, openspec), **domain specialists** (maya, nova, echo, dana, iris) and **stack packs** (typescript, python, react, ... ).
- Specialists, stacks and tools are project-scoped, so the project steps run against the current directory and are offered only when it is a valid target (a project that is not canonkit itself).
- The catalog shown in the menu is read from the same sources as `canonkit list` (agent files, `STACK_PACK_IDS`, `tools/*.md`), with each item's current state (installed / partial / active / not on PATH), so the menu cannot drift from what `add` and `tool add` accept.
- Each selection is executed by the existing `add` / `tool add` code paths; the menu adds no new installer.
- A non-interactive install (flag, script, CI, tests) behaves exactly as today. A flag form to select project items without a terminal is added (see design).
- The closing hint of install lists what was not chosen and the command to add it later.

## Capabilities

### New Capabilities
- `install-unified-catalog`: what the install flow offers beyond harnesses (tools, specialists, stacks), when it offers them, how selections are applied, and how the flow behaves when cancelled, non-interactive, dry-run or outside a valid project.

### Modified Capabilities
<!-- none: stack-pack-project-targets (where a pack's files go) is unchanged -->

## Impact

- Code: `bin/cli.js` (`chooseTargets`/install case, `list`, `toolList`, `changeProject`), a small shared catalog reader; `bin/stack-packs.js` only read.
- Docs: `docs/install.md`, `docs/tools.md`, README install section, the closing install hint.
- Tests: `test/e2e` install scenarios, a menu test with `prompts` injected answers (the existing `chooseTargets` test pattern).
- No new dependency (`prompts` is already used for the menu). No change to receipts, manifests or security policy writes.
