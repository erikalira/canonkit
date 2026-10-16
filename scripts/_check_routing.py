#!/usr/bin/env python3
"""Check the team roster (reference/agents-block.md) against the agents it routes work to.

The roster block is what the dispatcher reads to decide who is not optional on
a change. Every claim it makes about an agent — which layer it is in, whether it
holds a veto — is a fact stored somewhere else, so it can drift without anything
failing. This is the check that makes it fail.

The roster's authority table is the routing view of the CORE team only. Specialists are per project
and are documented in the project that installed them: listing one here would
claim it is always available, which is the one thing a specialist is not. So the
absence of a specialist is an invariant to enforce, not a gap to report.

Prints TAB-separated OK/FAIL lines for validate.sh to render.
"""
import pathlib
import re

REPO = pathlib.Path(__file__).resolve().parent.parent
block = (REPO / "reference/agents-block.md").read_text(encoding="utf-8")
routing = (REPO / "reference/routing-block.md").read_text(encoding="utf-8")
agents = sorted(p.stem for p in (REPO / "agents").glob("*.md"))


def agent_text(name):
    return (REPO / "agents" / f"{name}.md").read_text(encoding="utf-8")


def tier(name):
    m = re.search(r"^tier: *(\w+)", agent_text(name), re.M)
    return m.group(1) if m else None


core = {a for a in agents if tier(a) == "core"}
specialists = {a for a in agents if tier(a) == "specialist"}
problems = []

named = {a for a in agents if re.search(rf"\*\*{a.capitalize()}\*\*", block)}

# A core agent missing from the block is invisible to whoever dispatches.
missing = sorted(core - named)
if missing:
    problems.append("core agents absent from the block: " + ", ".join(missing))

# A specialist named here is available in every project by implication, which
# silently defeats the per-project rule the installer enforces on the files.
leaked = sorted(specialists & named)
if leaked:
    problems.append(
        "specialists named in the global block: " + ", ".join(leaked)
        + " — document them in the project that installed them"
    )

# The authority column decides who cannot be skipped at HIGH risk. A veto
# claimed here and absent from the agent file misroutes in silence.
for a in sorted(named):
    declares = re.search(r"may veto|^\s*[-*]\s*veto\b", agent_text(a), re.M) is not None
    row = re.search(rf"^\|\s*\*\*{a.capitalize()}\*\*.*$", block, re.M)
    claims = bool(row) and "veto" in row.group(0).split("|")[-2]
    if declares != claims:
        problems.append(
            f"{a}: block says {'veto' if claims else 'no veto'}, "
            f"agent file says {'veto' if declares else 'no veto'}"
        )

# The dispatcher names the model per dispatch; frontmatter is the fallback and
# is validated in validate.sh directly. The block must still carry the rule —
# without it the decision goes unrecorded — but it no longer restates which
# agent runs on what, because a prose copy of frontmatter is the drift this
# check exists to prevent.
if not re.search(r"names its model", block):
    problems.append("the roster no longer carries a rule naming the model per dispatch")

# The Claude-specific block must not restate the team: it points at AGENTS.md.
if re.search(r"^@\S*AGENTS\.md", routing, re.M):
    problems.append("routing-block.md imports AGENTS.md — it already loads as an ancestor of the project, so the import loads it twice")
if "~/AGENTS.md" not in routing:
    problems.append("routing-block.md does not point at ~/AGENTS.md")
if re.search(r"^\|\s*\*\*\w+\*\*", routing, re.M):
    problems.append("routing-block.md restates the roster table — it belongs in agents-block.md")

for p in problems:
    print("FAIL	" + p)
if not problems:
    print(f"OK	{len(named)} core agents routed; layer and authority match the agent files")
