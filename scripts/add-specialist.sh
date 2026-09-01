#!/usr/bin/env bash
# Install domain specialists into the CURRENT project.
#
# Two runtimes have to learn about the agent, and forgetting either one is the
# failure this script exists to prevent:
#
#   Claude Code reads .claude/agents/<name>.md
#   Codex reads AGENTS.md — it does not look at .claude/agents/ at all
#
# So this copies the file AND registers it in the project's AGENTS.md, in one
# step. Choosing which specialists a project gets stays a deliberate decision;
# only the bookkeeping is automated.
#
#   ./scripts/add-specialist.sh maya nova
#   ./scripts/add-specialist.sh --remove nova
#   ./scripts/add-specialist.sh --list
#
# Run it from the project that should receive the agents.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO_ROOT/agents"

SPECIALISTS=(maya nova echo dana iris)

START="<!-- agent-team-config:specialists:start -->"
END="<!-- agent-team-config:specialists:end -->"

# One-line summary per specialist, for the AGENTS.md entry Codex reads.
describe() {
  case "$1" in
    maya) echo "game design/game feel: core loop, progressão, pacing, recompensa, motivação, dificuldade e balance, economia como sistema de jogo, onboarding jogável, playtest." ;;
    nova) echo "direção visual: identidade visual, palette, composição, silhueta, luz, materiais, environment art, VFX language, mood, consistência do conjunto." ;;
    echo) echo "áudio/sound design: identidade sonora, paleta de som, hierarquia de mixagem, SFX como feedback, música adaptativa, espacialização, silêncio como decisão." ;;
    dana) echo "dados/analytics/experimentação: event taxonomy, telemetry schemas, qualidade de dado, funis, cohorts, retenção, A/B testing, guardrails, definição de métrica." ;;
    iris) echo "ML/visão computacional: extração de dados não estruturados, curadoria de dataset, avaliação de modelo, confiança/rastreabilidade de predições." ;;
    *)    echo "specialist." ;;
  esac
}

is_specialist() {
  local n="$1"
  for s in "${SPECIALISTS[@]}"; do [ "$s" = "$n" ] && return 0; done
  return 1
}

usage() {
  cat <<EOF
Usage: $(basename "$0") [--remove] <specialist>...
       $(basename "$0") --list

Specialists: ${SPECIALISTS[*]}
Run from the project directory that should receive the agents.
EOF
}

MODE=add
args=()
for a in "$@"; do
  case "$a" in
    --remove|-r) MODE=remove ;;
    --list|-l)   MODE=list ;;
    -h|--help)   usage; exit 0 ;;
    -*)          echo "Unknown option: $a" >&2; usage >&2; exit 1 ;;
    *)           args+=("$a") ;;
  esac
done

PROJECT="$PWD"

if [ "$MODE" = list ]; then
  echo "Project: $PROJECT"
  if [ -d "$PROJECT/.claude/agents" ]; then
    found=0
    for name in "${SPECIALISTS[@]}"; do
      if [ -f "$PROJECT/.claude/agents/$name.md" ]; then
        echo "  installed: $name"
        found=1
      fi
    done
    [ "$found" -eq 0 ] && echo "  (no specialists installed)"
  else
    echo "  (no .claude/agents/ — no specialists installed)"
  fi
  exit 0
fi

if [ ${#args[@]} -eq 0 ]; then
  usage >&2
  exit 1
fi

if [ "$PROJECT" = "$REPO_ROOT" ]; then
  echo "Refusing: this is agent-team-config itself, the source of truth." >&2
  echo "Run this from the project that should receive the specialists." >&2
  exit 1
fi

for name in "${args[@]}"; do
  if ! is_specialist "$name"; then
    echo "Not a domain specialist: $name" >&2
    echo "Core agents are installed by scripts/install.sh or scripts/install.ps1." >&2
    echo "Specialists: ${SPECIALISTS[*]}" >&2
    exit 1
  fi
  if [ ! -f "$SRC/$name.md" ]; then
    echo "Missing $SRC/$name.md" >&2
    exit 1
  fi
done

mkdir -p "$PROJECT/.claude/agents"

for name in "${args[@]}"; do
  if [ "$MODE" = add ]; then
    cp "$SRC/$name.md" "$PROJECT/.claude/agents/$name.md"
    echo "Installed $name -> .claude/agents/$name.md"
  else
    if [ -f "$PROJECT/.claude/agents/$name.md" ]; then
      rm "$PROJECT/.claude/agents/$name.md"
      echo "Removed .claude/agents/$name.md"
    else
      echo "Not installed: $name"
    fi
  fi
done

# Rebuild the managed block in the project's AGENTS.md from what is actually on
# disk, so the file always reflects reality rather than the history of commands.
installed=()
for name in "${SPECIALISTS[@]}"; do
  [ -f "$PROJECT/.claude/agents/$name.md" ] && installed+=("$name")
done

entries=""
# ${installed[@]} on an empty array is an unbound-variable error under `set -u`,
# and that path is the common one: removing the last specialist. Guard the
# expansion, or the block is left describing agents that no longer exist.
if [ ${#installed[@]} -gt 0 ]; then
  for name in "${installed[@]}"; do
    entries+="- **$name** — $(describe "$name")"$'\n'
  done
fi

BLOCK_BODY=""
if [ ${#installed[@]} -gt 0 ]; then
  BLOCK_BODY="# subagentes deste projeto

Além do core (ver ~/AGENTS.md), este projeto instala os specialists abaixo. Use o
Agent tool para delegar a eles quando o pedido se encaixar claramente no papel.

${entries}
Um specialist entra quando o domínio dele está em jogo, não por completude.
Fonte de verdade: repositório agent-team-config. Não edite os arquivos em
.claude/agents/ — eles são cópias."
fi

AGENTS_MD="$PROJECT/AGENTS.md"

AGENTS_MD="$AGENTS_MD" BLOCK_BODY="$BLOCK_BODY" START="$START" END="$END" python3 - <<'PY'
import os, pathlib, re

target = pathlib.Path(os.environ["AGENTS_MD"])
body = os.environ["BLOCK_BODY"].strip()
start, end = os.environ["START"], os.environ["END"]

text = target.read_text() if target.exists() else ""
pattern = re.compile(r"\n*" + re.escape(start) + r".*?" + re.escape(end) + r"\n*", re.S)

if not body:
    # No specialists left: drop the block entirely rather than leaving an empty one.
    if pattern.search(text):
        new = pattern.sub("\n", text).strip()
        new = new + "\n" if new else ""
        target.write_text(new)
        print(f"Removed specialist block from {target.name}")
    else:
        print(f"No specialist block in {target.name}")
else:
    managed = f"{start}\n{body}\n{end}"
    if pattern.search(text):
        new = pattern.sub("\n\n" + managed + "\n", text).strip() + "\n"
        action = "Updated"
    else:
        new = (text.rstrip() + "\n\n" if text.strip() else "") + managed + "\n"
        action = "Added"
    if new != text:
        target.write_text(new)
        print(f"{action} specialist block in {target.name}")
    else:
        print(f"already current: {target.name}")
PY

echo
echo "Claude Code reads .claude/agents/ — Codex reads AGENTS.md. Both are now current."
