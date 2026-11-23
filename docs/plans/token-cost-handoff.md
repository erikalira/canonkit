# Handoff — custo de tokens das delegações a subagentes

Atualizado em 2026-11-18. Diagnóstico feito numa sessão anterior, com dados reais do canonkit e do pitakus. **Nada foi implementado no canonkit.** Este handoff traz os números medidos, as fontes de custo e as propostas ordenadas por ganho/esforço.

## Dados medidos

### canonkit — `~/.claude/canonkit-activity/events.jsonl` (20 eventos `agent_end` com tokens)

Pesos usados (proporções padrão do cache de prompt; preços atuais não conferidos): saída 5×, escrita no cache 1,25×, leitura do cache 0,1×, entrada 1×.

| | Custo ponderado | Contexto médio por chamada | Chamadas |
|---|---|---|---|
| Bob (6 dispatches) | 79% do total, ~730k cada | 59–131k | 12–56 |
| Revisores (14: Gard, Quinn, Spencer, Pixie, Nova, Archie) | ~84k cada | 32–53k | 1–9 |

- Divisão do custo total: leitura do cache 44%, escrita 35%, saída 20%.
- **Piso de partida a frio: 24k a 42k tokens.** A Nova, numa dispatch de 1 chamada, escreveu de 24k a 42k no cache. Nos revisores, a escrita no cache é 52–98% do custo da dispatch.
- O contexto do Bob cresce com saídas de ferramentas: dentro dos subagentes houve 164 resultados de Bash (média de 4,5k caracteres, máximo de 23k) contra 11 de Read (`tool-results.jsonl`, `thread: subagent`). Ou seja, leem com `cat` e rodam testes com saída completa.
- Relatórios que voltam: 1,4k a 5k caracteres (~0,4–1,3k tokens), já limitados a ~25 linhas nos arquivos dos agentes. **Não são uma fonte relevante de custo.**
- Parte do canonkit no piso (estimativa por tamanho de arquivo): `~/AGENTS.md` (bloco de `reference/agents-block.md`, ~13,8k caracteres), `~/.claude/CLAUDE.md` (~5k), o `AGENTS.md` do projeto (~3k) e o arquivo do agente (5–11k). Total de ~7–9k tokens. O resto vem do Claude Code: prompt de sistema, esquemas de ferramentas e listas de skills e agentes.

### pitakus — 19 reviews reais (`claude -p`, Opus 5.5), consumo somado por `message.id`

- Piso (contexto da 1ª chamada): **27,6k a 34,9k**. Na review conferida depois da instrumentação, a escrita no cache foi de 41,9k. O valor gravado bateu exatamente com o log.
- Cada review herdava o canonkit inteiro: 16–17 agentes, 35–45 skills e a ferramenta `Task`. Nenhuma chamou subagente.
- **O piso acompanha o que está instalado:** com 35–36 skills e 16 agentes, ficou em ~28–29k; com 45 skills e 17 agentes, em ~34–35k. São cerca de **0,5k por skill ou agente listado**. Confiança média, porque a descrição do MR também varia.
- **100% das escritas no cache foram `ephemeral_1h`**, que custa mais que o cache de 5 minutos.
- O que o pitakus faz para economizar e se aplica aqui: referência em vez de conteúdo (diff como arquivo; achados anteriores só com título e corpo sob demanda), entradas com limite de caracteres e medição por camada a cada execução.

## Propostas, por ordem

1. **Medir.** Implementado no change `openspec/changes/dispatch-cost-metrics/`; falta confirmar numa dispatch real (tarefa 3.3). Esforço baixo; é o que valida as demais. No hook de log de dispatch: dividir a escrita no cache em 5m e 1h, registrar o contexto da 1ª chamada (o piso) separado do resto, registrar `brief_chars` no lançamento e corrigir o `report_chars`.
2. **`tools:` explícito no Bob, no Pipe e no Virgo, e tirar o `Skill` dos revisores que não usam.** Esforço baixo. Hoje "todas as ferramentas" traz esquemas grandes, como `Artifact` e a ferramenta de dispatch com a lista de agentes. Medir o piso antes e depois.
3. **Regras de economia de contexto no Bob** (`agents/bob.md`). Maior ganho em volume. Usar `grep` ou Read com intervalo em vez de `cat` no arquivo inteiro; rodar testes mostrando só as falhas (repórter `dot` ou `| tail -n 40`) e só no escopo afetado; não reler arquivo depois de editar. Estimativa (não medida): contexto médio de ~100k para ~70k, cerca de 20–25% do custo total.
4. **Revisar as descrições de skills e agentes.** Cada item listado custa ~0,5k em toda sessão e todo dispatch, inclusive em ferramentas que não delegam, como o pitakus.
5. **Regra de briefing no orchestrate: referência em vez de conteúdo.** Mandar caminho ou range do diff e comandos, não o diff colado.
6. **Cache de 5 minutos para subagentes**, se a proposta 1 confirmar que hoje é de 1 hora. Ainda não se sabe se o Claude Code permite configurar isso; verificar antes de propor.
7. **Tirar do `~/AGENTS.md` o que só o coordenador usa** (lista de agentes, delegação em paralelo, nova sessão, branches, Laya) e levar para a skill orchestrate. Economia de ~2–3k por dispatch. Mexe no bloco gerenciado, então passa pelo Virgo. Confirmar antes que os subagentes carregam esse arquivo.
8. **Retomar um subagente com SendMessage em vez de criar outro** quando o mesmo revisor precisa revisar de novo depois de uma correção. Já aconteceu 4 vezes no futlens.

Não fazer: mudar o formato dos relatórios (já são pequenos) nem matar o subagente no veredito (os revisores já terminam em 6–9 chamadas).

## Classificação e caminho

- As propostas 2 a 5 e 7 mudam o comportamento dos agentes e das instruções gerenciadas. São MEDIUM e alteram a configuração do time, então passam pelo Virgo. Seguir o ciclo do OpenSpec no `orchestrate`.
- A proposta 1 mexe em código de hook (`hooks/`, ou onde estiver o dispatch-log) e precisa de teste.
- Em todas, medir antes e depois com o `events.jsonl`; sem medição, não declarar ganho.

## Achados incidentais

- O `report_chars` nulo (26 de 43 linhas `agent_end` em 2026-11-18) vinha de uma corrida: no `SubagentStop`, a última chamada (o `SubagentHandback`) ainda não estava gravada no transcript. A mesma corrida tirava essa chamada, a de maior contexto, dos tokens. **Os números de custo acima estão subestimados.** Corrigido no change OpenSpec `dispatch-cost-metrics`. Haver mais `agent_end` que `agent_start` não é lacuna: grava-se uma linha cumulativa por parada (32 `agent_start` para 32 `agent_launch`).
- O pitakus roda `claude -p` com o `cwd` em `~/.pitakus/...` e herda o canonkit instalado no nível do usuário. Uma correção do lado do pitakus seria passar `--disable-slash-commands --tools Read,Grep,Glob,Bash` no modo review. Ainda não foi testado.

## Limpeza pendente

Os arquivos `pitakus_reviews.json`, `pitakus_usage.json`, `pitakus_assistant_usage.json` e `pitakus_check.json` estão na raiz deste worktree, sem versionamento, e contêm dados das reviews. Apagá-los; não devem entrar em commit.
