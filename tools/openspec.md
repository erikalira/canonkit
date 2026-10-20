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
Specs and acceptance criteria live in openspec/ (changes/ for proposals, specs/ for what is true now), not in a parallel doc.
Scott owns what a change must achieve; Spencer owns whether the spec still matches the code.
