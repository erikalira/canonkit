# Handoff — padrão de UI: enxuta, estados compartilhados e carregamento progressivo

Criado em 2026-11-24, na branch `feat/ui-lean-states` (criada a partir do `main` local; o fetch do `origin` estava bloqueado pela sandbox, então confirmar com `git pull --ff-only` no `main` se precisar). Não fazer commit nem push sem autorização.

**Atenção:** a branch herdou mudanças já em stage de outra tarefa, a regra "above the fold first" (`agents/bob.md:57`, `stack-packs/ui-review/SKILL.md:75-77` e uma frase em `docs/release-notes/3.3.0.md` › "Progressive loading guidance"). Essa mudança é separada e já foi validada. Perguntar à usuária se ela vai num commit próprio antes de começar.

## Objetivo

O time deve implementar telas assim por padrão, sem a usuária precisar pedir ou corrigir. Não é meta de medição; é como toda tela nova ou alterada deve sair.

## Regras

Reescrever linhas existentes antes de adicionar novas.

1. **UI enxuta:** na tela, só o que a pessoa lê ou usa (valores, rótulos, ações). Nada de subtítulos explicativos, avisos, legendas ou datas, a menos que alguém peça. Usar ícone ou imagem no lugar de texto quando o significado for óbvio, rótulo curto para conceitos do app e `aria-label` em controle que só tem ícone.
2. **Estados compartilhados:** o carregamento usa o loader compartilhado ou um skeleton feito com as classes reais do layout, nunca uma linha "Loading…". Vazio e erro mostram uma linha curta mais a ação que resolve. Um componente por tipo de estado, igual em todas as telas.
3. **Carregamento progressivo:** o loader da rota espera só o que a primeira tela não consegue renderizar sem. Dados secundários (preços, imagens, enriquecimentos, rankings, estatísticas extras) são adiados e mostram o próprio skeleton ou um loader pequeno no lugar, sem segurar a página. Imagens reservam o tamanho final.
4. **Medição ordena, não cancela:** uma medição sem ganho (em localhost, por exemplo) define prioridade, mas não desfaz o padrão. O bloqueio por desempenho vale para regressão real, não para "não provou ganho".

## O que já existe (não refazer)

Conferido em 2026-11-24 contra as fontes:

| Regra | Estado | Onde está, ou o que falta |
|---|---|---|
| 1 | ❌ ausente | `agents/pixie.md` não tem "lean" na missão nem pedido de remoção de texto. `agents/nova.md:14` só cita "iconography" como ponto de partida. Não há preferência por ícone nem `aria-label`. |
| 2 | ❌ ausente | Nenhum arquivo fala em padrão único por tipo de estado, em proibir "Loading…" ou em vazio/erro com a ação que resolve. O mais perto é o fallback "built from the real layout" de `agents/bob.md:58`, que vale só para partes adiadas. |
| 3 | ✅ quase toda | `agents/bob.md:56` (esperar só o essencial, adiar o resto) e `:58` (fallback próprio, tamanho final reservado, erro local); `agents/pixie.md:18`; `stack-packs/react/SKILL.md:36-39`; `stack-packs/ui-review/SKILL.md:73-74`. **Falta** o checklist em `stack-packs/ui-design/SKILL.md`, que hoje só preserva a geometria na troca fallback→conteúdo (`:93`). |
| 4 | ⚠️ parcial | Só `agents/bob.md:56` diz "Applying it needs no prior Perry measurement". `agents/perry.md` não diz que medição sem ganho não veta o padrão. |

## Onde aplicar

Só nas fontes do canonkit, nunca nas cópias instaladas.

- `agents/bob.md`: implementar 1–3 por padrão em toda rota ou tela nova ou alterada e conferir os estados antes de dar por pronto. Estender a regra existente em vez de criar outra.
- `agents/pixie.md`: missão "… and lean"; nos estados, "one shared pattern per kind; waits use a progress mark or layout-matching skeleton, not text"; incluir "removal of text the user neither reads nor acts on" no que a Pixie pode pedir.
- `agents/nova.md`: "prefer iconography and imagery over text where meaning is obvious; one visual treatment per state kind across screens".
- `agents/perry.md`: regra 4. Cuidado para não soar como afrouxar budget, que é autoridade exclusiva do Perry. A regra fala de não vetar um padrão por falta de ganho, não de mudar números.
- `stack-packs/ui-design/SKILL.md` e `stack-packs/ui-review/SKILL.md`: checklist com 1–3. É o que quem implementa lê sem chamar agentes.
- `stack-packs/react/SKILL.md`: já tem dados adiados com Suspense. Acrescentar só o skeleton no lugar e o espaço reservado para imagens, se ainda não estiverem cobertos. Mexer neste pack obriga a regenerar `test/fixtures/stack-packs-legacy` (`node test/fixtures/stack-packs-legacy/generate.mjs`; ver `PROVENANCE.md`).

## Cuidados

- **Custo de contexto:** preferir corpos de agente e skills, que carregam sob demanda, a linhas novas no bloco gerenciado do `AGENTS.md` (teto de 3.000 palavras).
- **Contra-exemplos que continuam valendo:** ação crítica ou destrutiva e recuperação de erro mantêm microcopy clara; WCAG AA continua intacto; skeleton não pode fazer a página pular.
- **Estilo:** curto, no tom das regras vizinhas; nenhum projeto citado pelo nome.
- **Notas de release:** a 3.3.0 ainda não tem tag (última: `v3.2.1`), então a nota entra em `docs/release-notes/3.3.0.md`, salvo decisão contrária da usuária.

## Risco e revisão

MEDIUM: comportamento de vários agentes muda, e Pixie e Perry têm autoridade de veto/bloqueio. A Virgo propõe e aplica nas fontes (proposta primeiro; aplicar só depois que a usuária concordar). Depois da última edição, o Quinn confere a consistência entre os arquivos. Pegar modelo e esforço de `node bin/cli.js models show` (o `npx` fica bloqueado pela sandbox).

## Validação

- `bash scripts/validate.sh`
- `node --test "test/*.test.js" "test/e2e/*.test.js"`. O `npm test` falha no `pretest` porque o `vite` não está instalado e o registry está bloqueado. Sem o dashboard compilado, a linha de base em 2026-11-24 era **983 pass / 277 fail**; comparar a lista de testes que falham antes e depois, não só a contagem.
