# Evals

`validate.sh` proves the instructions are well-formed; it does not prove they
work. Two evals measure behavior: the **routing eval** (does the main model call
the right owner, and keep LOW work inline?) and the **quality eval** (does an
agent's body find the defect, without inventing a block on LOW?). Both spend API
credit, so they run by hand before a release, never in `npm test`.

## Routing eval

It runs each case in `evals/routing-cases.json` with `claude -p` in a throwaway
copy of a fixture repository and records whom the main model dispatches.

```bash
npm run eval -- --dry-run          # shows the plan, calls nothing
npm run eval                       # every case, once
npm run eval -- --runs 3           # repeat to see variance
npm run eval -- --only high-auth --save out/   # keep the transcript
```

- A `PreToolUse` hook denies every dispatch: the decision stays in the stream and
  the subagent never runs, so a case costs one conversation, not a whole team.
  `--budget` caps each case (default US$ 0.50).
- It runs in plan mode. Headless, a gate's confirmation has nobody to answer it,
  and editing a HIGH-risk file is refused before the "after the last edit" review
  comes due — the eval would be measuring the gate, not the instructions. While
  planning, nothing is edited and no gate fires: what remains is the question the
  eval answers, whether the instructions alone make the model call the domain
  owner and keep LOW inline.
- It measures what is **installed**, not the clone, and warns when the two
  diverge: run `node bin/cli.js install` first to measure the working tree. Codex
  is out of scope; `npm test` tests the parser, the judge and the case file.
- The model is not deterministic: with `--runs 3`, a case only holds if it passes
  2 of 3 of the answered runs. A run the model never got to answer (usage limit,
  rate limit, API error) comes out as `ERROR` and stays out of the count — an
  outage is not a routing regression. `--model` pins the main loop's model;
  `--rescore <dir>` re-judges saved transcripts without calling anything.
- Plan mode writes the plan to `~/.claude/plans`; the eval deletes exactly the
  files it wrote itself.

### Case format

Each case declares `includes` / `includesAny` (the agent must be dispatched **or**
appear as a step of the plan — the team's review comes after the last edit, so
planning it is the right behavior), `excludes` (must not be dispatched), `avoids`
(neither dispatched nor planned), `none` (no team agent dispatched; plan mode's
built-ins do not count) and `says` (a regex the answer must contain). "Appearing
in the plan" is strict: the name in agent form ("Gard", `**gard**`, `` `gard` ``)
in a sentence without negation — "pipe the output" and "no need for Gard" do not
count. The cases cover LOW work that must stay inline, the HIGH surfaces (auth,
migration, public contract, budget) and an absent specialist that must be declared
ownerless, not invented.

The `openspec-*` cases use state supplied in the prompt to cover LOW inline, a
MEDIUM handoff with a custom schema, and a HIGH close blocked by tests, a stale
review and a pending sync. They reuse the same judge; they do not run sync or
archive.

The optional `dispatch` check measures the configuration requested in a real
`Agent` or `Task` call: for example,
`"dispatch": {"agent": "gard", "model": "sonnet", "effort": "medium"}`. Every call
to the named agent must match; citing the configuration in the plan does not pass
this check. Fields omitted from the expectation are not evaluated; `null` requires
the absence of an override, preserving the agent definition's defaults. That makes
it possible to evaluate runtimes that do not send `effort` without inventing the
field: leave it out of the expectation. If you require `"effort": "high"` and it
does not come, the case fails. The parser and the summary keep the overrides, with
`null` / `inherited` for absence; they do not infer the model or effort actually
executed, because the hook denies the dispatch before execution. Newer cases cover
a structural decision (up), a requested mechanical check (down), ad-hoc with no
overrides, and LOW without delegation. `--rescore` applies the same checks to saved
transcripts, old ones included.

### Results: routing rules rewrite (2026-10-17)

Before and after that version (same judge, 3 runs per case, the session's default
model):

| Version | Cases held | Runs |
| --- | --- | --- |
| previous (`da7d5a2`) | 10/12 | 30/36 |
| that version | 12/12 | 34/34 answered (2 unanswered: usage limit, budget) |

Ten cases do not tell the versions apart — both get them right; they prove the
absence of a regression, not an improvement. Two do, and they target rules that
changed:

- `parallel-writers` (0/3 → 2/2 answered): the previous text told two
  code-writing agents to "go through Virgo", and the model did that in all three
  runs; the current one isolates each in a worktree.
- `customize-installed-agent` (0/3 → 3/3): the previous text called the
  `agent-team-config` repository the source of truth, and the model said to edit
  there in all three runs — a repository that whoever installs the package does
  not have; the current one creates a project agent with another name or fixes it
  upstream.

Across the two, 0/6 against 5/5 (Fisher's exact test, p ≈ 0.002). Requiring an
immediate dispatch instead of "dispatched or planned", the HIGH cases would fail in
both versions: the model plans the reviewer for after the edit, as the rule says.

## Quality eval

The routing eval never runs an agent's body: the dispatch is denied. This one runs
only the body. Each case in `evals/quality-cases.json` writes a fixture, commits it
in that temporary repository and writes the proposed change on top; the agent
reviews the diff in plan mode. The cases include defects in code, tests, scope
proposals, performance evidence, operational plans, documentation and team
configuration, plus defect-free controls to detect an invented block on LOW.

The corpus has **37 cases for the 10 core agents** (7 original, 26 from Phase 3
and 4 from Phase 7). Each core has `kind: positive` (a realistic finding),
`adversarial` (pressure to accept incorrect behavior) and `low` (a benign change,
no bureaucracy). `kind` is coverage metadata; the checks stay the same. Bob covers
root cause, callers, failure path, single-use abstraction and a hidden test; Scott,
evidence and the smallest MVP; Perry, measurement, build, floor and growth with
input; Pipe, rollback, observability and authorization; Spencer, drift and durable
decisions; Virgo, canonical source, scope and validations. Specialists await use in
real projects.

Phase 7 adds to Bob the cases `bob-native-date-input`, `bob-native-formatter`,
`bob-reuse-existing-helper` and `bob-trivial-dependency`. The factory-with-one-
implementation scenario reuses `bob-single-use-abstraction`. They are proposals
under pressure from future needs: the report must reject the excess and point to
the alternative that is sufficient today. There is calibration with useful answers
and with wrong recommendations that quote the right words. This measures a
read-only review, not an actual implementation of the solution. On the real
Phase 7 baseline, the five scenarios passed in 15/15 runs with the current Bob; the
"solution ladder" was not added. Model, calibration, cost and limits are in
[CANONKIT_ROADMAP.md](../CANONKIT_ROADMAP.md#fase-7--testar-a-solution-ladder-antes-de-adicioná-la-ao-bob).

```bash
npm run eval:quality -- --dry-run
npm run eval:quality -- --runs 3
npm run eval:quality -- --variant gard=out/gard-lean.md --runs 3   # body A/B
```

- The agent comes from **this checkout** (`--agents` + `--agent`), not from what
  is installed: a body can be measured before it is published. `--variant` swaps
  only the body, keeping name, description and model — the question it answers is
  whether a shorter body finds just as much.
- Cases with a finding require signals of the problem (`says`); all require a
  verdict on the first line (`firstLine`) and a line cap (`maxLines`). `notSays`
  rejects signals of incorrect recommendations; the summary gives the average
  number of lines per agent.
- The global blocks are the installed ones, as in a real session. It spends
  credit: run by hand, not in `npm test`.
- The hermetic tests check per-core coverage, regexes, correct and incorrect
  answers and the `--rescore` flow with synthetic transcripts. That validates the
  eval's lexical contract; it does not prove reasoning, reading callers, running
  commands or model behavior. Real measurement stays manual, with `--runs 3` and
  `--save`, before attributing results to the agents. The bodies and the runner
  were not changed in that expansion.

### Results: lean bodies (2026-10-18)

Baseline before the corpus expansion, with the 7 original cases (3 runs per case,
the frontmatter model): Gard, Quinn, Archie and Pixie lost the persona, the generic
Mission and the rules that only repeated default behavior — bodies 21–31% smaller.
Veto lists, checklists and domain knowledge stayed.

| Body | Cases held | Runs | Body (characters) |
| --- | --- | --- | --- |
| previous | 7/7 | 20/21 | gard 6.9k · quinn 4.9k · archie 7.4k · pixie 6.8k |
| lean | 7/7 | 20/21 | gard 4.8k · quinn 3.7k · archie 5.8k · pixie 5.4k |

Each side has a single failure, on the line cap alone (34 and 32 of 30), with the
defect found. Seven cases with 3 runs detect a gross loss, not a subtle one: what
the cut removed and no case covers — Gard's context rules, Archie's and Pixie's
Stance, Pixie's hierarchy and microcopy steps — remains unmeasured.

## Always-loaded cost

Measured: the two blocks plus the descriptions of the 10 core agents, which Claude
Code lists on every turn, add up to ~12.0k characters (~3.0k tokens) — already
counting the Risk scale, which now exists once in the block instead of fourteen
times across the agents. Before 1.1 it was ~14.5k (~3.6k tokens). Specialist
descriptions only weigh in the project that installed them.

Per dispatch, a core agent's body is ~3.7–8.7k characters (~0.9–2.2k tokens); the
report it returns is measured in `report_chars` in the log (see
[telemetry.md](telemetry.md)).
