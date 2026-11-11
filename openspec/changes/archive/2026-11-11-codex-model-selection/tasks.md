# Tasks

## 1. Baseline and discovery

- [x] 1.1 Confirm `runtime-model-discovery` is complete on the implementation base and record the branch, relevant diff and spec-sync dependency; verify its focused tests and `openspec status` before changing Codex behavior.
- [x] 1.2 Implement Codex discovery through the bounded trusted runner, parsing only model IDs and per-model efforts; verify fixtures for valid, malformed, timed-out, missing and bundled-equivalent output, with no instructions or messages stored in the catalog.
- [x] 1.3 Label Codex discovery experimental and account availability unconfirmed in `models refresh` output and docs; verify `models refresh --codex` works with the installed CLI and a fresh `CODEX_HOME` without claiming account access.

## 2. Choice interface and diagnosis

- [x] 2.1 Extend `models setup --codex` to ask for a model first and offer only that model's efforts, including the unknown-model and incompatible-current-value cases; verify scripted asker tests for each path and cancellation without writes.
- [x] 2.2 Offer Codex setup in interactive install when selected and keep non-terminal, flagged and dry-run behavior non-interactive; verify install command tests and a real terminal walkthrough on Windows.
- [x] 2.3 Extend `models show` and `doctor` for Codex sources, unverified choices, incompatible pairs and uncertainty when one field inherits; verify both commands start no Codex process and retain their existing exit behavior.

## 3. Generated agents and project reach

- [x] 3.1 Write resolved Codex values as safely quoted `model` and `model_reasoning_effort` in generated TOML; verify no choice, configured pair, changed pair, cleared choice and known-incompatible-pair tests.
- [x] 3.2 First verify with the Codex CLI that a project agent wins when it shares a name with a user agent; if confirmed, extend the existing project-scoped manifest with fixed core-shadow entries. Verify root containment, refusal of `.codex` links/junctions, preservation of preexisting same-name agents, project dispatch behavior, and receipt-checked cleanup on reinstall and `uninstall --project` without removing user edits. If precedence differs, revise the design before implementing this task.
- [x] 3.3 Apply project-merged Codex choices to project specialists; verify `add` from a project, partial field overrides and safe handling of project configuration links.
- [x] 3.4 Validate Codex runtime behavior with an observable trace or equivalent client-reported effective model and effort for a plain agent, an explicit spawn override and a custom agent file; record what remains unobservable rather than treating accepted spawn parameters as proof.

## 4. Guidance and delivery checks

- [x] 4.1 Update `skills/orchestrate/SKILL.md`, the managed Codex block, installation docs and README for Codex choices, project-scoped files and field precedence; verify instruction validators and documented commands.
- [x] 4.2 Prepare release notes covering the new Codex behavior and required reinstall, with no guessed version; verify links and keep the parent change's 3.0.0 history accurate.
- [x] 4.3 Run affected tests, cross-module smoke, full suite and validators after the last edit, then `graphify update .`; record exact results and work state.
- [x] 4.4 Obtain Archie review of the agent-file and project-shadow contract, Gard review of the subprocess and project trust boundary, and independent post-edit review; resolve findings, rerun affected checks, and record an integration review and documentation drift check in this change.

## Workflow follow-up

- Reconcile the two `model-selection` deltas before syncing to the main spec; archive only after implementation and review are complete and when requested.
- Ask before commit or push.

## Baseline evidence

On branch `feat/runtime-model-discovery`, HEAD `fe57a6d` contains the base implementation (`git diff main...HEAD`: model discovery/config/command modules, CLI integration, tests and docs). The base change reports 32/32 tasks complete as of 2026-11-10, with its final review and test evidence in its `tasks.md`. Focused `model-discovery` and `models-command` tests passed 38/38 before Codex edits. Both changes have a `model-selection` delta; reconcile them before main-spec sync or archive. This change's planning artifacts and the README correction are uncommitted.

## Codex runtime evidence

CLI 0.166.0 interactive spawn of `archie` read the project `.codex/agents/archie.toml` marker over the same-name global agent; its child rollout contained the marker in developer instructions and the child response. A child without model fields recorded `gpt-6-luna`/`low` in `turn_context`. A direct `spawn_agent` override recorded `gpt-6-luna`/`high` in the child rollout (`01a1c615-4329-7941-8bad-53af49391f68`). A project custom agent file pinned `gpt-6-luna`/`medium` against a `low` parent and the child rollout recorded `medium` (`01a1c616-7688-7821-b605-cba3c95f011f`). Temporary project files were removed. These traces establish the effective fields for these probes, not account availability for every catalog model.

## Final verification (2026-11-10, after last edit)

`npm test`: 985 tests, 981 pass, 0 fail, 4 skipped. `npm run validate` (portable): passed with 1 warning; Bash syntax validation not run (partial coverage). `graphify update .`: rebuilt 2368 nodes, 4084 edges, 181 communities. Work state: all tasks complete; changes uncommitted; two `model-selection` deltas still need reconciliation before sync/archive.

## Integration and documentation review

Archie reviewed the agent-file and project-shadow contract; Gard reviewed the subprocess and project trust boundary; Quinn independently reviewed acceptance coverage; Spencer checked documentation and release drift. Their findings on missing/stale shadow diagnosis, current source instructions, two incompatible pairs, and the spawn parameter name were corrected and re-reviewed. All four approved after the last behavioral edit. The cross-discipline pass found no conflicting recommendation: setup choices flow through compatibility checks to user or project TOML, and show/doctor read the receipt and generated file to distinguish resolution from installed state. Account access remains unconfirmed by discovery. The README, install guide, managed Codex block, orchestrate guidance, ADR and draft release note match the implementation; the 3.0.0 release history remains unchanged. No version was chosen. The two `model-selection` deltas still need reconciliation before main-spec sync; archive, commit and push were not requested.
