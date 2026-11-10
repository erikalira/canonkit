# Tasks

Scope revised by maintainer direction on 2026-11-09: implement practical use; do not expand or rerun synthetic evaluation campaigns. Existing eval artifacts remain historical.

## 1. Implement practical use

- [x] 1.1 Replace the three-label procedure with per-dimension `noul` examples, applicable specialized tools and compact real-use observations; retain HIGH owners, direct evidence, independent review, sanitized input and unavailable/failed fallback.
- [x] 1.2 Align the orchestration skill, tool documentation and capability spec with practical adoption and quality-first selection; do not require new benchmarks, logging infrastructure or latency targets.

## 2. Verify the instructions

- [x] 2.1 Inspect the changed instructions for consistency and valid request examples, run `openspec validate laya-advisory-integration --strict` and `git diff --check`, and update Graphify with `graphify update .`. Report actual MCP availability separately from practical efficacy; do not fabricate a usage result.

Validation: OpenSpec strict validation and JSON parsing of both request examples passed; `git diff --check` passed. Graphify update completed with sequential extraction fallback. No new inference evaluations were run. Laya MCP is UNAVAILABLE in this session; practical efficacy remains UNMEASURED. Source instructions are implemented; user-level installed copies and server configuration were not changed.

## 3. Apply the static-audit corrections

- [x] 3.1 Align governance, procedure, documentation and OpenSpec artifacts with selective optional HIGH advice, reuse of unchanged evidence, contextual coverage questions and conservative handling of truncated or incomplete input; preserve existing HIGH controls.
- [x] 3.2 Inspect the final instructions and request examples, run OpenSpec strict validation and whitespace checks, and record actual static verification without Laya calls, model evaluations or new tests.

Static-audit correction verification (2026-11-09): inspected the final diff and confirmed the current source instructions no longer require calls at every HIGH handoff. `openspec validate laya-advisory-integration --strict`, parsing both JSON examples and `git diff --check` passed. No Laya calls, auxiliary models, evaluations or new tests were used. Only instructions and documentation changed, so Graphify was not rebuilt. User-level installed copies remain unsynchronized; this verifies source instructions, not runtime adoption or practical efficacy. Main-spec sync and archive were not performed.
