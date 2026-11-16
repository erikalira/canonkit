---
name: openspec
bin: openspec
pin: 1.14.0
requires: Node >= 20.19
install:
  - npm install --global --ignore-scripts @fission-ai/openspec@{pin}
setup:
  - init --tools {harness}
harness:
  - claude: .claude/skills/openspec-*, .claude/commands/opsx/
  - codex: .agents/skills/openspec-*, .agents/skills/.openspec-target
  - opencode: .opencode/skills/openspec-*, .opencode/commands/opsx-*.md
  - github-copilot: .github/skills/openspec-*, .github/prompts/opsx-*.prompt.md (usually committed; shared with the team)
defaultharness: claude,codex
touches:
  - openspec/ (config.yaml, specs/, changes/archive/)
  - openspec's own user config ($XDG_CONFIG_HOME/openspec/config.json; %APPDATA% on Windows): not written by a first init; a re-run in an already initialized project writes it
env:
  - OPENSPEC_TELEMETRY=0
  - DO_NOT_TRACK=1
notes:
  - openspec sends anonymous usage telemetry by default; canonkit turns it off for its own runs only. Set OPENSPEC_TELEMETRY=0 or DO_NOT_TRACK=1 yourself for the rest.
undo:
  - canonkit cannot remove the integrations openspec wrote, and openspec init --tools none removes nothing: delete the openspec-* skills and opsx commands under .claude/, .agents/, .opencode/, .github/ yourself
---
OpenSpec holds durable change state (normally openspec/changes/ and openspec/specs/); CanonKit governs risk, owners and reviews; Graphify supplies code evidence.
Keep scope, acceptance criteria, decisions and progress in the selected change's existing artifacts, not a parallel PRD, implementation plan or spec.
Use the orchestrate skill's OpenSpec change lifecycle: LOW stays inline; MEDIUM/HIGH require acceptance, applicable reviews and Spencer's drift check before sync/archive.
