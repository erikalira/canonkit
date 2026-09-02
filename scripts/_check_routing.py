#!/usr/bin/env python3
"""Check reference/routing-block.md against the agents it routes work to.

The routing block is what the dispatcher reads to decide who is not optional on
a change. Every claim it makes about an agent — which layer it is in, whether it
holds a veto, which model it runs on — is a fact stored somewhere else, so it
can drift without anything failing. This is the check that makes it fail.

Prints TAB-separated OK/FAIL lines for validate.sh to render.
"""
import pathlib
import re

REPO = pathlib.Path(__file__).resolve().parent.parent
block = (REPO / "reference/routing-block.md").read_text(encoding="utf-8")
installer = (REPO / "scripts/install.sh").read_text(encoding="utf-8")
agents = sorted(p.stem for p in (REPO / "agents").glob("*.md"))


def agent_text(name):
    return (REPO / "agents" / f"{name}.md").read_text(encoding="utf-8")


def installer_list(var):
    m = re.search(rf"^{var}=\((.*?)\)", installer, re.M | re.S)
    return set(m.group(1).split()) if m else set()


core, specialists = installer_list("CORE"), installer_list("SPECIALISTS")
problems = []

# A name in the block that no longer exists routes work nowhere; an agent
# missing from the block is invisible to whoever dispatches.
named = {a for a in agents if re.search(rf"\*\*{a.capitalize()}\*\*", block)}
missing = sorted(set(agents) - named)
if missing:
    problems.append("agents absent from the block: " + ", ".join(missing))

# Two tables, and the split carries meaning: a specialist listed as core claims
# to be always available, which is the one thing a specialist is not.
# Anchored at line start because the word also appears in the intro prose.
marker = re.search(r"^Specialists\b", block, re.M)
if not marker:
    problems.append("no specialists section in the block")
else:
    for a in sorted(named):
        side = "specialist" if block.find(f"**{a.capitalize()}**") > marker.start() else "core"
        want = "core" if a in core else "specialist" if a in specialists else None
        if want and side != want:
            problems.append(f"{a} is {want} in install.sh but sits in the {side} table")

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

# The model rule names the agents that run on opus. That is a claim about
# frontmatter, and frontmatter is where the runtime actually reads it.
rule = next((l for l in block.splitlines() if "opus" in l and "sonnet" in l), "")
for a in agents:
    m = re.search(r"^model: *(\w+)", agent_text(a), re.M)
    model = m.group(1) if m else "?"
    named_in_rule = a.capitalize() in rule
    if model == "opus" and not named_in_rule:
        problems.append(f"{a} is opus in frontmatter but the block's model rule does not name it")
    if model != "opus" and named_in_rule:
        problems.append(f"{a} is {model} in frontmatter but the block's model rule names it as opus")

for p in problems:
    print("FAIL\t" + p)
if not problems:
    print(f"OK\t{len(named)} agents routed; layer, authority and model match the agent files")
