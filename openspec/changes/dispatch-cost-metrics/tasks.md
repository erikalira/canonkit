# Tasks

Risk: MEDIUM (additive log-format change in a hook that runs in every project). Implementer: Bob. Acceptance criteria: `proposal.md`.

## 1. Hook

- [x] 1.1 `scanTranscript`/`usageTotals`: add `cache_creation_5m`, `cache_creation_1h` (null without the split) and `first_call` (first call in file order, deduplicated by message id).
- [x] 1.2 `SubagentStop`: when no handback is found, rescan every 100 ms on file growth for at most 1.5 s; log `complete` on the background `agent_end`.
- [x] 1.3 `agent_start.brief_chars` and `agent_resume.message_chars` (lengths only).

## 2. Tests

- [x] 2.1 Split present and absent; `first_call` with a call split over entries.
- [x] 2.2 Handback appended late (within the window), never appended (flag, bounded time), already present (no wait).
- [x] 2.3 `brief_chars`/`message_chars` present and absent; no text in the log line.

## 3. Docs and validation

- [x] 3.1 `docs/telemetry.md` field table and `CHANGELOG.md` Unreleased.
- [x] 3.2 After the last edit: full `npm test`, `git diff --check`, `graphify update .`; record outcomes here.
  - Outcomes (2026-11-18, after the last code/doc edit): `npm test` 1278 tests, 1255 pass, 2 fail, 21 skipped. The 2 failures are `test/check-roster.test.js` "README roster: authority drift" and a README security-settings test; neither touches files of this change (README.md, reference/ unmodified), so they look pre-existing, but this was not confirmed on a clean tree. `git diff --check`: clean. `graphify update .`: graph updated (a registry.npmjs.org network denial was reported by the sandbox, unrelated). `test/canonkit-hook.test.js` + `test/dashboard.test.js`: 219 tests, 214 pass, 0 fail, 5 skipped. Confirmed pre-existing: the same 2 tests fail on a clean export of HEAD 15e9744 (`test/check-roster.test.js` + `test/validate.test.js`: 14 tests, 12 pass, 2 fail).
- [ ] 3.3 After install, confirm on one real background dispatch that `report_chars` is non-null, `complete` is true and `api_calls` matches the transcript. Pending until then: UNVERIFIED in production.
  - Attempt 2026-11-18 (session 3ea4d455, background Archie dispatch): no event of any kind (`prompt`, `agent_start`, `agent_end`) was written for that session; the last line in `events.jsonl` predates the dispatch. The hook did not fire or could not write in that session; cause not diagnosed (user `settings.json` is not readable from the sandbox). Still open.
