# Handoff — lessons from ECC (affaan-m/ecc v2.2.3)

Source: comparison session on 2026-10-29. ECC was read at commit `25278e7`.

## Adopt (fits canonkit's purpose)

1. **Reviewer pre-report gate** (Quinn, Gard, Archie). Before a finding: cite file:line,
   name the concrete failure (input, state, outcome), say why existing guards don't catch
   it; HIGH needs all three or is demoted; zero findings is a valid review. Fold in a short
   "known false positives" list only where an eval shows the miss (was ECC lesson 7).
   Measure: add quality-eval cases with a clean diff (expect zero findings) and a bait diff.
   Reference: ECC `agents/code-reviewer.md`, sections "Pre-Report Gate" and
   "HIGH / CRITICAL Require Proof".
2. **Fact-forcing text on the existing HIGH-risk edit gate only**: ask for importers,
   public contract touched and rollback, instead of a bare confirm. Not on every edit.
   Reference: ECC `scripts/hooks/gateguard-fact-force.js`.
3. **Block `--no-verify` / `--no-gpg-sign` in the hook** (Bash and PowerShell). Today
   `hooks/canonkit-hook.js` does not. Optional, separate decision: let `canonkit.json` list
   lint/test config paths as gated (no default list).
4. **One line in `skills/orchestrate/SKILL.md`**: a subagent returns its result, never
   "waiting on children".

## Rejected (would break the purpose)

- Hook profiles / per-hook disable env vars: a side door around `[ENFORCED]` gates;
  `canonkit.json` already tunes paths, and editing it is gated.
- PreCompact/SessionStart auto-handoff: a hook has no model to write a meaningful
  handoff; the ~100k/150k/200k reminder already covers it.

## Docs for humans (user priority)

README is 1093 lines, mixes Portuguese and English, and ~700 lines of "Install" are
reference. Goal: English only, written for a person deciding and installing, details
moved to `docs/`. Spencer owns this (veto on confusing docs).

## Routing

- Items 1, 2, 4 touch agent/skill/hook files → Virgo's domain; hook gate change → Quinn
  reviews after the last edit (the Stop gate requires it).
- README restructure → Spencer.
