#!/usr/bin/env bash
# Validate the repository against the conventions the README promises.
#
# This is the Virgo protocol, automated: frontmatter (name, description, model),
# structure, the core / specialist split, escalation routing, and the script inventory. It checks the
# rules the team actually agreed on — not uniformity the repo never had. Pipe
# says "Operational authority" instead of "Authority", Virgo classifies no
# product risk, and both are correct; the checks below are written to accept
# that and still catch a real defect.
#
#   ./scripts/validate.sh          # report and exit non-zero on failure
#   ./scripts/validate.sh --quiet  # only failures and the summary
#
# Read-only. It never writes to the repo, your home, or any project.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

QUIET=0
for a in "${@:-}"; do
  case "$a" in
    --quiet|-q) QUIET=1 ;;
    -h|--help)  sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    "")         ;;
    *)          echo "Unknown option: $a" >&2; exit 1 ;;
  esac
done

# Python checks write here instead of running inside $( ), where bash parses
# parentheses in the heredoc body before the heredoc is honored.
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

FAILURES=0
WARNINGS=0

pass() { [ "$QUIET" -eq 1 ] || printf '  \033[32mok\033[0m   %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; FAILURES=$((FAILURES + 1)); }
warn() { printf '  \033[33mwarn\033[0m %s\n' "$1"; WARNINGS=$((WARNINGS + 1)); }
head_() { [ "$QUIET" -eq 1 ] || printf '\n\033[1m%s\033[0m\n' "$1"; }

# ---------------------------------------------------------------- frontmatter

head_ "Frontmatter"

for f in agents/*.md; do
  base="$(basename "$f" .md)"

  if [ "$(head -1 "$f")" != "---" ]; then
    fail "$base: does not start with a frontmatter delimiter"
    continue
  fi

  name="$(awk 'NR==1&&/^---$/{f=1;next} f&&/^---$/{exit} f&&/^name:/{print $2}' "$f")"
  desc="$(awk 'NR==1&&/^---$/{f=1;next} f&&/^---$/{exit} f&&/^description:/{print}' "$f")"
  model="$(awk 'NR==1&&/^---$/{f=1;next} f&&/^---$/{exit} f&&/^model:/{print $2}' "$f")"
  tier="$(awk 'NR==1&&/^---$/{f=1;next} f&&/^---$/{exit} f&&/^tier:/{print $2}' "$f")"

  if [ -z "$name" ]; then
    fail "$base: no name in frontmatter"
  elif [ "$name" != "$base" ]; then
    fail "$base: frontmatter name is '$name' — must match the filename"
  elif [ -z "$desc" ]; then
    fail "$base: no description in frontmatter"
  elif [ -z "$model" ]; then
    fail "$base: no model in frontmatter — without it the runtime silently uses the session default"
  elif [ "$model" != "opus" ] && [ "$model" != "sonnet" ] && [ "$model" != "haiku" ]; then
    fail "$base: model is '$model' — expected opus, sonnet, or haiku"
  elif [ "$tier" != "core" ] && [ "$tier" != "specialist" ]; then
    fail "$base: tier is '${tier:-missing}' — the installers derive the split from it"
  else
    # The description is what the delegating model reads to route work. A bare
    # title tells it nothing about what the agent owns.
    len=$(printf '%s' "$desc" | wc -c | tr -d ' ')
    if [ "$len" -lt 60 ]; then
      warn "$base: description is very short ($len chars) — say what the agent owns"
    else
      pass "$base"
    fi
  fi
done

# ------------------------------------------------------------------ structure

head_ "Structure"

python3 - > "$TMP" <<'PY'
import pathlib, re

agents = sorted(p.stem for p in pathlib.Path("agents").glob("*.md"))

# Virgo maintains the repo; it does not classify product-change risk and holds no
# veto. That is by design, not an omission.
NO_RISK = {"virgo"}

for a in agents:
    text = pathlib.Path(f"agents/{a}.md").read_text(encoding="utf-8")
    heads = [m.group(1).strip().lower() for m in re.finditer(r"^## (.+)$", text, re.M)]
    joined = " | ".join(heads)
    problems = []

    for required in ("mission", "responsibilities", "collaboration", "expected output"):
        if required not in heads:
            problems.append(f"missing '## {required.title()}'")

    # Accept a qualified heading: Pipe's "Operational authority" counts.
    if not any("authorit" in h for h in heads):
        problems.append("no authority section")
    if not any(("boundar" in h) or ("scope" in h) for h in heads):
        problems.append("no boundaries/scope section")

    if a not in NO_RISK:
        for level in ("LOW:", "MEDIUM:", "HIGH:"):
            if level not in text:
                problems.append(f"no {level.rstrip(':')} risk classification")

    # The README's promise: an agent that can veto also says what to do when
    # overruled. Checked as a rule, so agents without veto authority are fine.
    # Veto is phrased more than one way: "Archie may veto", "Gard may veto",
    # but also Spencer's bare "- veto confusing ... documentation;".
    has_veto = re.search(r"may veto|^\s*[-*]\s*veto\b", text, re.M) is not None
    has_overruled = "When the veto is overruled" in text
    if has_veto and not has_overruled:
        problems.append("declares a veto but no 'When the veto is overruled'")
    if has_overruled and not has_veto:
        problems.append("has 'When the veto is overruled' but declares no veto")

    if problems:
        print(f"FAIL\t{a}\t{'; '.join(problems)}")
    else:
        print(f"OK\t{a}\t{joined}")
PY
STRUCT="$(cat "$TMP")"

while IFS=$'\t' read -r status agent detail; do
  [ -z "${status:-}" ] && continue
  if [ "$status" = "OK" ]; then pass "$agent"; else fail "$agent: $detail"; fi
done <<< "$STRUCT"

# ------------------------------------------------------------ core/specialist

head_ "Core / specialist split"

python3 - > "$TMP" <<'PY'
import pathlib, re

agents = sorted(p.stem for p in pathlib.Path("agents").glob("*.md"))
block = pathlib.Path("reference/agents-block.md").read_text(encoding="utf-8")


def front(name, key):
    text = pathlib.Path(f"agents/{name}.md").read_text(encoding="utf-8")
    m = re.search(rf"^{key}: *(.+)$", text, re.M)
    return m.group(1).strip() if m else None


# The split used to be a literal list in install.sh, install.ps1 and
# add-specialist.sh, and this section existed to keep those three copies honest.
# It now lives in the agent's own frontmatter, next to name and model, and every
# installer derives from it — so what is left to check is that it is declared
# and that the roster agrees with it.
tiers = {a: front(a, "tier") for a in agents}
bad = sorted(a for a, t in tiers.items() if t not in ("core", "specialist"))
if bad:
    for a in bad:
        print(f"FAIL\t{a}: tier is '{tiers[a] or 'missing'}' — expected core or specialist")
else:
    core = sorted(a for a, t in tiers.items() if t == "core")
    spec = sorted(a for a, t in tiers.items() if t == "specialist")
    print(f"OK\tevery agent declares a tier ({len(core)} core, {len(spec)} specialist)")

# The roster block is where `add` reads the one-line summary it writes into a
# project's AGENTS.md. An agent missing a line there installs with no
# description for Codex to route on.
listed = set(re.findall(r"^-\s+\*\*([a-z0-9-]+)\*\*\s+—\s+\S", block, re.M))
for a in agents:
    if a not in listed:
        print(f"FAIL\treference/agents-block.md has no summary line for: {a}")
ghost = sorted(listed - set(agents))
if ghost:
    print(f"FAIL\treference/agents-block.md lists agents with no file: {', '.join(ghost)}")
if not (set(agents) - listed) and not ghost:
    print("OK\tthe roster block has a summary line for every agent")

# Two sections in the roster, and the split carries meaning: a specialist listed
# under the core heading claims to be always available, which is the one thing a
# specialist is not.
marker = re.search(r"^## Domain specialists\b", block, re.M)
if not marker:
    print("FAIL\treference/agents-block.md has no '## Domain specialists' section")
else:
    misplaced = []
    for a in sorted(listed & set(agents)):
        side = "specialist" if block.find(f"- **{a}** —") > marker.start() else "core"
        if tiers[a] and side != tiers[a]:
            misplaced.append(f"{a} is {tiers[a]} but sits in the {side} section")
    if misplaced:
        print("FAIL\troster block: " + "; ".join(misplaced))
    else:
        print("OK\tthe roster block's two sections match the declared tiers")
PY
SPLIT="$(cat "$TMP")"

while IFS=$'\t' read -r status detail; do
  [ -z "${status:-}" ] && continue
  if [ "$status" = "OK" ]; then pass "$detail"; else fail "$detail"; fi
done <<< "$SPLIT"


# ------------------------------------------------------------------ escalation

# --------------------------------------------------------------- routing block

head_ "Routing block (reference/routing-block.md -> ~/.claude/CLAUDE.md)"

python3 "$REPO_ROOT/scripts/_check_routing.py" > "$TMP"

while IFS=$'	' read -r status detail; do
  [ -z "${status:-}" ] && continue
  if [ "$status" = "OK" ]; then pass "$detail"; else fail "$detail"; fi
done < "$TMP"

head_ "Escalation graph"

python3 - > "$TMP" <<'PY'
import pathlib, re, collections

agents = sorted(p.stem for p in pathlib.Path("agents").glob("*.md"))
out = collections.defaultdict(set)
inc = collections.defaultdict(set)

for a in agents:
    text = pathlib.Path(f"agents/{a}.md").read_text(encoding="utf-8")
    m = re.search(r"^## Collaboration\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    body = m.group(1) if m else ""
    for b in agents:
        if b != a and re.search(rf"\b{b.capitalize()}\b", body):
            out[a].add(b)
            inc[b].add(a)

# A role-shaped escalation ("the security owner") names no agent, so a subagent
# report gives you nothing to route to.
GENERIC = re.compile(r"\bthe [a-z][a-z-]*(?: [a-z-]+)? owner\b")
for a in agents:
    text = pathlib.Path(f"agents/{a}.md").read_text(encoding="utf-8")
    m = re.search(r"^## Collaboration\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    body = m.group(1) if m else ""
    hits = {h for h in GENERIC.findall(body)}
    # "Pipe remains the operational owner" names an agent — not a routing gap.
    hits = {h for h in hits if not re.search(rf"(?:{'|'.join(x.capitalize() for x in agents)})[^.]*{re.escape(h)}", body)}
    if hits:
        print(f"FAIL\t{a}: escalates to a role, not an agent: {', '.join(sorted(hits))}")

silent = [a for a in agents if not out[a]]
if silent:
    print(f"FAIL\tno outgoing escalation (report names nobody): {', '.join(silent)}")
else:
    print("OK\tevery agent escalates to someone by name")

unreachable = [a for a in agents if not inc[a]]
if unreachable:
    print(f"FAIL\tnobody escalates to them (unreachable): {', '.join(unreachable)}")
else:
    print("OK\tevery agent is reachable from another agent")

thin = [f"{a} (in={len(inc[a])})" for a in agents if 0 < len(inc[a]) < 3]
if thin:
    print(f"WARN\tfew agents route to them: {', '.join(thin)}")

print(f"OK\t{len(agents)} agents, {sum(len(v) for v in out.values())} escalation edges")
PY
GRAPH="$(cat "$TMP")"

while IFS=$'\t' read -r status detail; do
  [ -z "${status:-}" ] && continue
  case "$status" in
    OK)   pass "$detail" ;;
    WARN) warn "$detail" ;;
    *)    fail "$detail" ;;
  esac
done <<< "$GRAPH"

# --------------------------------------------------------------------- scripts

head_ "Scripts"

for s in scripts/*.sh; do
  name="$(basename "$s")"
  if ! bash -n "$s" 2>/dev/null; then
    fail "$name: syntax error"
    continue
  fi
  if [ ! -x "$s" ]; then
    warn "$name: not executable (chmod +x)"
    continue
  fi
  pass "$name"
done

# The helpers the shell scripts call. They hold the marker rewriting and the
# routing checks, which is exactly the logic a shell heredoc mangles.
for s in scripts/*.py; do
  [ -e "$s" ] || continue
  name="$(basename "$s")"
  if python3 -c "import ast,sys;ast.parse(open(sys.argv[1],encoding='utf-8').read())" "$s" 2>/dev/null; then
    pass "$name"
  else
    fail "$name: syntax error"
  fi
done

# ---------------------------------------------------------------- npm package

head_ "npm package"

if command -v node >/dev/null 2>&1; then
  if node --check bin/cli.js 2>/dev/null; then
    pass "bin/cli.js parses"
  else
    fail "bin/cli.js: syntax error"
  fi

  # A hook that fails open is the right runtime behaviour: main() sits in a catch
  # that exits 0, so a broken hook never bricks a session. It is also why a broken
  # hook is invisible — every gate the routing block calls [ENFORCED] simply stops
  # firing, with nothing in the log to say so.
  #
  # `node --check` is not enough. It parses without executing, so it passed
  # happily while this CommonJS hook sat inside a "type": "module" package and
  # could not actually run from a clone. Feed it a benign event and watch it exit.
  # HOME is redirected so the check does not append to the real activity log.
  for hook in hooks/*.js; do
    [ -e "$hook" ] || continue
    hook_home="$(mktemp -d)"
    if printf '%s' '{"session_id":"validate","hook_event_name":"UserPromptSubmit"}' \
      | HOME="$hook_home" USERPROFILE="$hook_home" node "$hook" >/dev/null 2>&1; then
      pass "$hook runs"
    else
      fail "$hook: does not run — hooks fail open, so this silently disables every gate"
    fi
    rm -rf "$hook_home"
  done

  # The installer reads agents/, reference/ and hooks/ at runtime. Leaving any of
  # them out of the published tarball is the one packaging mistake that cannot be
  # caught by running the CLI from a clone, because a clone always has them.
  node - <<'JS' > "$TMP" 2>/dev/null || echo "FAIL	package.json is unreadable" > "$TMP"
import { readFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const shipped = new Set(pkg.files ?? []);
for (const dir of ["bin", "agents", "reference", "hooks"]) {
  if (!shipped.has(dir)) console.log(`FAIL\tpackage.json files[] omits ${dir}/ — the published CLI would not find it`);
}
if (pkg.bin?.canonkit !== "bin/cli.js") console.log("FAIL\tpackage.json bin does not point at bin/cli.js");
if (!pkg.license) console.log("FAIL\tpackage.json has no license");
if (!pkg.repository?.url) console.log("FAIL\tpackage.json has no repository url");
console.log(`OK\tpackage.json ships ${[...shipped].join(", ")}`);
JS

  while IFS=$'\t' read -r status detail; do
    [ -z "${status:-}" ] && continue
    if [ "$status" = "OK" ]; then pass "$detail"; else fail "$detail"; fi
  done < "$TMP"

  if [ -f LICENSE ]; then pass "LICENSE present"; else fail "no LICENSE — npm publishes the field, not the file"; fi
else
  warn "node not found — skipped npm package checks"
fi

# ------------------------------------------------------------- codex agents

head_ "Codex custom agents"

# Codex loads these as configuration, so a file that does not parse is not a
# degraded agent — it is an agent that does not exist. Rendering and parsing is
# the only check that actually proves the emitter escapes what it must.
if command -v node >/dev/null 2>&1 && python3 -c "import tomllib" 2>/dev/null; then
  CODEX_TMP="$(node -e '
    (async () => {
      const m = await import("./bin/cli.js");
      const { mkdtemp, writeFile } = await import("node:fs/promises");
      const os = await import("node:os");
      const path = await import("node:path");
      const dir = await mkdtemp(path.join(os.tmpdir(), "atc-codex-"));
      for (const a of await m.readAgents()) {
        await writeFile(path.join(dir, a.name + ".toml"), m.codexAgent(a));
      }
      process.stdout.write(dir);
    })().catch((e) => { console.error(e.message); process.exit(1); });
  ' 2>"$TMP")"

  if [ -z "$CODEX_TMP" ]; then
    fail "could not render Codex agents: $(cat "$TMP")"
  else
    python3 - "$CODEX_TMP" > "$TMP" <<'PY'
import pathlib, sys, tomllib

d = pathlib.Path(sys.argv[1])
files = sorted(d.glob("*.toml"))
problems = []

for f in files:
    try:
        data = tomllib.loads(f.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as e:
        problems.append(f"{f.name} does not parse: {e}")
        continue
    # Codex requires these three; without them the file defines no agent.
    for key in ("name", "description", "developer_instructions"):
        if not data.get(key):
            problems.append(f"{f.name} has no {key}")
    # Codex identifies the agent by `name`, not the filename, so a mismatch
    # would register the agent under a name nothing routes to.
    if data.get("name") and data["name"] != f.stem:
        problems.append(f"{f.name} declares name '{data['name']}'")
    # A body cut short at a stray delimiter still parses — length is what
    # catches it.
    if len(data.get("developer_instructions", "")) < 500:
        problems.append(f"{f.name} instructions look truncated")

for p in problems:
    print("FAIL\t" + p)
if not problems:
    print(f"OK\t{len(files)} agents render to valid Codex TOML")
PY
    while IFS=$'\t' read -r status detail; do
      [ -z "${status:-}" ] && continue
      if [ "$status" = "OK" ]; then pass "$detail"; else fail "$detail"; fi
    done < "$TMP"
    rm -rf "$CODEX_TMP"
  fi
else
  warn "node or python tomllib unavailable — skipped Codex TOML checks"
fi

# ------------------------------------------------------------------- hygiene

head_ "Repository hygiene"

if git rev-parse --git-dir >/dev/null 2>&1; then
  if git diff --check >/dev/null 2>&1; then
    pass "no whitespace errors in the diff"
  else
    fail "git diff --check reports whitespace errors"
  fi

  # A specialist copied into this repo for testing would duplicate the source of
  # truth if it were ever committed.
  # Probe with a path *inside* the directory: check-ignore on a directory that
  # does not exist reports nothing, which would read as "not ignored".
  for d in .claude/agents .codex/agents; do
    if git check-ignore -q "$d/probe" 2>/dev/null; then
      pass "$d/ is ignored"
    else
      fail "$d/ is not ignored — a test copy could be committed"
    fi
  done

  tracked_sensitive="$(git ls-files | grep -Ei '(^|/)(\.env|.*\.token|.*\.secret|auth-profiles\.json|tokens\.json)$' || true)"
  if [ -n "$tracked_sensitive" ]; then
    fail "sensitive files are tracked: $(echo "$tracked_sensitive" | tr '\n' ' ')"
  else
    pass "no sensitive files tracked"
  fi
else
  warn "not a git repository — skipped git checks"
fi

# -------------------------------------------------------------------- summary

printf '\n'
if [ "$FAILURES" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  printf '\033[32mAll checks passed.\033[0m %s agents.\n' "$(ls agents/*.md | wc -l | tr -d ' ')"
elif [ "$FAILURES" -eq 0 ]; then
  printf '\033[32mPassed\033[0m with \033[33m%s warning(s)\033[0m. %s agents.\n' \
    "$WARNINGS" "$(ls agents/*.md | wc -l | tr -d ' ')"
else
  printf '\033[31m%s failure(s)\033[0m, %s warning(s).\n' "$FAILURES" "$WARNINGS"
  exit 1
fi
