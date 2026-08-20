# Agent Team Config

Versioned source for the agent team used with Claude Code.

Each agent is a single Markdown file in `agents/`, stored in exactly the format
the runtime reads. Installing is a copy — there is no generation step and
nothing to reconcile by hand.

## Agents

| Agent | Role |
| --- | --- |
| `archie` | Arquitetura — fronteiras, contratos, trade-offs, risco de overengineering |
| `bob` | Engenharia — implementação, debugging, refactor |
| `quinn` | Qualidade — estratégia de teste, cobertura, risco de regressão |
| `gard` | Segurança — auth, secrets, exposição de serviço |
| `pipe` | DevOps — CI/CD, Docker, deploy readiness, observabilidade, rollback |
| `scott` | Produto — escopo, critérios de aceite, métricas |
| `pixie` | UX — fluxos, estados de UI, acessibilidade, microcopy |
| `spencer` | Documentação — ADRs, specs, runbooks, release notes |
| `iris` | ML / Visão Computacional |
| `virgo` | Maintainer — configuração de agentes |

## Install

```bash
./scripts/install.sh
```

Copies every `agents/*.md` into both runtime paths:

- `~/.agents`
- `~/.claude/agents`

Both are read by Claude Code. The script keeps them identical, which is what
prevents the two from drifting apart.

## Editing an agent

1. Edit `agents/<name>.md` in this repo.
2. Run `./scripts/install.sh`.
3. Commit.

Do not edit `~/.agents` or `~/.claude/agents` directly — the next install
overwrites them. This repo is the only source of truth.

## File format

```markdown
---
name: <agent-id>
description: "<one-line summary shown in the agent picker>"
---

Você é <Nome>, agente de ... da equipe.

## Missão
...
```

The `name` must match the filename. The `description` is what the delegating
model reads when deciding whether the agent fits a request, so it should say
what the agent owns, not just its title.

## Conventions

- **Autoridade explícita.** Each agent declares what it may veto, what it may
  ask for, and what it cannot decide alone.
- **Quando o veto é rejeitado.** Agents with veto power (`archie`, `gard`,
  `quinn`, `scott`) also say what to do when overruled: register the open risk,
  the condition that materializes it, the cost of fixing later, and the
  observable signal — then support the chosen implementation.
- **Proporcionalidade.** Every agent classifies LOW / MEDIUM / HIGH before
  recommending, and states what *not* to do on LOW.
- **Nenhum contexto assumido.** Agents look for existing context first and
  declare gaps explicitly instead of inventing evidence.
- **Escalonamento.** Agents name the owner when a decision leaves their
  authority. Because a subagent cannot spawn another, escalation surfaces in the
  agent's report for you to route.

## Não versionar

- tokens, `.env`, auth profiles, credenciais
- caches, logs, bancos locais
- qualquer arquivo gerado pelo runtime
