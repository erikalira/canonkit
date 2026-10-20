---
name: openspec
bin: openspec
pin: 1.14.0
requires: Node >= 20.19
install:
  - npm install --global --ignore-scripts @fission-ai/openspec@{pin}
setup:
  - init --tools claude,codex
touches:
  - openspec/ (config.yaml, specs/, changes/)
  - .claude/skills/openspec-*, .claude/commands/opsx/ and .agents/skills/openspec-*
  - its own user config (openspec/config.json under %APPDATA% or $XDG_CONFIG_HOME)
env:
  - OPENSPEC_TELEMETRY=0
  - DO_NOT_TRACK=1
notes:
  - openspec sends anonymous usage telemetry by default; canonkit turns it off for its own runs only. Set OPENSPEC_TELEMETRY=0 or DO_NOT_TRACK=1 yourself for the rest.
undo:
  - remove the openspec skills and commands it wrote under .claude/ and .agents/, if you no longer want them
---
OpenSpec holds durable change state (normally openspec/changes/ and openspec/specs/); CanonKit governs risk, owners and reviews; Graphify supplies code evidence.
Keep scope, acceptance criteria, decisions and progress in the selected change's existing artifacts, not a parallel PRD, implementation plan or spec.
Use the orchestrate skill's OpenSpec change lifecycle: LOW stays inline; MEDIUM/HIGH require acceptance, applicable reviews and Spencer's drift check before sync/archive.
