# ADR 0005 — Contexto inflado se resolve com handoff manual

- Status: aceita
- Data: 2026-11-03 (registrada aqui em 2026-11-06, vinda da memória local do Claude
  Code, que Codex e OpenCode não leem)
- Os fatos sobre cada plataforma são de 2026-11-03 e não foram verificados de novo
  neste registro.

## Contexto

Uma sessão longa fica cara. A regra "New session when the subject changes" já
tratava disso com um processo manual, e a pergunta era se valia automatizá-lo. Pela
[ADR 0004](0004-full-quality-harnesses-only.md), o mecanismo precisa funcionar nos
três alvos: Claude Code, Codex e OpenCode.

## Decisão

Manter a regra como está: handoff escrito, sessão nova e prompt de abertura colado.
É o único mecanismo que funciona nas três plataformas.

Decisão relacionada, posterior: o handoff fica em `docs/plans/<tópico>-handoff.md`,
no repositório, e não mais em memória.

## Alternativas consideradas

- **Modelo ou hook disparando `/clear` ou `/compact`.** Impossível: não há API para
  isso. Há pedidos abertos no Claude Code: #37307, #39275 e #46695.
- **Hook `SessionStart` injetando o handoff.** Na prática, só funciona no Claude: a
  injeção pelo `SessionStart` do Codex não foi confirmada, e o OpenCode não tem esse
  evento. Economiza apenas o ato de colar, e o matcher `compact` tinha um bug de
  injeção.
- **Subagente como "contexto limpo".** A sessão principal continua grande, então o
  custo não muda.
- **Auto-compactação.** Na experiência de quem mantém o kit, gasta mais tokens que o
  handoff, e o resumo perde informação sem que se escolha o quê.

Opção não adotada: citar `/clear` (Codex e OpenCode: `/new`) como forma de "começar
uma sessão nova" na mesma janela.

## Quando reavaliar

Só se uma plataforma ganhar `clear` ou `compact` programático, ou se surgir uma
injeção no início da sessão que funcione nas três. Até lá, essas alternativas não
são propostas de novo.

## Consequências aceitas

- Começar de novo custa uma colagem feita à mão.
- O lembrete do hook em ~100k/150k/200k tokens só sugere; a decisão continua com
  quem usa.
