# Legacy two-target stack-pack install

A genuine schema-1 install written by the two-target CLI (targets `.agents` and `.claude` only), before the `.github` target was added in `2861645`.

- Baseline commit: `1637bbd` (`bin/stack-packs.js`, `stack-packs/react/SKILL.md`, `stack-packs/go/SKILL.md`).
- Command: `node test/fixtures/stack-packs-legacy/generate.mjs` (runs the baseline module in a temp project: add `react`, then add `go`).
- Generated: 2026-11-11.
- Contents: `project/.canonkit/stack-packs.json` with four entries (`react` and `go`, each for `agents` and `claude`) and the four matching `SKILL.md` copies.

The bytes are stored exactly (`-text` in `.gitattributes`) because the receipt holds SHA-256 hashes of the copies. Do not hand-edit; regenerate with the command above. This directory is test-only and is not part of the published package (`files` in `package.json`).
