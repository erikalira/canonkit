# Handoff — superfície de ferramentas dos subagentes (proposta 2 de `token-cost-handoff.md`)

Atualizado em 2026-11-18. **Nada foi implementado nem escrito em OpenSpec ainda.** Escopo e decisões aprovados pela usuária; falta criar o change e implementar.

## Pendência anterior: tarefa 3.3 de `dispatch-cost-metrics`

O hook foi reinstalado (`node bin/cli.js install --claude --wire-hooks`) depois do commit `d09657f`, mas a sessão que fez a linha de base começou antes, então não gravou eventos. **A primeira dispatch em background da sessão nova serve para fechar a 3.3:** no `agent_end` dela em `~/.claude/canonkit-activity/events.jsonl`, conferir `report_chars` não nulo, `complete: true`, `tokens.first_call` e `cache_creation_5m`/`1h`, e `api_calls` igual ao transcript. Registrar em `openspec/changes/dispatch-cost-metrics/tasks.md`.

## Linha de base do "antes"

`first_call.context` (contexto da 1ª chamada da API, deduplicado por `message.id`, mesma lógica do `scanTranscript`), calculado dos transcripts em `~/.claude/projects/*/<sessão>/subagents/agent-<id>.jsonl` das 34 dispatches com `agent_end`:

| Restrição hoje | Agente (n) | Média | Faixa |
|---|---|---|---|
| allowlist `read` | Archie (2) | 27,6k | 27,5–27,6k |
| allowlist `read` | Gard (4) | 27,5k | 27,1–28,3k |
| allowlist `read` | Quinn (3) | 24,3k | 19,2–27,0k |
| allowlist `write-docs` | Spencer (4) | 27,6k | 27,2–28,2k |
| `full` (nenhuma) | Bob (9) | 44,0k | 42,8–44,8k |
| `full` (nenhuma) | Pipe (1) | 43,5k | — |
| `full` (nenhuma) | Virgo (0) | sem dado | — |
| denylist `inspect` | Perry (5) | 43,6k | 43,3–43,8k |
| denylist `inspect` | Pixie (3) | 41,6k | 41,4–41,7k |
| sem `access` (especialista) | Nova (3) | 42,0k | 41,8–42,3k |

Mais um ponto: um Quinn trivial em 2026-11-18 (sem ferramentas) deu 25,5k.

- **~16k por dispatch** separam allowlist de "todas as ferramentas"; o denylist do `inspect` (Edit, Write, NotebookEdit) quase não reduz.
- **Cache:** 100% da escrita no cache dos subagentes foi `ephemeral_5m` (0 de 1h). O 1h só apareceu no pitakus (`claude -p`); a proposta 6 do handoff anterior não vale para subagentes.
- **Uso real de ferramentas** (todas as dispatches acima): Bob usou Edit, Bash, Read, Write, ToolSearch e chrome-devtools (MCP); Perry usou chrome-devtools (muito), Bash, ToolSearch e Read. Nenhum revisor chamou `Skill`, `Grep` ou `Glob`.
- Os scripts de medição estavam no scratchpad da sessão e não foram mantidos; a lógica está descrita acima e o `first_call` agora sai do próprio hook.

## Decisões da usuária (2026-11-18)

1. **Escopo:** Bob, Pipe e Virgo (`full`) **e também** `inspect` (Pixie e Perry) passam a negar as ferramentas de coordenação. O MCP continua (Bob e Perry usam chrome-devtools).
2. **`Skill`:** derivar da citação. O instalador só inclui `Skill` na allowlist quando o corpo do agente cita uma skill. O Quinn (cita `orchestrate`) mantém; Archie, Gard, Scott e Spencer perdem. Confirmar com o Archie.

## Restrição de desenho

A spec `openspec/specs/agent-tool-access/spec.md` proíbe chaves `tools`/`disallowedTools` na fonte do agente: toda restrição vem da tradução de `access` em `bin/agent-access.js` (`claudeRestriction`). O requisito "Restriction keeps what the team rules need" exige manter a entrega do relatório (SubagentHandback), a skill citada e a web para `read`, `inspect` e `write-docs`.

Proposta a validar com o Archie: um nível novo `build` (denylist das ferramentas de coordenação: Agent, Artifact*, AskUserQuestion, Cron*, ScheduleWakeup, SendTo*, PushNotification, Enter/ExitPlanMode, MCP do Claude Docs) para Bob, Pipe e Virgo; `full` continua "sem restrição"; `inspect` ganha a mesma denylist mais Edit, Write e NotebookEdit. Manter SubagentHandback, ToolSearch, Monitor e TaskStop. Verificar se um nome inexistente num denylist é ignorado sem erro.

## Plano

- **Risco:** MEDIUM (muda o que o instalador gera para todos os usuários; sem auth, segredos ou migração).
- **Archie** (opus/medium): o vocabulário de `access` é contrato do kit. Decide entre nível novo e redefinir `full`, e se a derivação do `Skill` é automática.
- **Virgo** (sonnet/medium): cria o change OpenSpec `agent-tool-surface` (proposal, design, delta da spec, tasks) e altera as fontes dos agentes.
- **Bob** (sonnet/medium): `bin/agent-access.js`, validação e testes.
- **Quinn** (sonnet/medium): revisão depois da última edição.
- **Medição:** depois de instalar, numa sessão nova, uma dispatch trivial de cada agente afetado; comparar `first_call.context` com a tabela. Sem medição, não declarar ganho. Se o `Skill` render menos de ~1k, reverter essa parte.
- **Docs:** delta da spec, `docs/install.md`, tabela de acesso do `reference/agents-block.md` e as próximas notas em `docs/release-notes/`.
- A usuária quer ver o change escrito e aprovar **antes da implementação**.
