#!/usr/bin/env python3
"""Python-only repository checks used by scripts/validate.mjs."""
import ast
import collections
import pathlib
import re
import sys
import tomllib


def validate_structure():
    agents = sorted(p.stem for p in pathlib.Path("agents").glob("*.md"))

    # Virgo maintains the repo; it does not classify product-change risk and holds no veto.
    NO_RISK = {"virgo"}

    for agent in agents:
        text = pathlib.Path(f"agents/{agent}.md").read_text(encoding="utf-8")
        heads = [m.group(1).strip().lower() for m in re.finditer(r"^## (.+)$", text, re.M)]
        joined = " | ".join(heads)
        problems = []

        for required in ("mission", "responsibilities", "collaboration", "expected output"):
            if required not in heads:
                problems.append(f"missing '## {required.title()}'")

        if not any("authorit" in heading for heading in heads):
            problems.append("no authority section")
        if not any(("boundar" in heading) or ("scope" in heading) for heading in heads):
            problems.append("no boundaries/scope section")

        if agent not in NO_RISK and "**Risk scale**" not in text:
            for level in ("LOW:", "MEDIUM:", "HIGH:"):
                if level not in text:
                    problems.append(f"no {level.rstrip(':')} risk classification and no reference to the team's Risk scale")

        output = re.search(r"^## Expected output\n(.*?)(?=^## |\Z)", text, re.S | re.M)
        if output and not (
            "Open with" in output.group(1)
            and "omit empty" in output.group(1)
            and re.search(r"under ~\d+ lines", output.group(1))
        ):
            problems.append("Expected output is unbounded: open with the verdict, omit empty fields, cap the lines")

        has_veto = re.search(r"may veto|^\s*[-*]\s*veto\b", text, re.M) is not None
        has_overruled = "When the veto is overruled" in text
        if has_veto and not has_overruled:
            problems.append("declares a veto but no 'When the veto is overruled'")
        if has_overruled and not has_veto:
            problems.append("has 'When the veto is overruled' but declares no veto")

        frontmatter = re.match(r"---\n(.*?)\n---", text, re.S)
        authority = re.search(r"^authority:\s*(\S+)", frontmatter.group(1), re.M) if frontmatter else None
        tier = re.search(r"^tier:\s*(\S+)", frontmatter.group(1), re.M) if frontmatter else None
        if tier and tier.group(1) == "specialist":
            value = authority.group(1) if authority else None
            if value not in ("veto", "blocks", "none"):
                problems.append(f"authority is '{value or 'missing'}' - expected veto, blocks, or none")
            elif value == "veto" and not has_veto:
                problems.append("authority: veto but the body has no 'may veto' section")
            elif value == "none" and has_veto:
                problems.append("authority: none but the body declares a veto")

        if problems:
            print(f"FAIL\t{agent}\t{'; '.join(problems)}")
        else:
            print(f"OK\t{agent}\t{joined}")


def validate_split():
    agents = sorted(p.stem for p in pathlib.Path("agents").glob("*.md"))
    block = pathlib.Path("reference/agents-block.md").read_text(encoding="utf-8")

    def front(name, key):
        text = pathlib.Path(f"agents/{name}.md").read_text(encoding="utf-8")
        match = re.search(rf"^{key}: *(.+)$", text, re.M)
        return match.group(1).strip() if match else None

    tiers = {agent: front(agent, "tier") for agent in agents}
    bad = sorted(agent for agent, tier in tiers.items() if tier not in ("core", "specialist"))
    if bad:
        for agent in bad:
            print(f"FAIL\t{agent}: tier is '{tiers[agent] or 'missing'}' — expected core or specialist")
    else:
        core = sorted(agent for agent, tier in tiers.items() if tier == "core")
        specialists = sorted(agent for agent, tier in tiers.items() if tier == "specialist")
        print(f"OK\tevery agent declares a tier ({len(core)} core, {len(specialists)} specialist)")

    # `need` replaced a vendor `model:` label, which Claude Code would act on.
    needs = {agent: front(agent, "need") for agent in agents}
    legacy = sorted(agent for agent in agents if front(agent, "model") is not None)
    bad_need = sorted(agent for agent, need in needs.items() if need not in ("light", "standard", "deep"))
    for agent in legacy:
        print(f"FAIL\t{agent}: 'model:' is no longer accepted — replace it with need: light | standard | deep")
    for agent in bad_need:
        print(f"FAIL\t{agent}: need is '{needs[agent] or 'missing'}' — expected light, standard or deep")
    if not legacy and not bad_need:
        print("OK\tevery agent declares a need level and no vendor model")

    bullets = set(re.findall(r"^-\s+\*\*([a-z0-9-]+)\*\*\s+—\s+\S", block, re.M))
    rows = {name.lower() for name in re.findall(r"^\|\s*\*\*([A-Za-z0-9-]+)\*\*\s*\|\s*\S", block, re.M)}
    listed = bullets | rows
    for agent in agents:
        if agent not in listed:
            print(f"FAIL\treference/agents-block.md has no summary line for: {agent}")
    ghosts = sorted(listed - set(agents))
    if ghosts:
        print(f"FAIL\treference/agents-block.md lists agents with no file: {', '.join(ghosts)}")
    if not (set(agents) - listed) and not ghosts:
        print("OK\tthe roster block has a summary line for every agent")

    scale = re.search(r"\*\*Risk scale\*\*.*?\n\n((?:- .*\n)+)", block, re.S)
    if not scale or not all(f"- {level}:" in scale.group(1) for level in ("LOW", "MEDIUM", "HIGH")):
        print("FAIL\treference/agents-block.md has no **Risk scale** with LOW, MEDIUM and HIGH lines")
    else:
        print("OK\tthe roster block carries the team's Risk scale")

    marker = re.search(r"^## Domain specialists\b", block, re.M)
    if not marker:
        print("FAIL\treference/agents-block.md has no '## Domain specialists' section")
    else:
        misplaced = []
        for agent in sorted(listed & set(agents)):
            position = block.find(f"- **{agent}** —") if agent in bullets else block.find(f"| **{agent.capitalize()}** |")
            side = "specialist" if position > marker.start() else "core"
            if tiers[agent] and side != tiers[agent]:
                misplaced.append(f"{agent} is {tiers[agent]} but sits in the {side} section")
        if misplaced:
            print(f"FAIL\troster block: {'; '.join(misplaced)}")
        else:
            print("OK\tthe roster block's two sections match the declared tiers")


def validate_skills():
    block = pathlib.Path("reference/agents-block.md").read_text(encoding="utf-8")
    skills = sorted(path.parent.name for path in pathlib.Path("skills").glob("*/SKILL.md"))

    if "orchestrate" not in skills:
        print("FAIL\tskills/orchestrate/SKILL.md is missing")

    for skill_name in skills:
        text = pathlib.Path(f"skills/{skill_name}/SKILL.md").read_text(encoding="utf-8")
        frontmatter = re.match(r"---\r?\n(.*?)\r?\n---", text, re.S)
        name = re.search(r"^name:\s*(\S+)", frontmatter.group(1), re.M) if frontmatter else None
        description = re.search(r"^description:\s*(.+)$", frontmatter.group(1), re.M) if frontmatter else None
        if not frontmatter:
            print(f"FAIL\tskill {skill_name}: no frontmatter")
        elif not name or name.group(1) != skill_name:
            print(f"FAIL\tskill {skill_name}: frontmatter name must match its directory")
        elif not description or len(description.group(1).strip()) < 40:
            print(f"FAIL\tskill {skill_name}: description missing or too short to trigger on")
        else:
            print(f"OK\tskill {skill_name}")

    if "orchestrate" in skills:
        needles = (
            ("`orchestrate` skill", "the skill by name"),
            ("~/.claude/skills/orchestrate/SKILL.md", "its Claude Code path"),
            ("~/.agents/skills/orchestrate/SKILL.md", "its Codex path"),
            ("Integration Review", "the Integration Review rule"),
            ("names its model and effort", "the rule naming model and effort"),
        )
        for needle, what in needles:
            if needle not in block:
                print(f"FAIL\treference/agents-block.md no longer carries {what}")
        skill = pathlib.Path("skills/orchestrate/SKILL.md").read_text(encoding="utf-8")
        for heading in ("## Naming the model and effort", "## Integration Review"):
            if heading not in skill:
                print(f"FAIL\tskills/orchestrate/SKILL.md lost '{heading}'")


def validate_escalation():
    agents = sorted(p.stem for p in pathlib.Path("agents").glob("*.md"))
    outgoing = collections.defaultdict(set)
    incoming = collections.defaultdict(set)

    for agent in agents:
        text = pathlib.Path(f"agents/{agent}.md").read_text(encoding="utf-8")
        match = re.search(r"^## Collaboration\n(.*?)(?=^## |\Z)", text, re.S | re.M)
        body = match.group(1) if match else ""
        for other in agents:
            if other != agent and re.search(rf"\b{other.capitalize()}\b", body):
                outgoing[agent].add(other)
                incoming[other].add(agent)

    generic = re.compile(r"\bthe [a-z][a-z-]*(?: [a-z-]+)? owner\b")
    for agent in agents:
        text = pathlib.Path(f"agents/{agent}.md").read_text(encoding="utf-8")
        match = re.search(r"^## Collaboration\n(.*?)(?=^## |\Z)", text, re.S | re.M)
        body = match.group(1) if match else ""
        hits = {hit for hit in generic.findall(body)}
        hits = {
            hit for hit in hits
            if not re.search(
                rf"(?:{'|'.join(other.capitalize() for other in agents)})[^.]*{re.escape(hit)}",
                body,
            )
        }
        if hits:
            print(f"FAIL\t{agent}: escalates to a role, not an agent: {', '.join(sorted(hits))}")

    silent = [agent for agent in agents if not outgoing[agent]]
    if silent:
        print(f"FAIL\tno outgoing escalation (report names nobody): {', '.join(silent)}")
    else:
        print("OK\tevery agent escalates to someone by name")

    tiers = {
        agent: (
            re.search(r"^tier: *(\w+)", pathlib.Path(f"agents/{agent}.md").read_text(encoding="utf-8"), re.M)
            or [None, None]
        )[1]
        for agent in agents
    }
    core = [agent for agent in agents if tiers[agent] == "core"]
    for agent in core:
        named = sorted(other for other in outgoing[agent] if tiers[other] == "specialist")
        if named:
            print(f"FAIL\t{agent}: core Collaboration names specialists ({', '.join(named)}) — point at the project's installed specialists instead")
        text = pathlib.Path(f"agents/{agent}.md").read_text(encoding="utf-8")
        if "A specialist this project installed" not in text:
            print(f"FAIL\t{agent}: core Collaboration has no line for the project's installed specialists")

    unreachable = [agent for agent in core if not (incoming[agent] & set(core))]
    if unreachable:
        print(f"FAIL\tno core agent escalates to them (unreachable): {', '.join(unreachable)}")
    else:
        print("OK\tevery core agent is reachable from another core agent")

    for agent in agents:
        text = pathlib.Path(f"agents/{agent}.md").read_text(encoding="utf-8")
        match = re.search(r"^## Collaboration\n(.*?)(?=^## |\Z)", text, re.S | re.M)
        if match and "`AGENTS.md` roster" not in match.group(1):
            print(f"FAIL\t{agent}: Collaboration does not point at the `AGENTS.md` roster for the obvious handoffs")

    print(f"OK\t{len(agents)} agents, {sum(len(edges) for edges in outgoing.values())} escalation edges")


def validate_python_syntax(files):
    for filename in files:
        try:
            ast.parse(pathlib.Path(filename).read_text(encoding="utf-8"), filename=filename)
        except (SyntaxError, UnicodeDecodeError) as error:
            print(f"FAIL\t{pathlib.Path(filename).name}: syntax error: {error}")
        else:
            print(f"OK\t{pathlib.Path(filename).name}")


def validate_codex_toml(directory):
    files = sorted(pathlib.Path(directory).glob("*.toml"))
    problems = []
    for file in files:
        try:
            data = tomllib.loads(file.read_text(encoding="utf-8"))
        except tomllib.TOMLDecodeError as error:
            problems.append(f"{file.name} does not parse: {error}")
            continue
        for key in ("name", "description", "developer_instructions"):
            if not data.get(key):
                problems.append(f"{file.name} has no {key}")
        if data.get("name") and data["name"] != file.stem:
            problems.append(f"{file.name} declares name '{data['name']}'")
        if len(data.get("developer_instructions", "")) < 500:
            problems.append(f"{file.name} instructions look truncated")

    for problem in problems:
        print("FAIL\t" + problem)
    if not problems:
        print(f"OK\t{len(files)} agents render to valid Codex TOML")


def main():
    check = sys.argv[1]
    if check == "structure":
        validate_structure()
    elif check == "split":
        validate_split()
    elif check == "skills":
        validate_skills()
    elif check == "escalation":
        validate_escalation()
    elif check == "syntax":
        validate_python_syntax(sys.argv[2:])
    elif check == "toml":
        validate_codex_toml(sys.argv[2])
    else:
        raise ValueError(f"unknown Python validation check: {check}")


if __name__ == "__main__":
    main()
