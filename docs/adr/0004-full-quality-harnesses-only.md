# ADR 0004 — Só harnesses que rodam o time em qualidade plena

- Status: aceita
- Data: 2026-10-30 (registrada aqui em 2026-11-06, vinda da memória local do Claude
  Code, que Codex e OpenCode não leem)

## Contexto

O canonkit poderia cobrir mais ferramentas com um modo "time como skill": em um
harness sem subagentes, todos os papéis rodariam no contexto principal. A proposta
foi rejeitada. A razão dada por quem mantém o kit: é mais importante manter a
qualidade do que ser amplo sem qualidade.

O valor do núcleo está em três coisas: subagentes com contexto isolado, modelo e
effort fixos por agente, e um revisor independente, que é a base do "no self-merge".
Um modo que roda todos os papéis no contexto principal mantém os nomes e perde esse
valor.

## Decisão

1. Os alvos do canonkit são Claude Code, Codex e OpenCode.
2. Não há modo degradado: nenhum adapter ou fallback reproduz o time com fidelidade
   menor só para cobrir mais harnesses.
3. Um harness novo só entra no escopo quando quem mantém o kit o usa **e** ele
   consegue rodar os agentes nativamente.
4. Skills em `~/.agents/skills` que chegam a outros harnesses de graça são bem-vindas,
   mas isso nunca é anunciado como suporte ao time.

## Alternativas consideradas

- **"Time como skill" para harnesses sem subagentes.** Rejeitada: mais cobertura,
  sem isolamento de contexto, sem modelo e effort por agente e sem revisor
  independente.

## Consequências aceitas

- O kit deixa de atender quem usa só um harness sem subagentes nativos.
- A [ADR 0005](0005-manual-context-handoff.md) se apoia nesta decisão para escolher um
  mecanismo que funcione nos três alvos.
