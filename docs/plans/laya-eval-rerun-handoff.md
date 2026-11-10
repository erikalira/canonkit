# Handoff: Laya version check, eval rerun, and new-resource exploration

## Goal
In a fresh session with the Laya MCP connected, (1) verify which Laya version the MCP actually uses and resolve the observed version divergence, (2) rerun the existing Laya eval battery and compare with the prior run, (3) try/apply newly available Laya resources where they fit CanonKit’s experimental/advisory rules.

## Prior evidence (this session, 2026-11-09)
- MCP `laya_status` reported: `laya 0.4.30`, `torch 2.15.0+cpu`, `transformers 5.22.2`, CPU, checkpoints `english`+`multilingual` loaded.
- Local venv check reported divergence: `C:\Tools\laya\.venv` `pip show laya` = `0.4.0`, `pip index versions laya` latest `0.4.30`. Confirm whether `C:\Tools\laya\.venv\Scripts\laya-mcp-server.exe` loads the same package the MCP reports; if not, upgrade the environment the MCP uses and restart/reload the MCP.
- Eval artifacts (synthetic, pre-labeled; scorer offline): `evals/laya-plan.json` (34 cases, 8 tools), `evals/laya-audit-2026-11-09.json`, `evals/audits/laya-score-2026-11-09.json`. Scorer/unit tests: `scripts/eval-laya.mjs`, `evals/laya-cases.mjs`, `test/eval-laya.test.js` (12/12 passing).

## Prior score snapshot
- 34/34 records: 31 `CALLED`, 2 `EXPECTED_REJECTION` (ok), 1 `CONTRACT_FAILED`.
- Predictions: 35 `CORRECT`, 9 `ABSTAINED`, 1 `INCORRECT`. Comparisons: 3 `MATCH`.
- Strengths: owner suggestion/routing (EN/PT), typed ticket primitives, schema decide values, shortlist 25→5, option-order stability, batch equivalence, reported-evidence signal (tests reported vs not), most presets/guardrails.
- Issues to revisit:
  - `handoff-question-wording` (HIGH handoff): 8/8 abstained at `min_confidence=0.8` with `laya_decide` (legacy+described, complete+incomplete). Integration works; **useful handoff signal not demonstrated** with that formulation/threshold.
  - `preset-model_router-tools`: `needs_tools` incorrect (`noul=0.277`, expected true) — do not promote without calibration/cases.
  - `context-budget`: scorer expected `usage.truncated=true` with `max_len=64`; response lacked `usage.truncated` → `CONTRACT_FAILED`. Confirm 0.4.30 contract/semantics and fix case or expectation if warranted.

## CanonKit rules to respect
- Laya is **advisory**: never approval, never waives HIGH independent review/owners/evidence checks. Record actual calls, results, abstentions, failures; separate adoption from model quality.
- HIGH handoff experiment is installed in `skills/orchestrate/laya-handoffs.md`, `skills/orchestrate/SKILL.md`, `reference/agents-block.md`; local Claude/Codex refs were synced earlier. Re-sync with `node bin/cli.js reference --claude --codex` only if instruction files change.
- Good candidates (advisory): owner-candidate suggestion, shortlist, reported-evidence signal. Avoid: token-savings file selection, automatic gates, uncalibrated model_router decisions.

## New resources to try (verify exposure in 0.4.30 MCP)
- Tools already exposed but not fully covered by plan: `laya_tournament`, `laya_predict_long` — add synthetic labeled cases/checks if useful; keep scorer honest (contract/prediction/comparison, abstention != error, missing call != bad model).
- 0.4.30/docs capabilities worth probing if exposed: per-field/confidence calibration behavior, `lang_guess`/routing details, `max_len`/`head_max_len` truncation reporting, calibration/Vega-related flows, multimodal only if server supports it (do not fabricate).
- For HIGH handoffs, prototype alternatives (e.g., `laya_predict` choice+noul per dimension, clearer instructions, calibrated threshold) and compare abstention vs correctness on fixtures before changing CanonKit rules.

## First steps for the new session
1. Run `laya_status`; compare with `pip show laya` / server executable environment at `C:\Tools\laya\.venv`. Resolve divergence if present, restart/reload MCP, recheck status.
2. Read this handoff + `evals/laya-plan.json` + `evals/audits/laya-score-2026-11-09.json`.
3. Re-execute all plan cases via MCP, write a new dated audit/score under `evals/audits/`, run `node scripts/eval-laya.mjs --score ...` and `node --test test/eval-laya.test.js`.
4. Explore exposed new/underused tools (`laya_tournament`, `laya_predict_long`, others visible), add minimal synthetic cases if they fit, and report measured deltas vs prior snapshot.
5. Summarize: version/resolution, regressions/improvements, handoff abstention findings, and concrete CanonKit instruction updates worth making (advisory, evidence-backed).
