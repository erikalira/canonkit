# Handoff — velocidade das revisões por subagente (lições do pitakus)

Criado em 2026-11-14. Nada foi implementado. Não fazer commit sem autorização.

## Objetivo

Deixar mais rápidos os dispatches de revisão (Quinn, Gard, Archie e os outros revisores) sem mexer no modo de permissão nem no roteamento por risco.

## Evidência de origem

O pitakus (`~/dev/pitakus`) roda o `claude -p` no modo headless para revisar PRs. Foram 5 execuções da review 1, todas sobre o PR #37 do canonkit e todas com `claude-opus-5-5` (o padrão da CLI, sem `--model`). Cada uma levou de 20 a 100 segundos, com 4 a 11 chamadas de Bash e nenhum subagente, embora os 16 agentes e as 35 skills estivessem carregados. A velocidade veio do formato da tarefa, não do modelo:

- **Contexto preparado antes de começar.** O Go gera o worktree, o `diff.patch` e o `CR_CONTEXT.md` antes de chamar o agente. A primeira ferramenta roda cerca de 2 segundos depois do início.
- **Leitura econômica.** O agente junta vários comandos num Bash só (`cat …; wc -l …; grep '^diff --git' …`) e lê o diff em faixas (`sed -n A,Bp`, `grep -n`).
- **Saída pequena e estruturada**, com um ponto de parada claro (o veredito).

Houve um desperdício: um `sed -n 111,1255p` gerou uma saída grande demais, que o Claude Code salvou em arquivo, e o agente leu esse arquivo de volta com 3 `Read`.

São 5 execuções de um único PR. Serve como indício, não como medição.

## O que o canonkit já cobre (não refazer)

- Relatório curto, começando pelo veredito e com menos de ~25 linhas: está no "Expected output" de todos os agentes e em `docs/team.md` › Conventions.
- Poucos apontamentos de alto sinal: o "Pre-report gate" da Quinn (`agents/quinn.md:69`). Conferir se Gard e Archie têm algo equivalente antes de propor.
- O brief leva a evidência que o lead já tem: `skills/orchestrate/SKILL.md` › "Briefing verification" e "Compact continuity".

## Propostas

1. **Brief de revisão com o escopo do diff já resolvido** (`skills/orchestrate/SKILL.md`, perto de "Briefing verification").
   - Ao despachar um revisor, o brief informa a faixa de revisões (`base..head`, ou "working tree contra HEAD"), o comando exato para ver o diff e a lista de arquivos alterados com a contagem de linhas.
   - Assim o revisor começa lendo o diff, em vez de redescobrir o que mudou.
   - Não criar arquivo novo no repositório; a seção "Compact continuity" pede para evitar arquivos extras. Se o diff for grande, gravar no scratch e passar o caminho.
2. **Leitura econômica para os agentes que leem código.**
   - Juntar comandos de leitura independentes num Bash só.
   - Ler por faixa (`grep -n`, depois `sed -n A,Bp` ou Read com offset e limit), nunca arquivos ou diffs inteiros.
   - Manter cada saída pequena o bastante para não ser salva em arquivo pelo harness.
   - **Onde colocar**: no corpo dos agentes, que só carrega no dispatch, ou num trecho comum a eles. Evitar `reference/agents-block.md`, que é carregado em todo turno e já tem cerca de 13 KB; a seção FAQ do README trata desse custo.
3. **Medir antes e depois.** Usar a telemetria e o dashboard (`docs/telemetry.md`) para comparar a duração, os tokens e o tamanho do relatório de dispatches de revisão parecidos, antes e depois da mudança. Sem isso, a eficácia continua **UNMEASURED** (ver "Evidence-based completion" em `skills/orchestrate/SKILL.md`).

## O que não copiar do pitakus

- `bypassPermissions`: o canonkit preserva o modo de permissão escolhido pelo usuário.
- Matar o processo depois do veredito: no pitakus, isso impede registrar uso e custo.

## Risco e validação

- **Risco: MEDIUM.** A mudança altera instruções que todos os revisores seguem.
- **Testes atingidos**: segundo "Verification by reach", toda mudança de instrução chega aos testes de orçamento, de instalação idempotente e de segurança.
- **Durante a edição**: `npm run validate` e `npm run test:fast`.
- **Depois da última edição**: `npm test` (o portão de publicação).
- **Se o roteamento ou a qualidade dos relatórios puderem mudar**: `npm run eval` e `npm run eval:quality`.
- **Revisão**: Quinn, depois da última edição.
- **Notas de versão**: atualizar se houver mudança visível para o usuário.

## Próximo passo

Confirmar o escopo. A sugestão é começar pela proposta 1, a de menor custo e maior ganho. Depois, ler `docs/maintaining.md` (seção de validação) antes de editar os agentes.
