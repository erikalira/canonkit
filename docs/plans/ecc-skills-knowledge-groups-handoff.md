# Handoff — conhecimentos das skills do ECC para revisão no CanonKit

Data: 2026-11-11. Estado: **G01–G03 revisados, V/L incorporados ao planejamento visual; G04 reaberto em 2026-11-11 (adiamento levantado; deltas propostos); G05–G28 revisados (lotes 1 a 4, sem implementação); nenhum grupo pendente**.

Atualização do apply em 2026-11-09: os V/L aceitos de G01–G03 foram implementados nas fontes locais
da change visual; progresso, evidências offline, reviews e limites atuais ficam
em [tasks.md](../../openspec/changes/archive/2026-11-11-ui-focused-visual-workflow/tasks.md).
O inventário e as classificações abaixo preservam o diagnóstico histórico.
O adiamento de G04 foi levantado pelo usuário em 2026-11-11 (ver G04); implementação local não significa instalação nem eficácia
comportamental medida.

## Objetivo e próximo passo

Revisar o conhecimento do ECC por grupo, identificar o que já existe no CanonKit e decidir o menor complemento útil. Este documento organiza a comparação; não aprova instalação, importação em massa, criação de agentes, implementação ou publicação. O usuário autorizou a revisão dos artefatos de `ui-focused-visual-workflow` para todos os V/L de G01–G03 e o registro das classificações de G01–G04; isso não autoriza aplicar as instruções planejadas aos agentes/packs.

**Próximo passo da área visual:** implementar a change `ui-focused-visual-workflow` somente após pedido de apply. G01–G03 já têm destino documental; G04, antes adiado, foi reaberto em 2026-11-11 e tem seus deltas propostos na seção do grupo; packs de plataforma continuam dependendo de plataforma/projeto selecionado. O inventário está completo (G01–G28 revisados em 2026-11-11); o que resta é decidir quais deltas aplicar, ver [Deltas propostos por destino](#deltas-propostos-por-destino).

## Fontes, recorte e verificação

- Fonte solicitada: [skills do ECC em main](https://github.com/affaan-m/ECC/tree/main/skills).
- Snapshot fixado: [`d2ef2680594f9a17526a6e1a2e18b3d242c5d17b`](https://github.com/affaan-m/ECC/tree/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills). Todos os links individuais abaixo usam essa revisão.
- [Árvore Git consultada](https://api.github.com/repos/affaan-m/ECC/git/trees/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b?recursive=1): resposta sem truncamento; **314 diretórios imediatos com `SKILL.md`, 314 entrypoints recuperados, zero falhas**. Não havia outros `SKILL.md` aninhados sob `skills/`. A contagem exclui cópias/adaptadores de `.agents/skills/`, comandos, regras, agentes e hooks fora desse diretório.
- Inventário inicial por descrição, estrutura dos entrypoints e inspeções dirigidas. A revisão G01–G04 examinou os 31 entrypoints e referências auxiliares pertinentes de Angular (Aria, animações, transições de rota e harnesses), além do checker de evidência de frontend, na mesma revisão fixa. Não houve execução de scripts/serviços nem auditoria exaustiva das receitas. A classificação não certifica exemplos ou APIs.
- Baseline CanonKit: branch `main`, HEAD `1637bbd1f39a357bbf3a4a6d41498015ada06006`, com alterações anteriores staged em diversas áreas. As evidências locais apontam para o **working tree inspecionado**, incluindo essas alterações; não comprovam conteúdo do pacote publicado nem instalação no HOME ou nos projetos consumidores.
- Graphify foi consultado para localizar catálogo, engenharia, segurança e continuidade. Seu build era de 2026-11-09; as conclusões locais foram conferidas nas fontes atuais, sem depender das linhas históricas do grafo.
- Validação deste trabalho é documental. Nenhuma execução de modelos, instalação, mutação externa ou teste de aplicação faz parte deste inventário.

Para atualizar o universo, consultar novamente a árvore Git, resolver o novo SHA e comparar os caminhos que correspondem a `^skills/[^/]+/SKILL\.md$`. Registrar adições/remoções antes de alterar contagens; não substituir silenciosamente o snapshot usado por uma decisão anterior.

## Como interpretar as tabelas

| Situação por skill | Significado |
| --- | --- |
| Parcial | Há sobreposição identificada nas fontes locais citadas para o grupo. Não significa importação da skill, equivalência completa ou eficácia medida. A revisão detalhada deve separar exatamente o trecho coberto do delta. |
| Planejado | A skill é referência explícita da change visual; implementação pendente. Não significa que todo seu conteúdo foi aceito. |
| A comparar | Não foi estabelecida correspondência suficiente nesta triagem. Não significa ausência comprovada nem obrigação de incorporar. |
| Diverge | O mecanismo principal conflita com uma decisão atual do CanonKit; só extrair ideias compatíveis ou reabrir explicitamente a decisão. |
| Legado ECC | O próprio snapshot marca a entrada como legada/depreciada. Mantida para completar o inventário, sem recomendação de adoção. |

Um grupo ter um dono não equivale a já ter suas receitas. Um agente existir em `agents/` não equivale a estar instalado no projeto consumidor. Ferramentas e skills pessoais disponíveis ao mantenedor não contam automaticamente como funcionalidades distribuídas pelo CanonKit.

A prioridade **1** indica revisão transversal ou change em andamento; **2**, aprofundamento com provável reutilização; **3**, demanda concreta de projeto; **4**, vertical fora do foco atual do núcleo. As tabelas de inventário por skill preservam a **situação inicial histórica**. As tabelas de revisão de G01–G04 abaixo registram o diagnóstico posterior por ideia e seu destino.

| Código da revisão | Classificação |
| --- | --- |
| C | Já coberto no CanonKit |
| S | Previsto suficientemente na change |
| V | Previsto, mas com critérios vagos ou incompletos na revisão anterior à incorporação |
| L | Lacuna que vale incorporar |
| P | Conhecimento de framework/plataforma adequado a pack opcional por demanda |
| D | Adiar ou rejeitar, conforme a justificativa da linha |

Nas tabelas de revisão, prioridade **1** significa incorporar nesta revisão; **2**, verificação condicional à superfície; **3**, demanda futura; **—**, nenhuma adição. Os códigos V/L ficam como rastreio do diagnóstico: todos os de G01–G03 foram aceitos no planejamento, sem alegar implementação. G04 foi adiado em 2026-11-09 e reaberto por decisão explícita do usuário em 2026-11-11; seus códigos passam a valer como os dos demais grupos, sem alegar implementação.

Destinos M1–M4 remetem às decisões consolidadas do [design visual](../../openspec/changes/archive/2026-11-11-ui-focused-visual-workflow/design.md) e aos requisitos/cenários de [interface workflow](../../openspec/changes/archive/2026-11-11-ui-focused-visual-workflow/specs/interface-design-workflow/spec.md). Este handoff preserva a comparação e as decisões; os artefatos da change são a fonte de verdade para implementação e aceitação.

## O que já está presente, sem confundir com paridade ECC

| Área | Evidência no CanonKit | Limite da afirmação |
| --- | --- | --- |
| Dez packs opcionais | [Plano dos packs](stack-packs-design.md), [catálogo](../../bin/stack-packs.js), fontes em `stack-packs/`: typescript, cpp, csharp, java, python, react, rust, go, kotlin, swift. | Os packs referenciam principalmente agentes/reviewers/resolvers do ECC em `b38be6a7f6350964d59328b52f0624e1d1d552d1`. Não são cópia integral das skills do snapshot atual. |
| Engenharia e qualidade | [Bob](../../agents/bob.md), [Quinn](../../agents/quinn.md), [spec de engenharia](../../openspec/specs/engineering-delivery/spec.md). | Debugging por hipótese, regressão seletiva, revisão de conformidade/qualidade e evidência atual existem. Isso não comprova todos os runners e checklists do ECC. |
| Descoberta de produto | [Scott](../../agents/scott.md), [spec de produto](../../openspec/specs/product-discovery/spec.md). | Problema, restrições, hipóteses, decisões e aceitação já têm lugar; não duplicar PRD ou brief. |
| Orquestração e continuidade | [Orchestrate](../../skills/orchestrate/SKILL.md), [spec de continuidade](../../openspec/specs/context-continuity/spec.md). | Handoffs compactos, validação de relatos, isolamento de escritores e revisão por risco existem; não equivalem a runtime autônomo ou DAG executor. |
| Segurança e gates | [Gard](../../agents/gard.md), [hook](../../hooks/canonkit-hook.js), [política ambiental](../../openspec/specs/environment-security-policy/spec.md), [diagnósticos](../../openspec/specs/security-diagnostics/spec.md). | Há mecanismos próprios. Comparar efeito e limites por harness; não transferir para o CanonKit promessas de wrappers/scanners do ECC. |
| Aprendizado manual | [Learning loop](../../skills/learning-loop/SKILL.md), [seu desenho](learning-loop-design.md). | Propostas humanas e evidência são deliberadas; não há equivalência com observação automática e promoção de instincts. |
| Contexto e medição | [Context tune](../../skills/context-tune/SKILL.md), [telemetria](../telemetry.md), [Perry](../../agents/perry.md). | Volume de resultados, tokens observados e orçamento de performance são coisas diferentes; telemetria atual não fornece custo monetário exato. |
| Avaliação de instruções | [Evals](../evals.md), [rubrica](../../evals/instruction-rubric.json), [avaliação histórica do ECC](../../evals/audits/2026-10-29-ecc.json). | Infraestrutura e resultados antigos não comprovam adesão às 314 skills atuais; melhoria comportamental continua não medida sem ensaios correspondentes. |
| UI visual | [Proposta](../../openspec/changes/archive/2026-11-11-ui-focused-visual-workflow/proposal.md), [design](../../openspec/changes/archive/2026-11-11-ui-focused-visual-workflow/design.md), [tasks](../../openspec/changes/archive/2026-11-11-ui-focused-visual-workflow/tasks.md). | **Planejamento, 0/12 tarefas implementadas** no estado inspecionado (histórico de 2026-11-09; a change foi implementada, 12/12, e arquivada em 2026-11-11). `ui-design`, `ui-review` e `game-art-direction` ainda não estão no catálogo. |

## Mapa dos grupos

Cada skill aparece em um único grupo principal, mesmo quando toca vários assuntos. O grupo define por onde começar; os donos dos riscos continuam sendo os existentes no CanonKit.

| Grupo | Conhecimento | Skills | Prioridade | Cobertura local inicial | Revisão |
| --- | --- | ---: | --- | --- | --- |
| [G01](#g01) | UI, UX e acessibilidade | 9 | 1 | Planejado + parcial | Revisado; V/L no planejamento |
| [G02](#g02) | Motion de interfaces | 3 | 2 | Princípios gerais | Revisado; V/L no planejamento |
| [G03](#g03) | Frontend web e ferramentas | 10 | 2 | React parcial | Revisado; V/L no planejamento |
| [G04](#g04) | Mobile e interfaces nativas | 9 | 3 | Linguagens parciais | Revisado; adiamento levantado, deltas propostos, não aplicados |
| [G05](#g05) | Linguagens, concorrência e runtime | 12 | 2 | Packs de linguagem existentes | Revisado; deltas propostos, não aplicados |
| [G06](#g06) | Arquitetura, APIs e frameworks backend | 14 | 2 | Arquitetura geral | Revisado; deltas propostos, não aplicados |
| [G07](#g07) | Bancos, ORM e migrações | 10 | 2 | Governança geral | Revisado; deltas propostos, não aplicados |
| [G08](#g08) | Testes, regressão e verificação | 25 | 1 | Protocolos parciais | Revisado; deltas propostos, não aplicados |
| [G09](#g09) | Segurança, permissões e supply chain | 12 | 1 | Segurança parcial | Revisado; deltas propostos, não aplicados |
| [G10](#g10) | Prática de engenharia, revisão e Git | 12 | 1 | Recortes presentes | Revisado; deltas propostos, não aplicados |
| [G11](#g11) | Produto, escopo e planejamento | 7 | 2 | Descoberta parcial | Revisado; deltas propostos, não aplicados |
| [G12](#g12) | Documentação e navegação de código | 7 | 1 | Documentação parcial | Revisado; deltas propostos, não aplicados |
| [G13](#g13) | Orquestração de equipes e execução paralela | 16 | 2 | Orquestração parcial | Revisado; deltas propostos, não aplicados |
| [G14](#g14) | Construção de agentes e loops autônomos | 11 | 3 | Sem runtime equivalente demonstrado | Revisado; deltas propostos, não aplicados |
| [G15](#g15) | Contexto, memória e aprendizado | 11 | 2 | Continuidade e aprendizado manual | Revisado; deltas propostos, não aplicados |
| [G16](#g16) | Avaliação e diagnóstico de agentes | 7 | 1 | Infraestrutura de eval existente | Revisado; deltas propostos, não aplicados |
| [G17](#g17) | Catálogo, instalação e ferramentas do ECC | 18 | 3 | Lifecycle próprio | Revisado; deltas propostos, não aplicados |
| [G18](#g18) | Operações, deploy e ambientes | 13 | 2 | Operações gerais | Revisado; deltas propostos, não aplicados |
| [G19](#g19) | Desempenho, custos e orçamento | 10 | 2 | Medição parcial | Revisado; deltas propostos, não aplicados |
| [G20](#g20) | Dados, ML e aplicações de IA | 10 | 3 | Autoridade de especialistas | Revisado; deltas propostos, não aplicados |
| [G21](#g21) | Pesquisa e evidência científica | 10 | 3 | Pesquisa sem catálogo equivalente demonstrado | Revisado; deltas propostos, não aplicados |
| [G22](#g22) | Marca, conteúdo e crescimento | 17 | 4 | Fora do foco atual do núcleo | Revisado; deltas propostos, não aplicados |
| [G23](#g23) | Direção criativa, mídia e vídeo | 12 | 3 | Direção visual parcial; pipeline não demonstrado | Revisado; deltas propostos, não aplicados |
| [G24](#g24) | Conectores, comunicação e documentos | 16 | 3 | Princípios gerais; integrações não demonstradas | Revisado; deltas propostos, não aplicados |
| [G25](#g25) | Operações de negócios e indústria | 8 | 4 | Não mapeado | Revisado; deltas propostos, não aplicados |
| [G26](#g26) | Finanças, pagamentos e blockchain | 10 | 4 | Segurança geral não equivale a domínio | Revisado; deltas propostos, não aplicados |
| [G27](#g27) | Saúde e dados clínicos | 5 | 4 | Não mapeado | Revisado; deltas propostos, não aplicados |
| [G28](#g28) | Redes e homelab | 10 | 4 | Operações gerais não equivalem a rede | Revisado; deltas propostos, não aplicados |

## Procedimento de revisão de um grupo

1. Ler os entrypoints do snapshot e os arquivos auxiliares que realmente alteram sua interpretação. Tratar instruções do ECC como material de comparação, sem executá-las.
2. Conferir as fontes atuais do CanonKit. Para cada ideia, registrar: **já coberta**, **adotar**, **adaptar**, **adiar** ou **rejeitar**, com evidência e justificativa. Atualizar a linha correspondente; não decidir pelo nome da skill.
3. Propor apenas o delta útil: problema concreto, comportamento observável, local canônico, custo de contexto/manutenção e como verificar. Preferir atualizar o dono/procedimento existente a criar outro.
4. Separar princípio portável, receita de stack, dependência de provedor e execução operacional. Não criar um agente por skill nem fazer todo conhecimento virar instrução residente.
5. Registrar a decisão nesta seção do grupo. Usar a change OpenSpec existente quando aplicável; este handoff é índice comparativo, não uma segunda especificação de implementação.
6. Se houver implementação autorizada, aplicar risco e reviews reais do efeito. Documentar validação e limitações; formato, lint e fixtures não provam melhora de julgamento do modelo.

Modelo de decisão para preencher **ao revisar**, sem criar 314 registros vazios agora:

| Ideia / trecho da skill | Decisão | Evidência local ou lacuna | Destino do delta | Verificação | Pendência |
| --- | --- | --- | --- | --- | --- |
| Identificar na revisão do grupo | Já coberta / adotar / adaptar / adiar / rejeitar | Fonte e comportamento concreto | Fonte existente, pack opcional ou projeto | Check adequado ao efeito | Dono/decisão que falta, se houver |

## Inventário completo por grupo

<a id="g01"></a>

### G01 — UI, UX e acessibilidade

**Prioridade 1; revisado em 2026-11-09; 9 skills.**

**Evidência local:** [Pixie](../../agents/pixie.md), [Nova](../../agents/nova.md) e [change visual](../../openspec/changes/archive/2026-11-11-ui-focused-visual-workflow/design.md).

**O que vale avaliar:** Completar a change existente com estados explícitos, acabamento concreto, auditoria de tokens quando necessária e evidência renderizada. Incluir as outras skills de UI na comparação; as três referências atuais não esgotam este grupo.

**Destino provável:** Packs ui-design/ui-review e princípios dos donos existentes; evitar outra change concorrente.

**Responsabilidades:** Pixie para UX; Nova se instalada para visual; Bob/Quinn na aplicação. A revisão documental atual e sua validação ficam nas tasks da change; a instalação de especialistas não é implícita.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [accessibility](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/accessibility/SKILL.md) | Auditoria de acessibilidade web, iOS e Android | Parcial |
| [browser-qa](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/browser-qa/SKILL.md) | Smoke, interação, regressão visual e acessibilidade no navegador | Planejado |
| [click-path-audit](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/click-path-audit/SKILL.md) | Sequências completas de cliques e efeitos que se anulam | Parcial |
| [design-system](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/design-system/SKILL.md) | Inventário de tokens e auditoria da coerência visual | Planejado |
| [frontend-a11y](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/frontend-a11y/SKILL.md) | Semântica, formulários, foco e leitores de tela no frontend | Parcial |
| [frontend-design-direction](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/frontend-design-direction/SKILL.md) | Direção visual pelo produto e critérios de acabamento renderizado | Planejado |
| [i18n-sync](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/i18n-sync/SKILL.md) | Sincronização de chaves, terminologia e validação de traduções | A comparar |
| [inherit-legacy-style](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/inherit-legacy-style/SKILL.md) | Descobrir e preservar convenções implícitas de um produto existente | Parcial |
| [make-interfaces-feel-better](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/make-interfaces-feel-better/SKILL.md) | Alinhamento óptico, tipografia, superfícies e estados de controles | Parcial |

**Resultado da comparação:** os itens abaixo foram separados por ideia, conferindo as fontes atuais. Estados, feedback/recuperação, temas/locales suportados, acabamento/assets, falhas relevantes e estabilidade receberam critérios na change. A inspeção de exemplares existentes não exige auditoria universal de tokens; não se importa checker JSON, breakpoints fixos, notas ou proibições estéticas universais.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `accessibility`: semântica, nomes, contraste, foco, alvos e recuperação | C | [Pixie](../../agents/pixie.md), checklist AA | Reutilizar checklist e autoridade existentes, sem outro protocolo geral | — |
| `frontend-a11y`: operação de formulários, overlays e feedback dinâmico | V | Interface workflow já pede acessibilidade, mas sem observações específicas | M3: associação campo/erro, teclado, entrada/retorno de foco e anúncios relevantes; cenários de revisão renderizada | 1 |
| `browser-qa`: baseline e limites de screenshot/automação | S | Interface workflow: baseline, evidência e revisão parcial | Preservar o contrato existente | — |
| `browser-qa`: console, rede, assets e temas | L | Não estavam explícitos na revisão renderizada | M3: relacionar falhas ao fluxo, distinguir erros esperados e revisar assets/temas suportados afetados | 1 |
| `click-path-audit`: resultado final corresponde à ação prometida | V | [Bob](../../agents/bob.md) e [Quinn](../../agents/quinn.md) já cobrem ordem/retry/interrupção; workflow pedia apenas interações | M2: resultado final e recuperação no fluxo afetado; tracing de handlers/estado só por risco concreto | 1 |
| `design-system`: reutilizar componentes/tokens e procurar incoerências | S | Interface workflow e decisão 3 do design | Reutilizar exemplares; ampliar amostra apenas quando houver deriva demonstrável | — |
| `design-system`: gerar arquivos fixos, três concorrentes e notas em dez dimensões | D | Design exclui artefatos/sistema visual obrigatório | Rejeitar a obrigação sem necessidade demonstrada | — |
| `frontend-design-direction`: produto, referências, identidade e tela representativa | S | Requisitos de direção e handoff no interface workflow | Preservar; referências locais podem bastar | — |
| `frontend-design-direction`: estados com gatilho, feedback e próxima ação | V | Pixie enumera estados; workflow usava estados aplicáveis/aparência sem contrato detalhado | M2: loading, vazio, erro, parcial, sucesso e permissão pertinentes; não aplicável justificado versus não testado | 1 |
| `make-interfaces-feel-better`: acabamento óptico e estabilidade | L | Nova tem princípios verificáveis; faltavam exemplos concretos de acabamento no workflow | M1/M4: ritmo, alinhamento óptico, texto, ícones/superfícies e estabilidade de controles/números | 1 |
| `inherit-legacy-style`: convenções e exemplares existentes sem copiar defeitos | C | Bob exige padrões locais; [Nova](../../agents/nova.md) procura tokens, assets e identidade | A skill trata principalmente de código; preservar identidade visual apoia-se em Nova/workflow. Sem `.ai-style-rules.md`, hooks ou declarações por turno | — |
| `i18n-sync`: contexto e comprimento das strings | V | Workflow cobria conteúdo longo sem detalhar locales | M3: textos representativos, placeholders, formatos e RTL quando pertinentes a locales já suportados | 2 |
| `i18n-sync`: sincronização e Locakit | D | Fora do escopo visual; a própria skill exclui QA visual | Adiar manutenção de traduções para demanda própria; não instalar serviço/CLI | 3 |

**Decisão:** todos os V/L acima incorporados ao planejamento M1–M4, com critérios e tarefas na change; implementação pendente. Fórmulas de raios, font smoothing, bordas em todas as imagens e escalas/tempos fixos permanecem heurísticas condicionais, não regras universais. Ao citar acessibilidade, conferir o critério: WCAG 2.2 2.4.11 trata de foco não obscurecido (AA), enquanto 2.4.13 trata de aparência do foco (AAA); medidas de alvos possuem contexto/exceções. [Fonte normativa conferida](https://www.w3.org/TR/WCAG22/).

<a id="g02"></a>

### G02 — Motion de interfaces

**Prioridade 2; revisado em 2026-11-09; 3 skills.**

**Evidência local:** [Divisão visual/UX planejada](../../openspec/changes/archive/2026-11-11-ui-focused-visual-workflow/specs/visual-design-ownership/spec.md), [Perry](../../agents/perry.md).

**O que vale avaliar:** Comparar propósito do movimento, reduced motion, continuidade e estabilidade. Separar princípios portáveis das receitas motion/react e dos presets fixos.

**Destino provável:** Conhecimento opcional de UI; receitas de biblioteca somente em projetos que a usam.

**Responsabilidades:** Pixie/Nova/Perry conforme a decisão; sem instalação implícita de Nova. A revisão documental atual e sua validação ficam nas tasks da change.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [motion-advanced](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/motion-advanced/SKILL.md) | Gestos, drag-and-drop, SVG e sequências de animação | A comparar |
| [motion-foundations](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/motion-foundations/SKILL.md) | Tokens de motion, redução de movimento, desempenho e SSR | A comparar |
| [motion-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/motion-patterns/SKILL.md) | Transições e animações recorrentes de componentes | A comparar |

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `motion-foundations`: propósito e redução de movimento | L | Ownership distribuía motion entre donos sem critérios de aceitação | M4: propósito identificável; alternativa reduzida preserva informação, feedback e ações | 1 |
| `motion-foundations`: medição e hidratação | C | [Perry](../../agents/perry.md) e [React](../../stack-packs/react/SKILL.md) | Reutilizar medição/SSR existentes, sem outro gate | — |
| `motion-foundations`: biblioteca, tokens, springs, guards e hardware | P | React respeita framework/versões, sem impor biblioteca | Receita opcional por demanda; rejeitar presets e contagem de hardware como política universal | 3 |
| `motion-patterns`: continuidade de entrada/saída e interação | V | Divisão de motion existia sem finalização/interrupção verificáveis | M4: reversão rápida, mudança de intenção, foco e ações durante/depois da transição | 1 |
| `motion-patterns`: AnimatePresence, layoutId, stagger e wrappers | P | APIs específicas de biblioteca/framework | Pack futuro; sem tempos ou limites de filhos universais | 3 |
| `motion-advanced`: gestos, interrupção e trabalho contínuo | L | Pixie cobre operação; packs cobrem cleanup, mas faltava a ponte para revisão de motion | M4: entrada/dispositivo pertinente, alternativa ao gesto e pausa/limpeza quando o trabalho deixa de ser necessário | 2 |
| `motion-advanced`: morphing SVG, hooks, física e sequências | P | Implementação especializada, sem requisito atual de biblioteca | Adiar receitas para projeto que as utilize | 3 |

**Decisão:** todos os V/L incorporados ao planejamento M4. Pixie define propósito, continuidade e acesso; Nova define expressão visual; Bob implementa, Quinn verifica e Perry mantém medição/orçamento. Não criar novos donos, biblioteca obrigatória ou orçamento LOW. As referências auxiliares [Angular animations](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/angular-developer/references/angular-animations.md) e [route animations](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/angular-developer/references/route-animations.md) reforçam a separação entre finalidade portável e mecanismo de versão/plataforma.

<a id="g03"></a>

### G03 — Frontend web e ferramentas

**Prioridade 2; revisado em 2026-11-09; 10 skills.**

**Evidência local:** [Pack React](../../stack-packs/react/SKILL.md), [catálogo](../../bin/stack-packs.js).

**O que vale avaliar:** Comparar primeiro React, testes de componentes e performance medida. Vue/Angular/Nuxt e build tools dependem de demanda; verificar versões antes de adaptar exemplos.

**Destino provável:** Packs opcionais; não expandir o núcleo com tutoriais de frameworks.

**Responsabilidades:** Bob/Quinn; Archie se mudar contratos; Perry em desempenho. Esta incorporação não altera contratos de instalação nem receitas de framework; revisão e validação ficam nas tasks da change.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [angular-developer](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/angular-developer/SKILL.md) | Signals, formulários, injeção, roteamento e SSR no Angular | A comparar |
| [frontend-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/frontend-patterns/SKILL.md) | Estado, dados e composição em React e Next.js | Parcial |
| [nextjs-turbopack](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/nextjs-turbopack/SKILL.md) | Build, cache e migrações de convenções do Next.js | A comparar |
| [nuxt4-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/nuxt4-patterns/SKILL.md) | Dados, hidratação, SSR e regras de rotas no Nuxt | A comparar |
| [react-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/react-patterns/SKILL.md) | Hooks, Suspense, formulários e fronteiras servidor/cliente | Parcial |
| [react-performance](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/react-performance/SKILL.md) | Priorização de otimizações de React e Next.js | Parcial |
| [react-testing](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/react-testing/SKILL.md) | Testes de componentes, mocks de rede e limites com E2E | Parcial |
| [ui-to-vue](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/ui-to-vue/SKILL.md) | Conversão de screenshots e exports em componentes Vue | A comparar |
| [vite-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/vite-patterns/SKILL.md) | Configuração, plugins, variáveis, SSR e otimização de build | A comparar |
| [vue-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/vue-patterns/SKILL.md) | Reatividade, Composition API, Pinia e navegação | A comparar |

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `angular-developer`: signals, forms, DI, rotas e harnesses | P | Catálogo sem Angular; Bob exige padrões locais | Pack futuro por demanda; estados/resultados observáveis reaproveitados em M2/M3 | 3 |
| `frontend-patterns`: composição, estado, efeitos e semântica | C | Bob e pack React | Sem tutorial duplicado em ui-design; async segue os riscos do fluxo | — |
| `nextjs-turbopack`: bundler, cache e convenções de versão | P | React já manda estabelecer framework/bundler/versões | Fora da change; conferir a versão antes de adaptar exemplos | 3 |
| `nuxt4-patterns`: hidratação, carregamento e rotas | P | Catálogo sem Nuxt; donos técnicos existentes | APIs ficam em pack por demanda; expectativa de feedback/conteúdo progressivo cabe em M2/M3 | 3 |
| `react-patterns`: hooks, ownership de estado e fronteiras | C | React cobre hooks, efeitos, keys, hidratação e limites configurados | Sem expansão nesta change; forms/actions específicos continuam condicionais | — |
| `react-performance`: custo dominante medido | C | Perry já exige atribuição, comparação e build de produção | Reutilizar medição; sem otimização especulativa ou ranking fixo | — |
| `react-performance`: conteúdo progressivo sem deslocamento indevido | V | Workflow cobria layouts/estados sem estabilidade durante o carregamento | M3/M4: geometria estável na troca de fallback/conteúdo, assets e labels; preservar ações | 1 |
| `react-testing`: comportamento e camada de evidência adequada | C | Quinn e [engenharia](../../openspec/specs/engineering-delivery/spec.md) | Reutilizar testes de transições; evidência renderizada para layout/motion. Rejeitar cobertura percentual universal | — |
| `ui-to-vue`: conversão em lote externa | D | Design exclui dependências/infra novas; workflow limita uploads | Adiar conversor; revisão de assets, conteúdo provisório e referências por estado já cabe em M1–M3 | 3 |
| `vite-patterns`: build, plugins, env e SSR | P | Bob/engenharia distinguem alcance das verificações | Fora do workflow visual; build não prova layout/interação | 3 |
| `vue-patterns`: reatividade, Pinia e composição | P | Catálogo sem Vue; convenções locais já são obrigação de Bob | Pack por demanda; não universalizar Composition API/Pinia | 3 |

**Decisão:** o V acima está incorporado ao planejamento M3/M4. Os demais princípios úteis reutilizam M1–M4 e os donos atuais, sem novos packs. Não importar a proibição de controles nativos da referência [Angular Aria](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/angular-developer/references/angular-aria.md); os [harnesses](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/angular-developer/references/component-harnesses.md) reforçam testes pela interação pública. O [checker de frontend](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/frontend-design-direction/scripts/check-evidence.js) verifica completude, não verdade ou qualidade visual; não será incorporado.

<a id="g04"></a>

### G04 — Mobile e interfaces nativas

**Prioridade 3; classificado em 2026-11-09; adiamento levantado pelo usuário em 2026-11-11; 9 skills.**

**Evidência local:** [Pack Kotlin](../../stack-packs/kotlin/SKILL.md), [Swift](../../stack-packs/swift/SKILL.md), [React](../../stack-packs/react/SKILL.md).

**O que vale avaliar:** Não confundir conhecimento da linguagem com Android, Compose, Flutter, SwiftUI ou React Native. Selecionar plataforma antes de criar packs.

**Destino provável:** Packs de plataforma por demanda de projeto.

**Responsabilidades ao revisar:** Bob/Quinn; Pixie para UX e acessibilidade; donos de riscos concretos. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [android-clean-architecture](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/android-clean-architecture/SKILL.md) | Dependências e módulos de Android e Kotlin Multiplatform | Parcial |
| [compose-multiplatform-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/compose-multiplatform-patterns/SKILL.md) | Estado, navegação e composição de UI em Compose | Parcial |
| [dart-flutter-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/dart-flutter-patterns/SKILL.md) | Null safety, estado, async e arquitetura de widgets | A comparar |
| [flutter-dart-code-review](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/flutter-dart-code-review/SKILL.md) | Revisão de widgets e estado sem impor uma biblioteca | A comparar |
| [foundation-models-on-device](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/foundation-models-on-device/SKILL.md) | LLMs locais com o framework FoundationModels da Apple | A comparar |
| [ios-icon-gen](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/ios-icon-gen/SKILL.md) | Ícones e catálogos de assets para aplicativos iOS | A comparar |
| [liquid-glass-design](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/liquid-glass-design/SKILL.md) | Material e comportamento visual específico de plataformas Apple | A comparar |
| [react-native-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/react-native-patterns/SKILL.md) | Navegação, dados, listas e práticas de React Native/Expo | A comparar |
| [swiftui-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/swiftui-patterns/SKILL.md) | Estado, composição, navegação e desempenho em SwiftUI | Parcial |

| Skill / ideia | Classe na revisão | Evidência local | Destino futuro / justificativa | Prioridade |
| --- | --- | --- | --- | --- |
| `android-clean-architecture`: módulos, UseCases, repositories e DI | P | Kotlin preserva módulos/source sets, sem fornecer esse receituário | Avaliar em pack Android/KMP; não impor arquitetura em ajustes de UI | 3 |
| `compose-multiplatform-patterns`: estado, navegação, tema e recomposição | P | Kotlin cobre Flow, lifetimes, keys e efeitos de Compose condicionais | Pack de plataforma por demanda; não impor StateFlow/Material 3 universalmente | 3 |
| `dart-flutter-patterns`: widgets, async e bibliotecas | P | Não há pack Dart/Flutter | Selecionar plataforma/projeto antes de avaliar distribuição | 3 |
| `flutter-dart-code-review`: texto ampliado, safe areas, orientação, retorno e offline | L | Workflow genérico não explicita essas condições nativas | Adotar em [ui-design](../../stack-packs/ui-design/SKILL.md) e [ui-review](../../stack-packs/ui-review/SKILL.md), só quando a superfície é nativa/mobile: texto ampliado, safe areas, orientação, navegação de retorno e estados offline/interrompido. Hoje esses packs citam apenas toque/alvos e entrada por dispositivo (confirmado por grep). Não importar lista fixa de dispositivos nem limites de tamanho | 1 |
| `flutter-dart-code-review`: lint, state managers, goldens e cobertura | P | Quinn define cobertura por risco; não há suporte Flutter específico | Pack futuro sem limites de linhas, percentuais ou goldens universais | 3 |
| `foundation-models-on-device`: LLM local e streaming | D | Integração de IA fora do escopo de UI nativa | Rejeitar aqui e reavaliar em G20 (IA aplicada); disponibilidade e parcialidade já cabem no contrato genérico de estados | 3 |
| `ios-icon-gen`: seleção e integração de ícones | P | Nova já considera escala/coerência/proveniência; Swift não inclui gerador | Pack futuro; preservar inspeção no tamanho real sem universalizar scripts/imagesets/fornecedores | 3 |
| `liquid-glass-design`: materiais e morphing Apple | P | Nova/Pixie/Perry têm as autoridades relevantes | Não universalizar vidro/translucidez; avaliar aparências suportadas e conteúdo real no projeto selecionado | 3 |
| `react-native-patterns`: Expo, navegação, listas e APIs nativas | P | React não equivale a React Native/Expo | Pack separado por demanda; não transpor DOM/ARIA diretamente ao nativo | 3 |
| `swiftui-patterns`: estado, composição, navegação e previews | P | Swift cobre ownership/isolamento/tarefas, sem workflow SwiftUI completo | Pack futuro; previews de estados não comprovam dispositivo, navegação ou tecnologia assistiva | 3 |

**Decisão (2026-11-11):** o usuário levantou o adiamento de G04 (decidido em 2026-11-09). O único L, as condições nativas portáveis, entra no conjunto de deltas propostos (prioridade 1) para `ui-design`/`ui-review`, condicionado à superfície nativa/mobile. As receitas por plataforma (Android/KMP, Compose, Flutter, SwiftUI, React Native, ícones iOS, materiais Apple) continuam classe P: viram pack quando houver plataforma/projeto que fixe versões e ferramentas, e “parcial” nos packs de linguagem não significa cobertura de Android/Compose/SwiftUI. Nada foi aplicado; não confundir proposta com implementação nem exigir simulador/dispositivo, safe-area fixa ou biblioteca mobile como política universal.

<a id="g05"></a>

### G05 — Linguagens, concorrência e runtime

**Prioridade 2; revisado em 2026-11-11 (deltas propostos, não aplicados); 12 skills.**

**Evidência local:** [Plano e referências dos dez packs](stack-packs-design.md), [catálogo](../../bin/stack-packs.js).

**O que vale avaliar:** Fazer diff semântico dos packs existentes contra estas skills. Os packs foram inspirados principalmente em AGENTS do ECC de outra revisão; não representam importação integral destas skills. Perl e Bun requerem decisão nova.

**Destino provável:** Aprofundar packs existentes onde houver lacuna demonstrável; manter versões e ferramentas do projeto.

**Responsabilidades ao revisar:** Bob/Quinn; Virgo se mudar instruções canônicas. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [bun-runtime](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/bun-runtime/SKILL.md) | Escolha de runtime e migração entre Bun e Node | A comparar |
| [cpp-coding-standards](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/cpp-coding-standards/SKILL.md) | Práticas de C++ moderno, ownership e segurança de memória | Parcial |
| [dotnet-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/dotnet-patterns/SKILL.md) | Idiomas de C#, injeção de dependência e async em .NET | Parcial |
| [golang-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/golang-patterns/SKILL.md) | Idiomas, erros, concorrência e composição em Go | Parcial |
| [java-coding-standards](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/java-coding-standards/SKILL.md) | Idiomas de Java e convenções de serviços JVM | Parcial |
| [kotlin-coroutines-flows](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/kotlin-coroutines-flows/SKILL.md) | Concorrência estruturada e ciclo de vida de Flow | Parcial |
| [kotlin-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/kotlin-patterns/SKILL.md) | Null safety, DSLs e idiomas de Kotlin | Parcial |
| [perl-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/perl-patterns/SKILL.md) | Práticas e convenções de Perl moderno | A comparar |
| [python-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/python-patterns/SKILL.md) | Idiomas, tipos e práticas de manutenção em Python | Parcial |
| [rust-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/rust-patterns/SKILL.md) | Ownership, erros, traits e concorrência em Rust | Parcial |
| [swift-concurrency-6-2](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/swift-concurrency-6-2/SKILL.md) | Isolamento, Sendable e concorrência de Swift | Parcial |
| [typescript-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/typescript-patterns/SKILL.md) | Narrowing, tipos discriminados e fronteiras de dados externos | Parcial |

**Correspondência inicial:** C++ → `cpp`; C#/.NET → `csharp`; Go → `go`; Java → `java`; Kotlin/corrotinas → `kotlin`; Python → `python`; Rust → `rust`; Swift/concorrência → `swift`; TypeScript → `typescript`. O décimo pack, `react`, está em G03. Esta relação identifica onde comparar, sem afirmar paridade das receitas.

**Revisão (2026-11-11, snapshot `d2ef268`; 12 entrypoints lidos, nenhum falhou; o WebFetch devolve resumo, não o texto bruto; auxiliares não lidos).** Fontes locais: os nove `stack-packs/<lang>/SKILL.md`, [catálogo](../../bin/stack-packs.js), [spec de alvos](../../openspec/specs/stack-pack-project-targets/spec.md).

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| núcleo portável (propriedade de recurso, erro com contexto, cancelamento, fronteira de dado externo, escopo de tarefa, `unknown`/união discriminada, verificar no limite alterado) | C | Seções "Implementation and diagnosis" e "Verify" dos nove packs | Nada | — |
| `cpp-coding-standards`: guard de lock sem nome, `condition_variable` com predicado, evitar `detach`, destrutor virtual | L | Pack cpp cobre dono de recurso, views e escopo de lock, sem esses quatro pontos | 2–3 cláusulas curtas na seção de concorrência/ownership do pack `cpp` | 2 |
| `rust-patterns`: `match` sem coringa em enum crítico, `Result` descartado, canal ilimitado | L | Pack rust cobre `unwrap`, unsafe, lock em `await`, tarefa que sobrevive ao escopo | Duas cláusulas no pack `rust` e uma sobre canal ilimitado; capacidades/timeouts do ECC não adotados | 2 |
| `kotlin-coroutines-flows`: `NonCancellable` na limpeza, escopo do `flowOn`, `runTest`/tempo virtual | L | Pack kotlin cobre `finally`, escopo, `StateFlow`, dispatcher, sem esses três | Três frases no pack `kotlin` (diagnóstico e Verify); operadores e `WhileSubscribed` ficam como receita Android (P) | 2 |
| `golang-patterns`: `ctx` em struct; interface pequena, zero value, opções funcionais | V / D | Pack go cobre propagação de contexto, `-race`, erros | No máximo uma frase sobre `ctx` em struct; o resto é estilo | 3 |
| refinos em Python/TS/C#/Java (`ProcessPool`×`ThreadPool`, `allSettled`, `Task.WhenAll`, `raise from`) | V | Packs já cobrem o essencial | Reabrir só diante de falha concreta | 3 |
| `swift-concurrency-6-2`: `@concurrent`, isolated conformances | P / D | Pack swift manda ler o modo de linguagem e isolamento configurados | Não importar o modelo 6.2 como regra; pack de versão sob demanda | 3 |
| `bun-runtime` e `perl-patterns` (sem pack) | P | Catálogo é lista fixa (`STACK_PACK_IDS`) e cada pack exige cópia em três alvos | Não criar pack agora: Bun é escolha de toolchain (caso de `tooling-fit`), Perl sem demanda; pack curto só se um projeto os usar | 3 |
| receitas de framework (Spring, Quarkus, EF, Compose, Zod, DSL) | P | Packs dizem aplicar framework "só quando presente" | Packs por demanda concreta | 3 |
| `strict` obrigatório, `!!` proibido, "sem `unwrap`", black 88, `max_workers`, perlcritic, versões fixas | D | Packs dizem não mudar strictness/flags/versão como conserto incidental | Rejeitar como política universal | — |

**Decisão:** deltas de uma a três frases só em packs existentes (C++, Rust, Kotlin), aplicáveis quando a superfície aparecer. Não criar packs Bun/Perl, não adotar `strict` obrigatório, proibições absolutas, limiares, regras do Swift 6.2 nem receitas de framework. Bob implementaria, Quinn revisaria, Virgo validaria o pack. **Achado incidental (média):** `validateStackPacks` só exige caso de qualidade por pack quando `cases` é passado; para um pack novo isso depende do chamador.

<a id="g06"></a>

### G06 — Arquitetura, APIs e frameworks backend

**Prioridade 2; revisado em 2026-11-11 (deltas propostos, não aplicados); 14 skills.**

**Evidência local:** [Archie](../../agents/archie.md), [Bob](../../agents/bob.md), [pack Java](../../stack-packs/java/SKILL.md).

**O que vale avaliar:** Priorizar contratos executáveis, idempotência, erros e limites de serviços. Avaliar receitas de framework em projetos que os utilizam; não impor arquitetura hexagonal por padrão.

**Destino provável:** Princípios no dono atual; receitas de backend em packs opcionais.

**Responsabilidades ao revisar:** Archie em contratos/arquitetura; Bob/Quinn; Gard/Pipe nos riscos próprios. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [api-design](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/api-design/SKILL.md) | Recursos REST, paginação, erros, versionamento e limites | Parcial |
| [backend-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/backend-patterns/SKILL.md) | APIs, camadas e acesso a dados em backends Node | A comparar |
| [contract-first](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/contract-first/SKILL.md) | Contrato executável compartilhado entre consumidores e provedores | Parcial |
| [django-celery](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/django-celery/SKILL.md) | Tarefas assíncronas, agendamento, retry e observação de jobs | A comparar |
| [django-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/django-patterns/SKILL.md) | DRF, ORM, middleware, cache e estrutura de Django | A comparar |
| [fastapi-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/fastapi-patterns/SKILL.md) | Validação, DI, async, transações e testes em FastAPI | A comparar |
| [hexagonal-architecture](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/hexagonal-architecture/SKILL.md) | Ports and Adapters com fronteiras e casos de uso testáveis | Parcial |
| [kotlin-ktor-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/kotlin-ktor-patterns/SKILL.md) | Rotas, plugins, autenticação e testes de Ktor | A comparar |
| [laravel-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/laravel-patterns/SKILL.md) | Eloquent, serviços, filas, eventos e APIs Laravel | A comparar |
| [nestjs-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/nestjs-patterns/SKILL.md) | Módulos, DTOs, guards, interceptors e configuração de NestJS | A comparar |
| [quarkus-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/quarkus-patterns/SKILL.md) | CDI, REST, Panache, Camel e processamento assíncrono | A comparar |
| [rails-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/rails-patterns/SKILL.md) | Controllers, serviços, queries e persistência em Rails | A comparar |
| [springboot-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/springboot-patterns/SKILL.md) | Serviços, dados, cache, async e logging em Spring Boot | A comparar |
| [tinystruct-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/tinystruct-patterns/SKILL.md) | Convenções e ferramentas específicas do framework tinystruct | A comparar |

**Revisão (2026-11-11, snapshot `d2ef268`; 14 entrypoints lidos, nenhum falhou).** Fontes locais: Archie, Bob, Quinn, packs Java/Python/TypeScript/Kotlin (trechos por grep), hook (grep). Gard e Pipe não foram abertos nesta revisão; segurança e operação embutidas nas skills ficam para G09 e G18.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `api-design`: classificar mudança de contrato como aditiva ou quebrante; forma de erro e ordenação de listas como parte do contrato | V | [Archie](../../agents/archie.md) pergunta por versionamento e Quinn cobre consumidores, sem dizer como classificar | Uma frase em Archie: classificar a mudança, nomear consumidores afetados; erro e ordenação fazem parte do contrato revisado. Só em API pública; sem checklist REST | 2 |
| `contract-first`: uma autoridade versionada verificada nos dois lados | V | Archie: "do not create an artificial contract"; hook marca contratos/OpenAPI como HIGH | Fundir com a linha Quinn/Archie de G08; nenhuma ferramenta imposta | 2 |
| jobs assíncronos: enfileirar após o commit, passar identificadores, registrar falha esgotada | V | Bob cobre repetição e idempotência, não esses três pontos | Uma cláusula em Bob, só quando a mudança cria/altera job ou consumidor | 2 |
| idempotência e retry, unicidade por constraint, transação, N+1, camadas finas, validar na fronteira | C | Bob, Archie (anti-padrões), pack TypeScript | Nada | — |
| `hexagonal-architecture` | C / D | Archie recusa Clean/Hexagonal/DDD cosmético e julga quando cabe | Rejeitar "toda dependência vira porta" como padrão | — |
| receitas Django/DRF, FastAPI, Ktor, Laravel, NestJS, Quarkus, Rails, Spring Boot | P | Pack Java aplica Spring/Quarkus só "when detected"; Python/Kotlin sem framework web | Packs por demanda de projeto; nada residente | 3 |
| `tinystruct-patterns`; números fixos (2 versões, 6 meses, 100 req/min, `per_page` 20, 8 caracteres); segurança embutida | D | Sem dono local; Gard/Pipe adiados para G09/G18 | Rejeitar como política universal | — |

**Decisão:** duas adições condicionais à superfície (Archie: classificação de mudança de contrato; Bob: jobs assíncronos). Não adotar hexagonal por padrão, checklist REST, versionamento por URL, limiares, ferramentas de contrato nem agente novo. **Achado incidental (alta):** a "Evidência local" de G06 cita só o pack Java, e ele só reconhece frameworks "when detected" (`stack-packs/java/SKILL.md`).

<a id="g07"></a>

### G07 — Bancos, ORM e migrações

**Prioridade 2; revisado em 2026-11-11 (deltas propostos, não aplicados); 10 skills.**

**Evidência local:** [Archie](../../agents/archie.md), [Gard](../../agents/gard.md), [Pipe](../../agents/pipe.md).

**O que vale avaliar:** Distinguir revisão de risco de conhecimento operacional de SQL/ORM. Priorizar migrações, transações, concorrência e regressão de consultas conforme bancos reais.

**Destino provável:** Packs opcionais de dados; sem novo banco, migration runner ou dependência por inventário.

**Responsabilidades ao revisar:** Archie no modelo; Pipe na execução de migração; Gard em permissões; Perry se houver custo. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [clickhouse-io](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/clickhouse-io/SKILL.md) | Modelagem e consultas analíticas em ClickHouse | A comparar |
| [database-migrations](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/database-migrations/SKILL.md) | Expand-contract, backfills, índices e segurança de migrações | Parcial |
| [jpa-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/jpa-patterns/SKILL.md) | Entidades, relações, consultas e transações de JPA/Hibernate | A comparar |
| [kotlin-exposed-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/kotlin-exposed-patterns/SKILL.md) | DSL/DAO, transações e pools no ORM Exposed | A comparar |
| [mybatis-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/mybatis-patterns/SKILL.md) | Mappers, SQL dinâmico seguro, transações e batching | A comparar |
| [mysql-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/mysql-patterns/SKILL.md) | Modelagem, índices, transações e operação de MySQL/MariaDB | A comparar |
| [postgres-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/postgres-patterns/SKILL.md) | Modelagem, consultas, índices e segurança de PostgreSQL | A comparar |
| [prisma-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/prisma-patterns/SKILL.md) | Schema, transações, paginação e armadilhas de Prisma | A comparar |
| [redis-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/redis-patterns/SKILL.md) | Cache, estruturas, locks, rate limiting e pub/sub | A comparar |
| [swift-actor-persistence](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/swift-actor-persistence/SKILL.md) | Persistência em arquivos e cache com isolamento por actors | Parcial |

**Revisão (2026-11-11, snapshot `d2ef268`; 10 entrypoints lidos, nenhum falhou).** Fontes locais: Archie, Gard, Pipe, Bob (grep dirigido), packs Java/Kotlin/Swift, hook (grep), regra de migrações do `~/AGENTS.md`. A situação "Parcial" do inventário para `database-migrations` e `swift-actor-persistence` era só sobreposição genérica, não cobertura.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `database-migrations`: expand-contract; compatibilidade entre código antigo e novo durante a janela | V | Archie trata impacto e reversibilidade de migração; Pipe pede plano de migração e rollback simples; nenhum cita a janela de compatibilidade | Uma frase em Archie: mudança destrutiva de esquema declara em que fase cada lado continua compatível, ou declara "irreversível". Receita de fases fica no projeto | 1 |
| rollback "forward-only" e plano antes de aplicar | V | Pipe bloqueia deploy sem rollback; falta o caso de migração sem volta limpa | Uma frase em Pipe: migração sem volta registra a mitigação (correção para frente, restore ou "irreversível" aceito) antes de rodar. Sem down-migration universal | 1 |
| backfill em lotes, índice sem bloqueio, `NOT NULL` sem default, teste com volume | V | Pipe cobre jobs, não carga/lock de migração | Na mesma linha de Pipe: nomear risco de lock/duração e como é observado ou abortado; sem tamanho de lote fixo | 2 |
| autoria × execução: Archie modela, Pipe roda, Gard em permissões | S | `~/AGENTS.md`; hook tem gate `MIGRATION` na **edição** do arquivo (`high-risk-surface`) | Nada. **Não há gate para o comando que executa a migração** (confiança baixa, só grep); a execução depende de Pipe pedir autorização | — |
| permissões do usuário da aplicação no banco | C | Gard: banco é HIGH | Nada | — |
| transações curtas, lock em ordem, deadlock, `SKIP LOCKED` | C / P | Gard cobre o caso de segurança; resto é receita SQL/ORM | Pack de dados por demanda | 3 |
| ORMs (JPA, MyBatis, Exposed, Prisma) e bancos (Postgres, MySQL, ClickHouse, Redis); `swift-actor-persistence` | P / D | Sem pack de dados; limiares fixos do ECC (pool 20/300, TTL, lotes) | Pack por demanda; rejeitar números como política. `clickhouse-io` conflita com a orientação usual de chave de ordenação: conferir a documentação oficial antes de adotar | 3 |
| custo de consulta e índice (`EXPLAIN`) | D | Perry decide só com orçamento declarado | Sem acréscimo | — |

**Decisão:** dois acréscimos de uma frase (Archie: compatibilidade na janela; Pipe: mitigação de rollback e risco de lock). Não adotar down-migration obrigatória, tamanhos de lote, limiares, runner de migração, novo banco nem agente por ORM.

<a id="g08"></a>

### G08 — Testes, regressão e verificação

**Prioridade 1; revisado em 2026-11-11 (deltas propostos, não aplicados); 25 skills.**

**Evidência local:** [Quinn](../../agents/quinn.md), [Bob](../../agents/bob.md), [spec de engenharia](../../openspec/specs/engineering-delivery/spec.md).

**O que vale avaliar:** Comparar rastreabilidade requisito/bug/teste, consumidores downstream e validade da evidência. Preservar TDD seletivo e testes por risco; não importar cobertura mínima universal nem outro registro que duplique OpenSpec.

**Destino provável:** Completar protocolos existentes apenas onde faltar comportamento; receitas de runner em packs.

**Responsabilidades ao revisar:** Quinn; Bob implementa; Archie em contratos. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [ai-regression-testing](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/ai-regression-testing/SKILL.md) | Regressão executável para falhas recorrentes de código gerado | Parcial |
| [cpp-testing](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/cpp-testing/SKILL.md) | GoogleTest, CTest, sanitizers e diagnóstico de testes C++ | Parcial |
| [csharp-testing](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/csharp-testing/SKILL.md) | xUnit, mocks e testes de integração de .NET | Parcial |
| [delivery-gate](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/delivery-gate/SKILL.md) | Gate de conclusão por hooks e sinais de qualidade | Parcial |
| [django-tdd](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/django-tdd/SKILL.md) | pytest-django, factories e testes de APIs DRF | A comparar |
| [django-verification](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/django-verification/SKILL.md) | Build, análise, migrações, testes e segurança em Django | A comparar |
| [e2e-testing](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/e2e-testing/SKILL.md) | Playwright, isolamento, artefatos e diagnóstico de flakiness | A comparar |
| [fsharp-testing](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/fsharp-testing/SKILL.md) | xUnit, FsCheck e testes baseados em propriedades em F# | A comparar |
| [golang-testing](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/golang-testing/SKILL.md) | Table-driven tests, fuzzing e benchmarks em Go | Parcial |
| [kotlin-testing](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/kotlin-testing/SKILL.md) | Kotest, MockK, corrotinas e propriedades em Kotlin | Parcial |
| [laravel-tdd](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/laravel-tdd/SKILL.md) | PHPUnit/Pest, factories e testes HTTP/autenticação | A comparar |
| [laravel-verification](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/laravel-verification/SKILL.md) | Análise, testes, segurança e prontidão de Laravel | A comparar |
| [module-regression](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/module-regression/SKILL.md) | Consumidores downstream e comandos de regressão por módulo | A comparar |
| [perl-testing](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/perl-testing/SKILL.md) | Test2, prove, mocks e cobertura de Perl | A comparar |
| [python-testing](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/python-testing/SKILL.md) | pytest, fixtures, parametrização e mocks | Parcial |
| [quarkus-tdd](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/quarkus-tdd/SKILL.md) | JUnit, REST Assured, Camel e testes de Quarkus | A comparar |
| [quarkus-verification](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/quarkus-verification/SKILL.md) | Build, análise, testes e segurança de Quarkus | A comparar |
| [rust-testing](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/rust-testing/SKILL.md) | Testes unitários, integração, async e propriedades em Rust | Parcial |
| [springboot-tdd](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/springboot-tdd/SKILL.md) | JUnit, Mockito, MockMvc e Testcontainers | A comparar |
| [springboot-verification](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/springboot-verification/SKILL.md) | Build, análise, integração e segurança de Spring Boot | A comparar |
| [swift-protocol-di-testing](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/swift-protocol-di-testing/SKILL.md) | Protocolos focados para substituir I/O em testes Swift | Parcial |
| [tdd-workflow](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/tdd-workflow/SKILL.md) | Ciclo RED/GREEN/refactor e critérios de cobertura | Parcial |
| [test-collaboration](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/test-collaboration/SKILL.md) | Rastreabilidade entre requisitos, riscos, bugs e testes | Parcial |
| [verification-loop](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/verification-loop/SKILL.md) | Verificação de build, tipos, lint, testes, segurança e diff | Parcial |
| [windows-desktop-e2e](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/windows-desktop-e2e/SKILL.md) | Automação de aplicativos Windows com UI Automation | A comparar |

**Atenção ao delta:** os packs existentes incluem orientação de verificação, mas não implementam automaticamente os stacks de teste nomeados na tabela. Cobertura numérica universal, registro obrigatório para todo teste e gates em todo encerramento não são decisões aprovadas. `delivery-gate` tem apenas sobreposição parcial com o Stop gate próprio do CanonKit.

**Revisão (2026-11-11, snapshot `d2ef268`; 25 entrypoints lidos, nenhum falhou; auxiliares não lidos).** Fontes locais conferidas: Quinn, Bob, trechos de Archie/Pipe, [orchestrate](../../skills/orchestrate/SKILL.md), specs de engenharia e de execução de suítes, seções Verify dos packs, cabeçalho do Stop gate.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `tdd-workflow`: RED só vale se falha pelo motivo pretendido | V | Bob exige falha pré-correção "quando prático", sem exigir que o motivo seja o do defeito | Uma cláusula em Bob e no requisito de regressão seletiva; sem rigidez em LOW | 1 |
| `module-regression`: consumidor afetado e não verificado | V | "Verification by reach" manda achar consumidores, sem dizer o que fazer se a lista é incompleta | Uma frase: aresta não verificada mantém PARTIALLY VERIFIED, nomeando-a | 1 |
| `verification-loop`: aceitação no ambiente-alvo separada de checks locais | V | orchestrate qualifica a evidência da change; Pipe cobre prontidão de deploy | Uma frase em "Evidence-based completion": local verde não prova ambiente-alvo; relatar a parte não feita como pendente. Cobre também o artefato entregue de `quarkus-verification` | 2 |
| contrato entre dois lados (`test-collaboration`/`ai-regression-testing`) | V | Archie (forma) e Quinn (consumidores) sem cenário de compatibilidade entre os lados | Uma linha Quinn/Archie: sem contrato verificável, compatibilidade fica inverificada | 2 |
| `e2e-testing`: quarentena registrada de teste instável | V | Quinn veta skip/retry até passar; falta o caminho legítimo | Sem mudança agora; esclarecer só se surgir demanda | 3 |
| ciclo RED/GREEN, regressão pontual, revisor independente, paridade mock/real, atribuição de falha, "não aplicável" com motivo, comando único, delivery-gate (Stop) | C | Bob, Quinn, orchestrate, `test-suite-execution`, hook | Nada | — |
| cobertura 80/90/100, tempos fixos, fases/veredito READY, commits por fase, `REGRESSION.md`, TEST-ID, limiares do delivery-gate | D | Quinn não exige número desvinculado de risco; OpenSpec já guarda evidência; commit exige autorização | Rejeitar como política universal ou registro paralelo | — |
| receitas de runner/framework: E2E, desktop (UIA), C++/C#/F#/Go/Kotlin/Rust/Python/Swift, Django/Laravel/Spring/Quarkus/Perl, property-based/fuzz | C / P | Packs existentes cobrem o "Verify" de cada linguagem; sem pack de framework | Packs opcionais por demanda; nenhum gate de cobertura | 3 |

**Decisão:** incorporar apenas três acréscimos de uma frase (RED pelo motivo pretendido; consumidor não verificado → PARTIALLY VERIFIED; aceitação em ambiente-alvo e compatibilidade entre lados não provadas por checks locais). Não adotar ledger, registro de testes, cobertura percentual, fases fixas nem novos agentes. Implementação não autorizada nesta etapa.

<a id="g09"></a>

### G09 — Segurança, permissões e supply chain

**Prioridade 1; revisado em 2026-11-11 (deltas propostos, não aplicados); 12 skills.**

**Evidência local:** [Gard](../../agents/gard.md), [hook](../../hooks/canonkit-hook.js), [política ambiental](../../openspec/specs/environment-security-policy/spec.md).

**O que vale avaliar:** Comparar trust boundaries de agentes e MCP, versões mutáveis e operações destrutivas. Separar gates realmente implementados de boas intenções. Revisar cada framework só quando usado.

**Destino provável:** Gard/gates existentes ou conhecimento opcional; nenhum scanner ou servidor executado nesta revisão.

**Responsabilidades ao revisar:** Gard; Archie/Pipe/Quinn quando o efeito realmente exigir. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [agent-security-hardening](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/agent-security-hardening/SKILL.md) | Conteúdo não confiável, ferramentas, arquivos e credenciais de agentes | Parcial |
| [django-security](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/django-security/SKILL.md) | Auth, CSRF, XSS, SQL injection e deploy de Django | A comparar |
| [gateguard](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/gateguard/SKILL.md) | Exigir fatos antes de ações e alterações sensíveis | Parcial |
| [laravel-security](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/laravel-security/SKILL.md) | Auth, CSRF, XSS e acesso seguro a dados em Laravel | A comparar |
| [mcp-dependency-review](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/mcp-dependency-review/SKILL.md) | Inspeção estática de versões e executáveis de servidores MCP | Parcial |
| [perl-security](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/perl-security/SKILL.md) | Taint mode, subprocessos, entrada externa e SQL em Perl | A comparar |
| [quarkus-security](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/quarkus-security/SKILL.md) | OIDC/JWT, RBAC e validação de serviços Quarkus | A comparar |
| [safety-guard](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/safety-guard/SKILL.md) | Confirmação de operações destrutivas e limitação de escrita | Parcial |
| [security-bounty-hunter](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/security-bounty-hunter/SKILL.md) | Prova de exploração e triagem de achados de segurança | A comparar |
| [security-review](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/security-review/SKILL.md) | Revisão de autenticação, entrada externa, segredos e endpoints | Parcial |
| [security-scan](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/security-scan/SKILL.md) | Auditoria de configuração do harness e risco de injeção | A comparar |
| [springboot-security](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/springboot-security/SKILL.md) | Auth, CSRF, cabeçalhos e supply chain de Spring Security | A comparar |

**Revisão (2026-11-11, snapshot `d2ef268`; 12 entrypoints lidos, nenhum falhou).** Gates que o hook implementa hoje (`GATE_KINDS`, [docs/hooks.md](../hooks.md)): `git-bypass` (deny), `secret-block` (deny), `secret-ask`, commit/push (ask), `high-risk-surface` (ask), `perf-budget` (ask) e `definition-of-done` (block no Stop), todos opcionais com `--wire-hooks`. **Não há gate para comandos destrutivos genéricos** (`rm -rf`, `reset --hard`, force push, `drop table`); confirmado por grep em `hooks/canonkit-hook.js`, que só trata `rebase` como comando que aciona hooks.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `agent-security-hardening`: conteúdo de modelo/ferramenta/memória não confiável; validar na fronteira da ação | V | [out-of-scope-issues](../out-of-scope-issues.md) trata conteúdo como dado; Gard não nomeia a fronteira agentic/MCP | Uma linha em Gard: em fluxo agentic/MCP, mapear fonte não confiável → efeito → autorização; sem checklist | 2 |
| `mcp-dependency-review`: leitura estática da config MCP; versão já revisada | V / L | Gard exige pin de versão, sem dizer de onde vem nem tratar config MCP | Em Gard, só quando o diff altera servidor MCP: ler como texto sem executar, separar pacote de flags, `latest`/tag mutável = risco de drift, pin só de versão revisada; sem scanner | 2 |
| `gateguard`/`safety-guard`: destrutivo gateado com rollback | V | Hook cobre só Git; modo nativo e `deny` do usuário são autoritativos ([política ambiental](../../openspec/specs/environment-security-policy/spec.md)) | Decisão: destrutivo = confirmação do modo nativo + `deny` do usuário; sem modos novos. Novo kind no hook só com demanda real, em change própria (Gard + Pipe) | 3 |
| paths/URLs/IDs (traversal, SSRF, argv), perms, temp atômico | P | Gard cobre segredos e superfície em nível geral | Lente sob demanda no Gard; sem limites fixos | 3 |
| menor privilégio, irreversíveis com autorização, escrita limitada ao repositório, teste de negação, pre-report gate | C | Gard, política ambiental, Quinn | Nada | — |
| `gateguard` (fatos antes de editar, +2,25 pts), `security-scan`/AgentShield (npx, nota, `--fix`), bounty/PoC | D | Contradiz "nenhum scanner executado" e o não reescrever settings; Gard já tem pre-report gate | Rejeitar mecanismo, métrica e pacote externo | — |
| `django/laravel/springboot/quarkus/perl-security` | P | Sem pack de backend web; princípios portáveis já em Gard/Bob | Pack opcional por demanda; checar versão antes de adaptar | 3 |

**Decisão:** dois acréscimos mínimos em Gard (fronteira de confiança agentic/MCP; revisão estática de config MCP). Destrutivo genérico segue **sem gate do hook**: é boa intenção apoiada em modo nativo/`deny`, e não se deve alegar o contrário. Não adotar `gateguard`, AgentShield, bounty, limites fixos nem receitas de framework no núcleo.

<a id="g10"></a>

### G10 — Prática de engenharia, revisão e Git

**Prioridade 1; revisado em 2026-11-11 (deltas propostos, não aplicados); 12 skills.**

**Evidência local:** [Bob](../../agents/bob.md), [Quinn](../../agents/quinn.md), [Archie](../../agents/archie.md), [spec de engenharia](../../openspec/specs/engineering-delivery/spec.md).

**O que vale avaliar:** Verificar lacunas em análise de impacto, legado, erros e avaliação de issues. Não duplicar leitura antes da escrita, debugging por hipótese, revisão independente ou gates Git já existentes.

**Destino provável:** Reusar protocolos existentes; ferramentas de lint automático e serviços externos só por decisão específica.

**Responsabilidades ao revisar:** Bob/Quinn; Archie em arquitetura; Virgo para alteração da configuração do time. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [agentic-engineering](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/agentic-engineering/SKILL.md) | Decomposição, avaliação e escolha de modelos em engenharia | Parcial |
| [ai-first-engineering](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/ai-first-engineering/SKILL.md) | Ownership e revisão de código amplamente gerado por agentes | Parcial |
| [brownfield-retrospective](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/brownfield-retrospective/SKILL.md) | Reconstrução de decisões e lacunas em sistemas existentes | A comparar |
| [change-impact](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/change-impact/SKILL.md) | Impacto previsto versus diff e consumidores realmente afetados | Parcial |
| [codehealth-mcp](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/codehealth-mcp/SKILL.md) | Qualidade estrutural medida por serviço externo CodeScene | A comparar |
| [coding-standards](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/coding-standards/SKILL.md) | Legibilidade, nomes e convenções compartilhadas | Parcial |
| [conventional-commit-review](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/conventional-commit-review/SKILL.md) | Mensagem de commit coerente com o diff staged | A comparar |
| [error-handling](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/error-handling/SKILL.md) | Erros tipados, propagação, retries e circuit breakers | Parcial |
| [git-workflow](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/git-workflow/SKILL.md) | Branches, histórico, conflitos, merge e rebase | Parcial |
| [issue-review](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/issue-review/SKILL.md) | Conferência de um relato de issue contra o código atual | A comparar |
| [plankton-code-quality](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/plankton-code-quality/SKILL.md) | Formatadores e correções automáticas disparados a cada escrita | A comparar |
| [search-first](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/search-first/SKILL.md) | Pesquisar soluções existentes antes de criar ferramentas próprias | A comparar |

**Revisão (2026-11-11, snapshot `d2ef268`; 12 entrypoints lidos, nenhum falhou).** Fontes: Bob, Quinn, Archie, Gard, spec de engenharia, orchestrate, hook (cabeçalho e trechos).

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `agentic-engineering`: resposta ambígua de ferramenta em escrita com efeito externo | V | Bob cobre idempotência; orchestrate cobre relatos de agentes, não retorno de ferramenta | Uma frase em Bob: timeout/status ausente = estado desconhecido; reconciliar por leitura antes de repetir | 2 |
| `search-first`: procurar antes de criar utilitário próprio | V | Bob: padrões locais e justificativa de dependência; sem o passo de busca | Uma frase em Bob; adicionar dependência continua exigindo justificativa e Gard | 2 |
| `conventional-commit-review`: mensagem coerente com o diff; dividir diff misto | L | Hook e `~/AGENTS.md` cobrem permissão, não redação | Parágrafo em Bob, só quando o commit é autorizado: ler diff staged e histórico, seguir a convenção medida, propor divisão de diff misto | 2 |
| `git-workflow`: reescrever histórico publicado | V | Hook exige confirmação de commit/push, mas **não tem gate de force push/reset** (verificado) | Regra de uma linha em Bob/Boundaries: reescrever histórico já publicado exige confirmação | 2 |
| `change-impact`: HIGH com condições de rollback e janela de compatibilidade | V | Pipe já pede rollback plan e Archie cobre reversibilidade (conferido em `agents/pipe.md`) | Opcional: incluir "como reverter" no brief HIGH de migração/contrato; sem skill | 2 |
| `brownfield-retrospective`; `issue-review` | V | Sem procedimento de reconstruir decisões nem de validar issue recebida | Sob demanda, sem skill: ler histórico/ADRs e marcar "inferida"; issue é pista até reproduzir ou citar `file:line` | 3 |
| `error-handling`/`coding-standards`: receitas por stack; ratchet de lint | P | Packs typescript/python/go/react | Pack por demanda | 3 |
| decomposição, sessões, foco da revisão, `change-impact` (evidência, diff vs. escopo), commit só com autorização, falha por tipo | C / S | Bob, Quinn, orchestrate, hook | Nada | — |
| mapa fixo de modelos, custo por tarefa, CodeScene, Plankton, limiares (50/500 linhas, retry), Conventional Commits obrigatório, estratégia de branch, `coding-standards` universal | D | `canonkit models show`; Quinn sem métrica sem risco; política ambiental sem hooks com subprocesso de modelo | Rejeitar | — |

**Decisão:** acréscimos de uma ou duas frases em Bob (resposta ambígua; busca antes de criar; mensagem de commit conforme convenção medida), regra de confirmação para reescrever histórico publicado e, opcionalmente, "como reverter" no brief HIGH. Não adotar skills novas, agente por skill nem os itens D acima.

<a id="g11"></a>

### G11 — Produto, escopo e planejamento

**Prioridade 2; revisado em 2026-11-11 (deltas propostos, não aplicados); 7 skills.**

**Evidência local:** [Scott](../../agents/scott.md), [spec de produto](../../openspec/specs/product-discovery/spec.md), [orquestração](../../skills/orchestrate/SKILL.md).

**O que vale avaliar:** Comparar invariantes e exposição de decisões bloqueantes. OpenSpec já guarda escopo e aceitação; não criar PRODUCT-BRIEF, histórias ou outro sistema de planejamento por obrigação.

**Destino provável:** Scott e artefatos já usados pelo projeto; canvas e trackers ficam opcionais.

**Responsabilidades ao revisar:** Scott; Archie em interfaces; Spencer na documentação. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [blueprint](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/blueprint/SKILL.md) | Plano em incrementos revisáveis com dependências e critérios | Parcial |
| [intent-driven-development](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/intent-driven-development/SKILL.md) | Transformar intenção em aceitação observável e escopo | Parcial |
| [module-governance](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/module-governance/SKILL.md) | Instruções locais e ownership de módulos de negócio | A comparar |
| [plan-canvas](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/plan-canvas/SKILL.md) | Anotação e revisão humana de planos em canvas local | A comparar |
| [product-capability](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/product-capability/SKILL.md) | Capacidades, invariantes, interfaces e decisões pendentes | Parcial |
| [product-lens](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/product-lens/SKILL.md) | Diagnóstico de problema, valor, hipótese e decisão de produto | Parcial |
| [story-lifecycle](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/story-lifecycle/SKILL.md) | Organização de épicos, histórias e sprints em arquivos | A comparar |

**Revisão (2026-11-11, snapshot `d2ef268`; 7 entrypoints lidos, nenhum falhou).** Fontes locais: [Scott](../../agents/scott.md), [spec de descoberta](../../openspec/specs/product-discovery/spec.md), Spencer (grep), orchestrate, spec de continuidade.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `intent-driven-development`: efeitos colaterais proibidos nos critérios | V | Scott pede caminhos negativos, sem citar o que não deve mudar | Uma frase em Scott, para MEDIUM/HIGH: nomear também o efeito colateral proibido; sem template nem AC-NNN | 2 |
| `product-capability`: invariantes e expectativas de falha/recuperação como decisão | V | Scott separa fatos, suposições, decisões e perguntas, sem expor invariantes nem recuperação | Uma frase em Scott, para MEDIUM/HIGH: expor invariantes e expectativas de falha/recuperação como decisão aprovada ou em aberto; parte estrutural vai a Archie. Sem SRS | 2 |
| `blueprint`, `product-lens` (diagnóstico), critérios observáveis, rótulo de três estados | C | Scott, spec de descoberta, Bob (plano incremental), orchestrate (mapa para OpenSpec) | Nada; `PRODUCT-BRIEF.md` duplicaria PRD/OpenSpec | — |
| `module-governance` | S | `AGENTS.md` e spec de continuidade: referenciar, não copiar; não alegar carga automática | Princípio já presente; cruza com G12, não decidido aqui | — |
| `blueprint` (mutação de plano), `story-lifecycle` (`.stories/`) | D | OpenSpec já guarda changes, specs e tasks; um segundo registro é vedado | Rejeitar; `story-lifecycle` só para projeto sem OpenSpec nem tracker, por demanda | 3 |
| `product-lens`: nota PMF 0–10, ICE, auditoria de jornada instalando o produto | D | Sem fórmula de priorização local; auditoria de jornada é de Pixie/G01 | Rejeitar escalas fixas como política universal | — |
| `plan-canvas` | D | Revisão de plano acontece no chat e nos artefatos OpenSpec; a ferramenta exige `ecc-universal`, servidor local e hook Stop próprio | Rejeitar a distribuição; opcional para quem a instalar por conta própria | 3 |

**Decisão:** dois acréscimos em Scott, ambos para MEDIUM/HIGH e sem template. OpenSpec segue como único registro de escopo e tarefas. Não adotar blueprint, `PRODUCT-BRIEF`, ICE/PMF, AC-NNN/SRS fixos, canvas nem `.stories/`.

<a id="g12"></a>

### G12 — Documentação e navegação de código

**Prioridade 1; revisado em 2026-11-11 (deltas propostos, não aplicados); 7 skills.**

**Evidência local:** [Spencer](../../agents/spencer.md), [Graphify](../tools.md), [continuidade](../../openspec/specs/context-continuity/spec.md).

**O que vale avaliar:** Comparar auditoria de links, papel de cada documento e divergência entre código e documentação. Preservar fonte de verdade existente; não impor novos arquivos ou scanners externos.

**Destino provável:** Procedimentos de Spencer e integração já existente; CodeTour e scanners como ferramentas opcionais.

**Responsabilidades ao revisar:** Spencer; Archie decide arquitetura registrada em ADR. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [architecture-decision-records](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/architecture-decision-records/SKILL.md) | Contexto, alternativas, consequências e histórico de decisões | Parcial |
| [code-tour](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/code-tour/SKILL.md) | Guias CodeTour com âncoras reais de arquivo e linha | A comparar |
| [codebase-onboarding](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/codebase-onboarding/SKILL.md) | Entradas, arquitetura e convenções para ingressar em um projeto | Parcial |
| [docs-governance](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/docs-governance/SKILL.md) | Auditoria de papéis, links, ADRs e evidências documentais | Parcial |
| [documentation-lookup](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/documentation-lookup/SKILL.md) | Consulta de documentação atual de bibliotecas e frameworks | A comparar |
| [living-docs-governance](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/living-docs-governance/SKILL.md) | Manter documentos de regra, mapa, estado e histórico coerentes | Parcial |
| [repo-scan](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/repo-scan/SKILL.md) | Bootstrap de scanner externo de assets e estrutura de código | A comparar |

**Revisão (2026-11-11, snapshot `d2ef268`; 7 entrypoints lidos, nenhum falhou).** Fontes: [Spencer](../../agents/spencer.md), orchestrate, [docs/tools.md](../tools.md), `docs/adr/0001–0006`, spec de continuidade.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `architecture-decision-records`: substituição ligada nos dois sentidos; data original em backfill | V | Spencer pede status e data, sem substituição com link recíproco | Uma frase nas estruturas mínimas de ADR de Spencer; sem arquivo novo | 2 |
| `docs-governance`: um fato, um dono; reutilizar fontes existentes | V | Spencer prefere links verificáveis; orchestrate já proíbe spec/ADR paralelo ao design | Uma linha em Spencer: descobrir e ligar fontes existentes antes de criar documento | 2 |
| `living-docs-governance`: gatilhos de atualização por tipo | V | Spencer cobre drift, sem gatilhos | Lista curta: estrutura mudou → mapa no mesmo change; decisão difícil de reverter → ADR; sem quatro arquivos obrigatórios | 2 |
| `code-tour`: âncoras verificadas | P | Graphify cobre navegação estrutural | Princípio já cabe em Spencer; formato `.tour` opcional por demanda | 3 |
| estrutura de ADR, detecção de decisão implícita, `codebase-onboarding`, leitura em sequência, conflito doc × código | C / S | Spencer, Graphify, ADR 0005, spec de continuidade | Nada | — |
| `docs-governance` auditoria mecânica (`audit-docs.py`), geração de `CLAUDE.md`, `documentation-lookup` (Context7), `repo-scan` (instalador externo) | D | Projetos usam só `AGENTS.md`; princípio de checar docs atuais já existe; supply chain é de Gard | Rejeitar | — |

**Decisão:** delta mínimo só em `agents/spencer.md` (ciclo de vida de ADR, fonte única, gatilhos curtos). Não adotar ADR automático, `CLAUDE.md` gerado, limites fixos, scripts externos nem os quatro arquivos obrigatórios.

<a id="g13"></a>

### G13 — Orquestração de equipes e execução paralela

**Prioridade 2; revisado em 2026-11-11 (deltas propostos, não aplicados); 16 skills.**

**Evidência local:** [Orchestrate](../../skills/orchestrate/SKILL.md), [roster e risco](../../reference/agents-block.md), [continuidade](../../openspec/specs/context-continuity/spec.md).

**O que vale avaliar:** Comparar handoffs, dependências e integração. Isolamento de escritores e reviews por risco já existem; não importar cadeias fixas, personas simuladas como revisão independente ou dispatch universal.

**Destino provável:** Consolidar orchestrate quando necessário; ferramentas de panes/DAGs só com demanda.

**Responsabilidades ao revisar:** Orquestrador e donos do risco; Virgo se alterar protocolos. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [claude-devfleet](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/claude-devfleet/SKILL.md) | Execução e monitoramento de agentes em worktrees isoladas | A comparar |
| [council](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/council/SKILL.md) | Expor discordâncias e trade-offs antes de decidir | A comparar |
| [council-multi-model](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/council-multi-model/SKILL.md) | Crítica adicional por um modelo externo | A comparar |
| [dev-team](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/dev-team/SKILL.md) | Simular papéis colaborativos na mesma sessão | A comparar |
| [dmux-workflows](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/dmux-workflows/SKILL.md) | Coordenar agentes e panes via dmux/tmux | A comparar |
| [orch-add-feature](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/orch-add-feature/SKILL.md) | Pipeline completo para adicionar uma feature | Parcial |
| [orch-build-mvp](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/orch-build-mvp/SKILL.md) | Entregar MVP por fatias verticais | Parcial |
| [orch-change-feature](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/orch-change-feature/SKILL.md) | Alterar comportamento existente com critérios e regressão | Parcial |
| [orch-fix-defect](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/orch-fix-defect/SKILL.md) | Reproduzir, testar e corrigir um defeito | Parcial |
| [orch-pipeline](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/orch-pipeline/SKILL.md) | Motor compartilhado de pesquisa, plano, testes e revisão | Parcial |
| [orch-refine-code](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/orch-refine-code/SKILL.md) | Refatorar preservando comportamento verificado | Parcial |
| [parallel-execution-optimizer](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/parallel-execution-optimizer/SKILL.md) | Dependências, paralelismo seguro e fronteiras de escrita | Parcial |
| [plan-orchestrate](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/plan-orchestrate/SKILL.md) | Traduzir passos de um plano em comandos de execução | A comparar |
| [ralphinho-rfc-pipeline](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/ralphinho-rfc-pipeline/SKILL.md) | Converter RFC em DAG de unidades com testes de aceitação | A comparar |
| [team-agent-orchestration](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/team-agent-orchestration/SKILL.md) | Donos, tarefas, isolamento e gates de integração | Parcial |
| [team-builder](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/team-builder/SKILL.md) | Selecionar personas e consolidar contribuições da equipe | A comparar |

**Revisão (2026-11-11, snapshot `d2ef268`; 16 entrypoints lidos, nenhum falhou; o WebFetch devolveu resumos; auxiliares não lidos).** Fontes locais: [orchestrate](../../skills/orchestrate/SKILL.md) (integral); spec de continuidade e de seleção de modelo (grep); Bob e spec de engenharia (grep). `agent-tool-access` e Virgo não foram abertos.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `parallel-execution-optimizer`, `team-agent-orchestration`, `dmux-workflows`: superfície de escrita e dependência por raia antes do fan-out | V | "Parallel delegation" manda worktrees isoladas e sequência quando há dependência, sem pedir para nomear a superfície nem dizer o que fazer quando um blocker muda o plano | Uma frase em orchestrate: antes de dividir, nomear por raia a superfície de escrita e a dependência; superfície compartilhada ou etapa irreversível vira sequencial ou worktree separada; blocker que muda o plano pausa as raias dependentes | 1 |
| `ralphinho`, `team-agent-orchestration`, `devfleet`: integrar saídas de worktrees uma a uma, reexecutando os checks afetados | L | "Verification by reach" e "Integration Review" não cobrem a ordem de integração de escritores paralelos | Uma frase em orchestrate: o orquestrador integra uma saída por vez e reexecuta os checks afetados; unidade com dependência falha não entra. Sem fila nem runtime | 2 |
| `orch-refine-code`: rede de testes antes de refatorar sem mudar comportamento | V | Bob refatora "when there is a clear gain"; sem cláusula de rede de testes (confiança média) | Uma cláusula em Bob, só MEDIUM+: se a rede for fina, caracterização antes. Parente do RED de G08 | 2 |
| `council` (vozes frescas, dissidência exposta, sem média); `orch-fix-defect`, `orch-pipeline`, `plan-orchestrate` (plano não confiável) | C | Integration Review (contradição vira escalação), "Relayed claims", "Evidence-based completion" | Nada; subagentes-persona não contam como revisão independente | — |
| `devfleet`, `dmux`, Kanban, DAG executor, merge queue, scorecards, comandos `/orch-*` | D / P | Spec de continuidade: sem sistema paralelo de planejamento; nenhum runtime autônomo é alegado | Rejeitar; ferramentas de painéis só com demanda de projeto | 3 |
| `dev-team`, `team-builder`: personas simuladas, máximo de agentes, nomes fixos | D | Roster com donos e vetos; dispatch só por risco nomeado | Rejeitar: persona não é revisão independente | — |
| `council-multi-model`: crítica por modelo externo (Codex CLI) | D | Consulta Laya é opcional e registra chamadas e falhas; seleção de modelo não nomeia fornecedor como padrão | Rejeitar a receita de provedor e a transferência de dados | — |
| `orch-add-feature`, `orch-build-mvp`: fases 0–6, tiers por nº de arquivos, 80% de cobertura, commits por fase, loop de 15 iterações | D | G08 já rejeitou cobertura e fases/commits fixos | Rejeitar como política universal | — |

**Decisão:** duas frases em orchestrate (superfície de escrita e dependência por raia; integração uma a uma) e uma cláusula condicional em Bob. Não adotar runtimes, DAG, Kanban, personas simuladas, contagens fixas de agentes nem crítica por provedor externo.

<a id="g14"></a>

### G14 — Construção de agentes e loops autônomos

**Prioridade 3; revisado em 2026-11-11 (deltas propostos, não aplicados); 11 skills.**

**Evidência local:** [Orchestrate](../../skills/orchestrate/SKILL.md), [Pipe](../../agents/pipe.md), [Gard](../../agents/gard.md).

**O que vale avaliar:** Extrair limites de progresso, parada, retomada e anti-gaming sem transformar CanonKit em runtime autônomo. Memória operacional, fila, scheduler e gateway exigem requisito próprio.

**Destino provável:** Conhecimento para construir agentes em projetos específicos; não adotar um sistema operacional de agentes no núcleo.

**Responsabilidades ao revisar:** Archie/Gard/Pipe conforme o sistema; Quinn para evidência de término. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [agent-harness-construction](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/agent-harness-construction/SKILL.md) | Projetar ferramentas, ações e observações de agentes | A comparar |
| [agent-runtime-gateway-smoke-test](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/agent-runtime-gateway-smoke-test/SKILL.md) | Smoke de API local, túnel e callback remoto de agente | A comparar |
| [agentic-os](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/agentic-os/SKILL.md) | Runtime persistente com memória, agenda e estado de agentes | A comparar |
| [autonomous-agent-harness](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/autonomous-agent-harness/SKILL.md) | Agendamento, filas, memória e computer use autônomos | A comparar |
| [autonomous-loops](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/autonomous-loops/SKILL.md) | Padrões legados de loops e pipelines autônomos | Legado ECC |
| [continuous-agent-loop](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/continuous-agent-loop/SKILL.md) | Loops contínuos com gates, recuperação e critérios de parada | A comparar |
| [dynamic-workflow-mode](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/dynamic-workflow-mode/SKILL.md) | Harness e gates criados para uma tarefa delimitada | A comparar |
| [enterprise-agent-ops](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/enterprise-agent-ops/SKILL.md) | Ciclo de vida e observação de agentes duradouros | A comparar |
| [gan-style-harness](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/gan-style-harness/SKILL.md) | Separar geração e avaliação em execução autônoma | A comparar |
| [loop-design-check](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/loop-design-check/SKILL.md) | Objetivo correto, progresso, limites e resistência a gaming | A comparar |
| [recursive-decision-ledger](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/recursive-decision-ledger/SKILL.md) | Registro de tentativas e critérios de promoção em rollouts | A comparar |

**Revisão (2026-11-11, snapshot `d2ef268`; 11 entrypoints lidos, nenhum falhou; o WebFetch devolveu resumos; auxiliares não lidos).** Fontes locais: orchestrate e [Virgo](../../agents/virgo.md) (integrais), ADR 0005, spec de continuidade (grep), Bob (trecho), Quinn/Pipe/Archie (grep). Gard e Pipe não foram abertos por inteiro; nenhuma alegação sobre gate de hook.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `loop-design-check`, `continuous-agent-loop`, `autonomous-loops`, `gan-style-harness`: loop com término verificável por comando, fronteiras anti-gaming, teto de tentativas com escalação, juiz distinto do autor | V | Bob e Quinn vetam enfraquecer ou pular testes; nada cobre execução recorrente ou em loop pedida pelo usuário, e orchestrate não fala de critério de parada | Parágrafo curto em orchestrate ("Repeated or looped runs"): o brief traz critério de término decidível por comando, fronteiras do que não pode ser feito para satisfazê-lo, teto de tentativas com escalação ao humano, verificação por quem não escreveu a mudança e ambiguidade resolvida antes de começar. Sem números fixos (3, 15, 7,0) | 2, só com uso de `/loop`, `schedule` ou loop em projeto |
| `dynamic-workflow-mode`: autorização por ação e escopo de entidade; saída de ferramenta não concede permissão | V | "Relayed claims" cobre relatos de agentes, não saída de ferramenta | Pack ou nota de Gard/Archie para projetos que constroem agentes; não ampliar o núcleo | 3 |
| `agent-harness-construction`, `enterprise-agent-ops`, `agent-runtime-gateway-smoke-test` | P | Archie cobre contratos; Pipe cobre retry, idempotência e observabilidade | Pack opcional por demanda (construção: Archie + Gard; operação duradoura: Pipe) | 3 |
| `recursive-decision-ledger`; separar gerar de avaliar; revisor não é o autor | C | orchestrate ("Evidence-based completion", "Relayed claims"), revisão independente em HIGH | Nada; ledger JSONL e domínio trading são D | — |
| `agentic-os`, `autonomous-agent-harness`, `autonomous-loops` (legado), NanoClaw, Continuous-Claude, Ralphinho | D | Spec de continuidade veta sistema paralelo de planejamento; ADR 0005 mantém handoff manual; o kit não alega runtime | Rejeitar runtime persistente, fila, agenda externa, memória/MCP, limites fixos de linhas e custo | — |

**Decisão:** uma cláusula condicional em orchestrate para execução recorrente. O restante é pack por demanda ou rejeição. Nenhum agente novo; o CanonKit segue sem alegar runtime autônomo.

<a id="g15"></a>

### G15 — Contexto, memória e aprendizado

**Prioridade 2; revisado em 2026-11-11 (deltas propostos, não aplicados); 11 skills.**

**Evidência local:** [Learning loop](../../skills/learning-loop/SKILL.md), [continuidade](../../openspec/specs/context-continuity/spec.md), [context-tune](../../skills/context-tune/SKILL.md).

**O que vale avaliar:** Comparar contexto mínimo, recuperação e consolidação de regras. Aprendizado automático e vault operacional divergem do desenho atual; não tratá-los como ausências acidentais.

**Destino provável:** Aprimorar mecanismos manuais existentes; alteração de política depende de decisão explícita.

**Responsabilidades ao revisar:** Virgo para configuração; Gard para dados; donos dos requisitos. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [ck](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/ck/SKILL.md) | Salvar e retomar contexto por projeto via Context Keeper | Diverge |
| [context-and-decisions](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/context-and-decisions/SKILL.md) | Linguagem de domínio estável e encaminhamento de decisões | Parcial |
| [context-budget](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/context-budget/SKILL.md) | Medidor nativo versus auditoria estática de contexto | A comparar |
| [continuous-learning](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/continuous-learning/SKILL.md) | Extrator legado de skills por hooks de sessão | Legado ECC |
| [continuous-learning-v2](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/continuous-learning-v2/SKILL.md) | Observação automática, confiança e promoção de instincts | Diverge |
| [growth-log](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/growth-log/SKILL.md) | Extrair regra transferível e sinal a partir do trabalho | Parcial |
| [iterative-retrieval](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/iterative-retrieval/SKILL.md) | Refinar progressivamente o contexto necessário à tarefa | Parcial |
| [knowledge-ops](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/knowledge-ops/SKILL.md) | Ingestão, sincronização e recuperação em bases de conhecimento | A comparar |
| [rules-distill](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/rules-distill/SKILL.md) | Consolidar princípios recorrentes de skills em regras | Parcial |
| [strategic-compact](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/strategic-compact/SKILL.md) | Compactar contexto em fronteiras lógicas de trabalho | Parcial |
| [unified-memory](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/unified-memory/SKILL.md) | Compartilhar contexto persistente entre diferentes harnesses | Diverge |

**Decisões existentes a preservar:** Learning Loop proíbe ingestão automática de transcripts, promoção automática e memória operacional. Continuidade reutiliza OpenSpec ou handoffs versionados. `ck`, `continuous-learning-v2` e `unified-memory` divergem nesses mecanismos; isso não rejeita toda ideia de contexto mínimo contida neles. `continuous-learning` está depreciada no ECC. A limitação descrita no [handoff histórico](ecc-lessons-handoff.md) não deve ser promovida a alegação atual sobre capacidades de plataformas sem verificação.

**Revisão (2026-11-11, snapshot `d2ef268`; 11 entrypoints lidos, nenhum falhou).** Fontes locais: [spec de continuidade](../../openspec/specs/context-continuity/spec.md), [context-tune](../../skills/context-tune/SKILL.md), [learning-loop](../../skills/learning-loop/SKILL.md), telemetria (grep), orchestrate, [ADR 0005](../adr/0005-manual-context-handoff.md), hook (lembrete de tamanho de contexto). `learning-loop-design.md` **não existe** (ver achados de documentação).

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `context-and-decisions`: glossário estável e termo com dois sentidos sinalizado ao dono | L | Grep por glossário/linguagem de domínio em `agents/`, `skills/` e `openspec/specs/` não achou nada | Uma frase em Scott/Spencer: reutilizar glossário ou doc existente, apontar termo ambíguo e perguntar ao dono. Sem `CONTEXT.md` sem aprovação; só quando o projeto tiver vocabulário ambíguo | 2 |
| `iterative-retrieval`: refinar a busca nomeando a lacuna de contexto | V | A spec cobre o brief task-scoped, não o refino da busca | Sem mudança agora; se surgir demanda, uma linha no brief de dispatch. Rejeitar score 0–1, limiar 0,7 e teto de 3 ciclos | 3 |
| decisão difícil de reverter vai para ADR e é linkada; `strategic-compact`; `ck`/`unified-memory` (retomada, recall como evidência não confiável, handoff sem segredos); `context-budget` | C | `docs/adr/` (6 ADRs), ADR 0005 (auto-compactação rejeitada), spec de continuidade, orchestrate, telemetria (tokens nunca estimados), context-tune | Nada | — |
| `growth-log`, `rules-distill` | C / D | learning-loop: consolidar ou remover regra com o mesmo diff; sem memória operacional | Nada; não adotar diário de aprendizado nem gate de Stop por arquivo de aprendizado | — |
| `continuous-learning`/`-v2`, `unified-memory` (vault MCP), `knowledge-ops` (Supabase, sync de conversas) | D | learning-loop é manual, sem ingestão de transcritos nem promoção automática; ADR 0005: injeção por SessionStart não funciona nas três plataformas; `continuous-learning` é depreciada no próprio ECC | Rejeitar observação por hooks, instincts com confiança, vault e stores externos | — |

**Decisão:** um acréscimo condicional (prioridade 2) sobre glossário existente e termos sobrecarregados. `iterative-retrieval` fica para demanda. Não adotar memória persistente, observação automática, promoção por confiança, limiares fixos nem diário de aprendizado.

<a id="g16"></a>

### G16 — Avaliação e diagnóstico de agentes

**Prioridade 1; revisado em 2026-11-11 (deltas propostos, não aplicados); 7 skills.**

**Evidência local:** [Guia de evals](../evals.md), [rubrica](../../evals/instruction-rubric.json), [evidência de engenharia](../../openspec/specs/engineering-delivery/spec.md).

**O que vale avaliar:** Comparar diagnóstico de falhas e medições de adesão. Inventariar casos existentes, julgadores e controles antes de propor novos; score de autoavaliação não substitui evidência ou review.

**Destino provável:** Melhorar evals e relatórios existentes; execução de modelo/custo é ação separada.

**Responsabilidades ao revisar:** Quinn; Virgo em instruções; Gard se envolver logs/dados. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [agent-architecture-audit](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/agent-architecture-audit/SKILL.md) | Diagnosticar camadas, memória e falhas de disciplina de agentes | A comparar |
| [agent-eval](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/agent-eval/SKILL.md) | Comparar agentes por sucesso, tempo, custo e variância | Parcial |
| [agent-introspection-debugging](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/agent-introspection-debugging/SKILL.md) | Capturar e diagnosticar falhas de execução de agentes | Parcial |
| [agent-self-evaluation](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/agent-self-evaluation/SKILL.md) | Autoavaliação por critérios e evidências | Parcial |
| [eval-harness](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/eval-harness/SKILL.md) | Casos de capacidade/regressão e tipos de avaliador | Parcial |
| [santa-method](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/santa-method/SKILL.md) | Revisores independentes e ciclos de convergência | Parcial |
| [skill-comply](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/skill-comply/SKILL.md) | Medir adesão comportamental a skills, regras e agentes | Parcial |

**Limite de evidência:** casos lexicais, autoavaliações e existência de revisores não demonstram adesão comportamental. A sobreposição indicada na tabela é infraestrutura/princípio; nenhuma comparação de modelo foi rodada para este inventário. Não importar duas revisões obrigatórias para toda tarefa a partir de `santa-method`.

**Revisão (2026-11-11, snapshot `d2ef268`; 7 entrypoints lidos, nenhum falhou).** Fontes: [Evals](../evals.md), [telemetria](../telemetry.md), rubrica, [learning-loop](../../skills/learning-loop/SKILL.md), orchestrate, Bob.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `eval-harness`: rótulo alvo × controle (capacidade × regressão) | S / V | `docs/evals.md` já usa alvo e controle protegido, sem rotular casos assim | Uma frase em `docs/evals.md` se ainda não estiver explícito | 2 |
| `skill-comply`: variantes neutra e competidora de prompt | L | Há `adversarial`, sem taxonomia de pressão | Guia de autoria de casos: um neutro e um competidor quando o custo justificar; sem mudar `kind` | 2 |
| `agent-introspection-debugging`: falha determinística × transitória; ERROR × falha | V | Routing já separa ERROR; resumo de qualidade a confirmar | Verificação condicional; estender a frase se faltar | 2 |
| `skill-comply`: adesão a procedimentos de vários passos | V | Evals medem roteamento e juiz lexical; eficácia sempre UNMEASURED | Registrar como limite conhecido em `docs/evals.md`; sem runner novo | 3 |
| `agent-architecture-audit` (12 camadas) | P | O kit só investiga a si mesmo | Pack opcional por demanda de projeto | 3 |
| `agent-eval`, `eval-harness` (juiz e baseline antes), `agent-self-evaluation` (escopo), `santa-method` (revisão independente), achado com `file:line` | C / S | `docs/evals.md`, telemetria, learning-loop, orchestrate, gate pré-relatório | Nada | — |
| nota média de autoavaliação, pass@k e "SHIP IT", dupla revisão obrigatória, loop de 3 iterações, amostragem %, CLI/layout/comandos `/eval` externos, spec gerada por modelo | D | O modelo julgaria o próprio trabalho; regra local é `ceil(2n/3)`; `evals/` já existe | Rejeitar | — |

**Decisão:** três deltas em `docs/evals.md` (rótulo alvo/controle, limite de adesão não medida, guia de variantes) e uma verificação condicional no resumo de qualidade. Nada afirma eficácia, só cobertura documentada. **Achado incidental (média):** em "Results: review-noise", casos baseados só em limite de linhas falham com veredito correto, sugerindo juiz sensível ao limite; confirmar antes de agir.

<a id="g17"></a>

### G17 — Catálogo, instalação e ferramentas do ECC

**Prioridade 3; revisado em 2026-11-11 (deltas propostos, não aplicados); 18 skills.**

**Evidência local:** [Instalação](../install.md), [ferramentas](../tools.md), [stack packs](stack-packs-design.md), [rubrica](../../evals/instruction-rubric.json).

**O que vale avaliar:** Priorizar compatibilidade de hosts, auditoria do catálogo e estado real da instalação. Separar conceitos reutilizáveis dos wrappers e produtos exclusivos do ECC.

**Destino provável:** Procedimentos do lifecycle atual; sem instalar ECC, DeepSeek, Nasiko ou outro runtime.

**Responsabilidades ao revisar:** Virgo; Archie/Gard se houver mudança de contrato ou escrita. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [agent-sort](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/agent-sort/SKILL.md) | Selecionar catálogo por uso diário versus biblioteca | A comparar |
| [automation-audit-ops](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/automation-audit-ops/SKILL.md) | Inventário de automações ativas, quebradas e redundantes | A comparar |
| [config-gc](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/config-gc/SKILL.md) | Revisão e remoção confirmada de configuração obsoleta | A comparar |
| [configure-ecc](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/configure-ecc/SKILL.md) | Wizard e perfis de instalação específicos do ECC | A comparar |
| [deepseek-harness-setup](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/deepseek-harness-setup/SKILL.md) | Instalação e adaptação do ECC ao DeepSeek Harness | A comparar |
| [ecc-guide](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/ecc-guide/SKILL.md) | Responder sobre o ECC a partir de suas fontes atuais | A comparar |
| [ecc-recipes](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/ecc-recipes/SKILL.md) | Relacionar tarefas às famílias de comandos do ECC | A comparar |
| [ecc-tools-cost-audit](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/ecc-tools-cost-audit/SKILL.md) | Auditar consumo, cobrança e jobs de ferramentas ECC | A comparar |
| [hermes-imports](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/hermes-imports/SKILL.md) | Sanitizar e empacotar workflows Hermes para reutilização | A comparar |
| [hookify-rules](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/hookify-rules/SKILL.md) | Regras declarativas de hooks por evento e condição | A comparar |
| [nanoclaw-repl](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/nanoclaw-repl/SKILL.md) | REPL específico do ECC com sessões persistentes | A comparar |
| [nasiko-control-plane](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/nasiko-control-plane/SKILL.md) | Ciclo de vida do CLI experimental Nasiko | A comparar |
| [openclaw-persona-forge](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/openclaw-persona-forge/SKILL.md) | Identidade, regras e prompts visuais de personas OpenClaw | A comparar |
| [prompt-optimizer](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/prompt-optimizer/SKILL.md) | Diagnosticar prompts e encaminhar aos recursos existentes | A comparar |
| [skill-host-compat](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/skill-host-compat/SKILL.md) | Compatibilidade de frontmatter e substituições entre hosts | Parcial |
| [skill-scout](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/skill-scout/SKILL.md) | Buscar skills existentes antes de criar outra | A comparar |
| [skill-stocktake](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/skill-stocktake/SKILL.md) | Auditoria incremental ou completa da qualidade do catálogo | Parcial |
| [workspace-surface-audit](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/workspace-surface-audit/SKILL.md) | Inventário de repo, ferramentas, conectores e configuração | Parcial |

**Dependências específicas:** wizard ECC, receitas de comandos, NanoClaw, Nasiko, DeepSeek e OpenClaw não são recursos do CanonKit. `config-gc` não autoriza remover arquivos e `hookify-rules` não autoriza substituir os gates existentes. Antes de adotar formato de host ou comando, consultar documentação atual do fornecedor.

**Revisão (2026-11-11, snapshot `d2ef268`; 18 entrypoints lidos, nenhum falhou; resumos do WebFetch; auxiliares não lidos).** Fontes locais: [docs/install.md](../install.md) e [docs/tools.md](../tools.md) (trechos), ADR 0001 (integrate-only), `bin/cli.js` (nomes de comando), hook (grep), spec de segurança (títulos). `instruction-audit` e `tooling-fit` não estão em `skills/` do repositório: são skills de plataforma e não foram abertas.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `workspace-surface-audit`, `automation-audit-ops`: inventário somente leitura do estado real antes de agir | C | `doctor` é somente leitura; spec `security-diagnostics` ("Read-only multi-harness diagnosis", "Separate configuration from evidence") | Nada; a cobertura vale só para a superfície de segurança e instalação do kit, não para conectores, cron ou CI do projeto | — |
| `agent-sort`, `config-gc`, `skill-stocktake`, `ecc-guide` | C | `tier:` core/specialist; instaladores preservam sobras sem proveniência e há `--dry-run` e backups; rubrica versionada; regras de evidência no contexto | Nada; rejeitar varrer `~/.claude`, soft-delete e limite de 100 linhas | — |
| `skill-scout`: buscar skill existente antes de criar; vetar candidata externa | V | `tooling-fit` é de plataforma; a cláusula em Virgo não foi verificada | Se Virgo não a tiver, uma frase no procedimento de criar skill: buscar local e de plataforma antes; candidata externa passa por Gard | 3 |
| `skill-host-compat`: frontmatter e variáveis específicas de host | V | O kit gera markdown por harness; não foi aberto o bastante para afirmar que há checagem de portabilidade | Ao distribuir para Codex ou mudar a frontmatter, conferir a documentação atual do fornecedor; verificar antes se já há teste equivalente | 3 |
| `hookify-rules`: regras declarativas de hook (`warn`/`block`) | D | O hook já bloqueia bypass e segredos; um comentário no hook registra que config clonada derrubava os gates | Rejeitar: regras no repositório avaliadas por runtime próprio reabrem essa classe de risco | — |
| `configure-ecc`, `deepseek-harness-setup`, `nanoclaw-repl`, `nasiko-control-plane`, `openclaw-persona-forge`, `ecc-recipes`, `prompt-optimizer`, `ecc-tools-cost-audit` | D / P | Lifecycle próprio (`install`, `doctor`, `uninstall`, `models`, `tool`); ADR 0001 já adota "só integra, com versão pinada" | Rejeitar; nada do ECC, DeepSeek ou Nasiko instalado. A parte genérica de quota/custo cabe em G18/G19 | — |
| `hermes-imports`: sanitizar workflow antes de publicar | D | Hook bloqueia segredo óbvio em conteúdo escrito; `docs/install.md` avisa que snapshots podem conter credenciais | Em aberto só se o kit passar a publicar workflows de terceiros; liga-se ao delta de Gard em G18 | 3 |

**Decisão:** quase nenhum delta. Rejeitar as regras declarativas do hookify. Duas pendências condicionais de prioridade 3 (buscar skill existente e vetá-la por Gard; conferir a frontmatter contra a documentação do fornecedor ao distribuir).

<a id="g18"></a>

### G18 — Operações, deploy e ambientes

**Prioridade 2; revisado em 2026-11-11 (deltas propostos, não aplicados); 13 skills.**

**Evidência local:** [Pipe](../../agents/pipe.md), [Gard](../../agents/gard.md), [continuidade/finalização](../../openspec/specs/context-continuity/spec.md).

**O que vale avaliar:** Comparar canary, prontidão, evidência de rollback e ambiente reproduzível. Docker/Kubernetes/provedores exigem contexto do projeto; não executar operações para preencher tabelas.

**Destino provável:** Runbooks existentes e packs operacionais opcionais.

**Responsabilidades ao revisar:** Pipe; Gard em exposição/supply chain; Archie em estrutura. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [canary-watch](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/canary-watch/SKILL.md) | Verificar endpoints, streams e assets após deploy | Parcial |
| [dashboard-builder](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/dashboard-builder/SKILL.md) | Painéis orientados a perguntas operacionais | Parcial |
| [deployment-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/deployment-patterns/SKILL.md) | CI/CD, health checks, rollback e prontidão de deploy | Parcial |
| [docker-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/docker-patterns/SKILL.md) | Containers, Compose, volumes, rede e hardening | Parcial |
| [flox-environments](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/flox-environments/SKILL.md) | Ambientes declarativos e reproduzíveis baseados em Nix/Flox | A comparar |
| [generating-python-installer](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/generating-python-installer/SKILL.md) | Distribuição Windows com Nuitka e Inno Setup | A comparar |
| [github-ops](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/github-ops/SKILL.md) | Operar issues, PRs, CI, releases e segurança via GitHub | Parcial |
| [kubernetes-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/kubernetes-patterns/SKILL.md) | Workloads, RBAC, probes, recursos e diagnóstico Kubernetes | A comparar |
| [opensource-pipeline](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/opensource-pipeline/SKILL.md) | Fork, sanitização e preparação de projetos para publicação | A comparar |
| [production-audit](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/production-audit/SKILL.md) | Auditoria de prontidão com evidência local | Parcial |
| [terminal-opener](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/terminal-opener/SKILL.md) | Plano de lançamento de processos sem interpolação de shell | A comparar |
| [terminal-ops](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/terminal-ops/SKILL.md) | Execução com evidência de comandos e resultados reais | Parcial |
| [uncloud](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/uncloud/SKILL.md) | Deploy, ingress e administração de clusters Uncloud | A comparar |

**Revisão (2026-11-11, snapshot `d2ef268`; 13 entrypoints lidos, nenhum falhou).** Fontes locais: [Pipe](../../agents/pipe.md), [Gard](../../agents/gard.md), [política ambiental](../../openspec/specs/environment-security-policy/spec.md), spec de engenharia, [docs/hooks.md](../hooks.md) e hook (grep). A evidência de G18 neste handoff cita `context-continuity`, que não trata de operações; a útil é Pipe, Gard, política ambiental e engenharia.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `deployment-patterns`, `production-audit`: o rollback de código não desfaz estado persistente | V | Pipe pede rollback ou mitigação equivalente e "rollback simples antes de migração irreversível", sem exigir que o plano diga o que o rollback não desfaz | Uma frase em Pipe: o plano de rollback nomeia o que não reverte (dados, esquema, efeitos externos) e a mitigação. Liga-se ao delta de G07 | 2 |
| `opensource-pipeline`: sanitizar antes de tornar público (histórico, segredos, caminhos internos) | L | Gard veta exposição de segredo, sem gatilho explícito para publicação ou histórico; `secret-block` só atua em conteúdo escrito e o gate de Git só pede confirmação de commit/push | Uma linha em Gard: ao publicar ou abrir um repositório, varrer histórico e artefatos, não só a árvore; publicar é ato do usuário. Sem pipeline de três agentes | 2 |
| config validada na partida, falha explícita | V | Pipe cobre "fails closed" e dependência indisponível, não config inválida na partida | Opcional nos critérios de readiness de Pipe, só MEDIUM/HIGH operacional | 3 |
| `canary-watch`, verificação pós-deploy, `production-audit` (evidência, ship/block), `github-ops`/`terminal-ops` (changed × verified × committed × pushed), `dashboard-builder`, `flox`, `docker-patterns` | C | Pipe (abordagem conservadora, rollback, observabilidade, veredito + lacunas), spec de engenharia, Gard (Docker/Compose) | Nada; conteúdo de issue/PR/CI como dado fica a conferir em G09/G10 | — |
| Docker, Kubernetes, `uncloud`, Flox, instalador Python, `terminal-opener`, Actions/GHCR/Railway/Vercel | P | Pipe e Gard guardam a propriedade, não a stack; packs só de linguagem | Packs por demanda (container, K8s, provedor de CI, instalador Windows) | 3 |
| LCP>4 s, >5 erros de console, probes 30 s/3/2, canary 95/5, HPA 70%/80%, nota 0–100, loop de watch por horas, hook PostToolUse em `git push`, `docker compose down -v`, deleção por padrão | D | Pipe calibra por risco; política ambiental rejeita autoaprovação ampla e hooks de decisão por padrão | Rejeitar como política; valores só como exemplo em pack | — |

**Decisão:** duas frases (Pipe: o que o rollback não reverte; Gard: varrer histórico e artefatos ao publicar) e uma opcional futura de readiness. Não adotar limiares fixos, nota 0–100, pipeline de três agentes, loops de watch, hook em push nem receitas de Docker/K8s/Flox. **Achado incidental (alta):** o `canary-watch` sugere um hook PostToolUse em `git push`, o que colide com "native approval modes remain authoritative" da política ambiental; só como exemplo.

<a id="g19"></a>

### G19 — Desempenho, custos e orçamento

**Prioridade 2; revisado em 2026-11-11 (deltas propostos, não aplicados); 10 skills.**

**Evidência local:** [Perry](../../agents/perry.md), [telemetria e limites](../telemetry.md), [context-tune](../../skills/context-tune/SKILL.md).

**O que vale avaliar:** Reusar medição por distribuição e custo dominante. Separar latência do produto, volume de contexto, tokens processados e dinheiro; preços/output incompletos impedem custo exato.

**Destino provável:** Perry e telemetria existentes; caches/roteamento só após diagnóstico.

**Responsabilidades ao revisar:** Perry; Pipe em pipeline; Gard se compartilhar logs; Archie em fronteiras. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [benchmark](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/benchmark/SKILL.md) | Baselines de navegador, APIs e feedback de build/testes | Parcial |
| [benchmark-optimization-loop](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/benchmark-optimization-loop/SKILL.md) | Otimização por hipótese com gate de correção | Parcial |
| [content-hash-cache-pattern](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/content-hash-cache-pattern/SKILL.md) | Cache por hash de conteúdo e invalidação automática | A comparar |
| [cost-aware-llm-pipeline](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/cost-aware-llm-pipeline/SKILL.md) | Roteamento de modelos, retries, cache e orçamento de API | A comparar |
| [cost-tracking](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/cost-tracking/SKILL.md) | Custos e tokens a partir de métricas locais do ECC | Parcial |
| [data-throughput-accelerator](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/data-throughput-accelerator/SKILL.md) | Diagnóstico de gargalos de ingestão, backfill e exportação | Parcial |
| [latency-critical-systems](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/latency-critical-systems/SKILL.md) | Caudas de latência e custos de sistemas em tempo real | Parcial |
| [prompt-caching-strategy](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/prompt-caching-strategy/SKILL.md) | Estrutura e estabilidade de prefixos para cache de prompts | A comparar |
| [token-budget-advisor](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/token-budget-advisor/SKILL.md) | Escolha explícita de profundidade e orçamento de resposta | A comparar |
| [token-card](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/token-card/SKILL.md) | Cartão de uso a partir de logs de vários harnesses | A comparar |

**Revisão (2026-11-11, snapshot `d2ef268`; 10 entrypoints lidos, nenhum falhou).** Fontes locais: [Perry](../../agents/perry.md), context-tune, [telemetria](../telemetry.md), [spec de seleção de modelo](../../openspec/specs/model-selection/spec.md), orchestrate (modelo/esforço), evals (grep), hook (`perf-budget`).

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `benchmark-optimization-loop`: a otimização mantém a verificação de correção verde e a busca para quando o ganho cai no ruído | V | Perry (passo 6) manda a menor mudança e re-medir, sem dizer que a correção precisa seguir verde nem quando parar | Uma frase no passo 6 de Perry; sem ledger de variantes nem promotion gate | 2 |
| `benchmark`, `cost-tracking` (último registro por sessão; não fabricar uso), `cost-aware-llm-pipeline` (roteamento por necessidade), `prompt-caching-strategy` (contadores de cache, medir contra baseline) | C | Perry (distribuição, isolar variável); telemetria (último `agent_end` por `id`, tokens nulos "never estimated", cache read/write); spec de seleção de modelo; gate `perf-budget` | Nada | — |
| `data-throughput-accelerator`, `latency-critical-systems`, `content-hash-cache-pattern` | C / P | Perry atribui antes de otimizar; topologia de cache é de Archie | Receitas de ingestão/cache só como pack ou especialista por demanda | 3 |
| custo em USD derivado de tokens, cartão de uso para README, leaderboard (`@tokenchit/cli` via `npx`) | D | Telemetria: custo monetário "Not calculated", exige preços verificados; Σ total é volume processado, não custo | Rejeitar; manter a separação volume / tokens observados / dinheiro. A ferramenta é código remoto com acesso a logs | — |
| tabela de preços, limiares (10k caracteres, 30 itens), orçamento padrão US$ 1, retry e orçamento em app com LLM | D / P | Seleção de modelo "SHALL NOT ship a mapping" por fornecedor | Rejeitar; app com LLM cai em dados/IA (G20) | — |
| `token-budget-advisor`: menu 25/50/75/100%, multiplicadores | D | context-tune usa só "chars / 4" como estimativa grosseira | Rejeitar percentuais e multiplicadores fixos | — |

**Decisão:** um único acréscimo de uma frase em Perry. Não adotar tabela de preços, custo em USD derivado de tokens, limiares, cartão ou leaderboard de uso, menu de profundidade, ledger de variantes nem coletor novo.

<a id="g20"></a>

### G20 — Dados, ML e aplicações de IA

**Prioridade 3; revisado em 2026-11-11 (deltas propostos, não aplicados); 10 skills.**

**Evidência local:** [Iris](../../agents/iris.md), [Dana](../../agents/dana.md), [limites de especialistas](../../reference/agents-block.md).

**O que vale avaliar:** Comparar data readiness, eval, leakage e decisão entre código determinístico e LLM. Iris/Dana serem fontes disponíveis no kit não comprova instalação no consumidor ou pipeline especializado.

**Destino provável:** Packs de domínio sob demanda; Itô e outros provedores somente em projetos que os escolham.

**Responsabilidades ao revisar:** Iris/Dana apenas quando instaladas; Archie/Gard/Pipe conforme efeitos. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [bengali-nlp](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/bengali-nlp/SKILL.md) | Unicode, tokenização e processamento de texto bengali | A comparar |
| [data-scraper-agent](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/data-scraper-agent/SKILL.md) | Coleta agendada e enriquecimento de fontes públicas | A comparar |
| [ito-compute](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/ito-compute/SKILL.md) | Inventário e contratação de GPU pelo serviço Itô | A comparar |
| [ito-inference](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/ito-inference/SKILL.md) | Disponibilidade e configuração de inferência em booking Itô | A comparar |
| [ito-training](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/ito-training/SKILL.md) | Disponibilidade e configuração de treinamento em booking Itô | A comparar |
| [ml-adoption-playbook](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/ml-adoption-playbook/SKILL.md) | Introduzir ML em sistemas que ainda não usam modelos | Parcial |
| [mle-workflow](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/mle-workflow/SKILL.md) | Dados, treinamento, avaliação, deploy e rollback de modelos | Parcial |
| [pytorch-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/pytorch-patterns/SKILL.md) | Treinamento reproduzível, modelos e loaders em PyTorch | A comparar |
| [recsys-pipeline-architect](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/recsys-pipeline-architect/SKILL.md) | Pipeline de recuperação, filtragem e ranking de recomendações | A comparar |
| [regex-vs-llm-structured-text](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/regex-vs-llm-structured-text/SKILL.md) | Escolher parsing determinístico, LLM ou pipeline híbrido | A comparar |

**Revisão (2026-11-11, snapshot `d2ef268`; 10 entrypoints lidos, nenhum falhou; resumos do WebFetch).** Fontes locais: [Dana](../../agents/dana.md) e [Iris](../../agents/iris.md) (integrais), Quinn/Gard/Archie (grep), evals (grep), [reference/agents-block.md](../../reference/agents-block.md), hook (sem menção a dana/iris). **Dana e Iris existem em `agents/` mas não estão instaladas aqui** (sem `.claude/agents` neste repositório; `~/.claude/agents` só tem o núcleo): o domínio de dados e ML não tem dono neste projeto e o lead não o cobre. Instalação: `npx canonkit add dana` ou `npx canonkit add iris`.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `mle-workflow`, `ml-adoption-playbook`: feature disponível no momento da predição; critérios de promoção declarados antes do treino | C no dono / V sem dono instalado | Iris cobre contrato de predição, split sem vazamento e baseline, mas não cita esses dois pontos (confiança média, só leitura de Iris); Quinn não menciona dataset nem vazamento | Uma cláusula em Iris, passo 5, se o mantenedor quiser; não replicar em Quinn nem orchestrate | 3 |
| `regex-vs-llm-structured-text`: parser determinístico antes de LLM | V | Iris cobre "smallest approach", mas é centrada em imagem e ausente aqui; custo de LLM está em G19 | Só com dono e demanda: tentar o parser antes do LLM e medir a fração enviada; sem limiares de cobertura | 3 |
| fallback, rollback, canário/shadow, drift, versão de modelo em logs | C / P | Iris cobre rastreabilidade; deploy e rollback são de Pipe/Archie | Pack de MLOps por demanda de projeto com ML em produção | 3 |
| heurística antes de ML; modelo atrás de interface com fallback por regra | C | Iris ("prefer the smallest approach"), Archie | Nada | — |
| `data-scraper-agent`: conteúdo raspado é dado; segredos fora do repositório; deduplicação | C / D | Gard (segredos onde entram e saem), Dana (idempotência, lineage), Pipe (jobs) | Rejeitar a receita (Gemini, Notion, Sheets, Supabase, Actions cron, lotes e bandas de score) | — |
| `pytorch-patterns`, `bengali-nlp` | P | Sem pack de PyTorch nem de idioma; reprodutibilidade já cabe em Iris | Pack opcional por demanda | 3 |
| `ito-compute`, `ito-inference`, `ito-training` | D / P | `ito-inference` e `ito-training` se declaram indisponíveis; sem política de gasto no kit | Rejeitar como política; pack só se um projeto escolher o provedor, com Gard antes de credencial e autorização sua para gasto | — |
| portões numéricos (AUC 0,82, p95 80 ms), `recsys-pipeline-architect` | D | Iris define limiares por projeto; Perry é a autoridade de orçamento | Rejeitar limiares e arquitetura de recomendação como política universal | — |

**Decisão:** nenhuma mudança no núcleo. Deltas opcionais de baixa prioridade em Iris e o princípio "determinístico antes de LLM", só com demanda. Dizer que o domínio não tem dono, em vez de cobri-lo.

<a id="g21"></a>

### G21 — Pesquisa e evidência científica

**Prioridade 3; revisado em 2026-11-11 (deltas propostos, não aplicados); 10 skills.**

**Evidência local:** [Scott](../../agents/scott.md), [Iris](../../agents/iris.md), [Spencer](../../agents/spencer.md).

**O que vale avaliar:** Extrair proveniência, atualidade e limites da evidência. Bases científicas, OSINT e provedores de pesquisa dependem de tarefa; não assumir ferramentas conectadas.

**Destino provável:** Métodos portáveis pontuais; conectores e disciplinas científicas opcionais.

**Responsabilidades ao revisar:** Dono da decisão; especialistas adequados quando disponíveis. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [deep-research](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/deep-research/SKILL.md) | Planejar pesquisa multifuente com citações verificáveis | A comparar |
| [exa-search](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/exa-search/SKILL.md) | Busca web, código e empresas via serviço Exa | A comparar |
| [market-research](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/market-research/SKILL.md) | Pesquisa de mercado e inteligência orientada a decisões | A comparar |
| [osint-investigation](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/osint-investigation/SKILL.md) | Testar hipóteses e cruzar evidências com pistas escassas | A comparar |
| [research-ops](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/research-ops/SKILL.md) | Pesquisa de estado atual com fontes públicas e conectadas | A comparar |
| [scientific-db-pubmed-database](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/scientific-db-pubmed-database/SKILL.md) | Consultas reprodutíveis de literatura PubMed/NCBI | A comparar |
| [scientific-db-uspto-database](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/scientific-db-uspto-database/SKILL.md) | Pesquisa oficial de patentes, marcas e registros USPTO | A comparar |
| [scientific-pkg-gget](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/scientific-pkg-gget/SKILL.md) | Consultas genômicas e bioinformática com gget | A comparar |
| [scientific-thinking-literature-review](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/scientific-thinking-literature-review/SKILL.md) | Busca, triagem, síntese e limites de revisões de literatura | A comparar |
| [scientific-thinking-scholar-evaluation](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/scientific-thinking-scholar-evaluation/SKILL.md) | Avaliar métodos, evidências, citações e trabalhos científicos | A comparar |

**Revisão (2026-11-11, snapshot `d2ef268`; 10 entrypoints lidos, nenhum falhou; resumos do WebFetch).** Fontes locais: Scott, Archie, orchestrate, learning-loop e evals (grep). `tooling-fit` e `deep-research` são skills de plataforma, fora do repositório, e não contam como distribuídas pelo CanonKit.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `deep-research`, `market-research`, `research-ops`, `osint-investigation`, `literature-review`: separar fato com fonte, inferência, estimativa e recomendação; afirmação de fonte única como não verificada | V | orchestrate usa VERIFIED/PARTIALLY VERIFIED/UNVERIFIED só para conclusão de trabalho; Scott rotula hipótese; nenhum dono pede proveniência em pesquisa para decisão (confiança média: grep) | Uma cláusula em Scott, referenciada por Archie quando a decisão depende de fato externo: registrar fonte, data de acesso, classe (fato, inferência ou estimativa) e o que ficou sem corroboração. Sem tiers numéricos, janela de 12 meses nem formato de relatório fixo | 2 |
| `osint-investigation`: hipótese líder com o jeito mais rápido de refutá-la; fontes derivadas da mesma origem contam como uma | L | Scott não trata hipóteses rivais nem independência de fontes (grep sem resultado) | Duas linhas no mesmo ponto; sem método OSINT completo | 3 |
| `osint-investigation`: limites éticos (não perfilar pessoas privadas) | D | Gard cobre exposição, não perfilamento | Adiar: é política de domínio sensível; só com demanda e revisão de Gard | 3 |
| `exa-search`, `deep-research` (contagens, Firecrawl), `market-research` (TAM/SAM/SOM), `scientific-pkg-gget`, bases PubMed/USPTO, `literature-review` (PICO, triagem em três estágios) | P / D | Sem conector assumido; sem dono científico (Iris existe mas não está instalada) | Rejeitar receitas de provedor e números fixos; pack científico por demanda. "Log de busca com data e consulta" cabe na cláusula de proveniência | 3 |
| tratar conteúdo buscado como dado; atualidade; `scholar-evaluation` (nota 1–5) | C / D | orchestrate "Relayed claims"; regra do `~/AGENTS.md` de não responder capacidade de plataforma de memória | Nada; rejeitar a escala 1–5 e a rubrica fixa | — |

**Decisão:** uma cláusula de proveniência em Scott (prioridade 2); hipótese rival e linhagem de fontes ficam em prioridade 3. Conectores, bases científicas, OSINT e rubrica acadêmica ficam como pack por demanda. Nenhum agente novo.

<a id="g22"></a>

### G22 — Marca, conteúdo e crescimento

**Prioridade 4; revisado em 2026-11-11 (deltas propostos, não aplicados); 17 skills.**

**Evidência local:** [Scott](../../agents/scott.md), [Nova](../../agents/nova.md), [roster](../../reference/agents-block.md).

**O que vale avaliar:** Distinguir produto e visual de operação comercial, marketing, outreach e publicação. Não inventar proprietário de marketing nem importar funções comerciais por volume de catálogo.

**Destino provável:** Skills de projeto/integrações quando solicitadas; métodos de identidade só dentro do escopo visual aprovado.

**Responsabilidades ao revisar:** Dono a designar nos domínios não cobertos; Scott/Nova só nos seus limites. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [article-writing](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/article-writing/SKILL.md) | Textos longos coerentes com exemplos e voz fornecida | A comparar |
| [benchmark-methodology](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/benchmark-methodology/SKILL.md) | Comparação estratégica de concorrentes com dimensões e evidências | A comparar |
| [brand-discovery](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/brand-discovery/SKILL.md) | Entrevista estruturada de identidade e posicionamento de marca | A comparar |
| [brand-voice](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/brand-voice/SKILL.md) | Derivar e reutilizar perfil de escrita de fontes reais | A comparar |
| [competitive-platform-analysis](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/competitive-platform-analysis/SKILL.md) | Delimitar e categorizar o conjunto de concorrentes | A comparar |
| [competitive-report-structure](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/competitive-report-structure/SKILL.md) | Transformar comparação de concorrentes em decisões | A comparar |
| [connections-optimizer](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/connections-optimizer/SKILL.md) | Revisar redes de contatos e preparar aproximações | A comparar |
| [content-engine](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/content-engine/SKILL.md) | Planejamento e adaptação de conteúdo por plataforma | A comparar |
| [crosspost](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/crosspost/SKILL.md) | Distribuição de conteúdo adaptado entre redes sociais | A comparar |
| [investor-materials](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/investor-materials/SKILL.md) | Pitch, memorandos, modelos e documentos de captação | A comparar |
| [investor-outreach](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/investor-outreach/SKILL.md) | Mensagens e follow-ups para investidores | A comparar |
| [lead-intelligence](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/lead-intelligence/SKILL.md) | Sinais, priorização e caminhos de contato com leads | A comparar |
| [marketing-campaign](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/marketing-campaign/SKILL.md) | Pesquisa, posicionamento, peças e medição de campanhas | A comparar |
| [seo](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/seo/SKILL.md) | SEO técnico, conteúdo, dados estruturados e visibilidade | A comparar |
| [social-graph-ranker](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/social-graph-ranker/SKILL.md) | Ranking de conexões, pontes e oportunidades no grafo social | A comparar |
| [social-publisher](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/social-publisher/SKILL.md) | Agendamento e publicação social via serviço SocialClaw | A comparar |
| [x-api](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/x-api/SKILL.md) | OAuth, rate limits e operações da API X/Twitter | A comparar |

**Desambiguação:** `benchmark-methodology` avalia posicionamento de concorrentes; benchmarks de desempenho estão em G19. Publicação social e outreach são ações externas, separadas da preparação de conteúdo.

**Triagem de prioridade 4 (2026-11-11, snapshot `d2ef268`; 17 entrypoints obtidos, nenhum falhou).** Leitura integral de 7 (`article-writing`, `brand-voice`, `brand-discovery`, `investor-materials`, `investor-outreach`, `content-engine`, `crosspost`), parcial de 9 (trechos ou cabeçalhos) e **`competitive-platform-analysis` não foi lida**; a classificação do grupo não depende dela. Fontes locais: Scott, Spencer, Nova, spec de descoberta e de workflow de interface; Quinn e `reference/agents-block.md` por grep. Sem dono de copy, marketing ou vendas no roster.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `article-writing`, `content-engine`, `crosspost`, `marketing-campaign`, `brand-voice` | P | Scott e Spencer não inventam evidência nem decisão; Nova cobre direção visual, não escrita | Sem dono instalado o lead não cobre; pack de conteúdo por demanda. Não guardar impressões pessoais de voz no repositório | 4 |
| `brand-discovery` (entrevista de marca em 8 módulos, `state.json`) | D | Spec de descoberta veta brief paralelo; a identidade visual fica com Nova | Rejeitar: cria artefato paralelo de identidade | 4 |
| `benchmark-methodology`, `competitive-platform-analysis`, `competitive-report-structure` | P | Scott separa necessidade de solução e exige evidência externa; pesos sem calibração apresentada | Pack por demanda; se usado, evidência por dimensão e pesos não tratados como validados. Benchmark de desempenho fica em G19 | 4 |
| `investor-materials`, `investor-outreach`, `lead-intelligence`, `connections-optimizer`, `social-graph-ranker` | D | Sem dono de vendas ou captação; trata dados pessoais de terceiros e credenciais | Rejeitar; exposição de dados de terceiros exige avaliação de Gard | 4 |
| `crosspost`, `social-publisher` (`npm install -g` de pacote externo e chave de workspace), `x-api` | D | Gard cobre segredos e dependências com execução na instalação; publicar exige sua confirmação | Rejeitar como skill do núcleo; se um projeto pedir, Gard revisa credencial e dependência antes | 4 |
| `seo`: Core Web Vitals / crawl e dados estruturados | C / P | Perry detém orçamentos de LCP/INP/CLS (roster; `perry.md` não aberto pelo revisor) | CWV: sem copiar limiares; restante: pack de site por demanda | 4 |

**Decisão:** nenhum L. As 17 skills ficam rejeitadas ou como pack por demanda. Já cobertos: não inventar evidência (Scott, Spencer) e Core Web Vitals (Perry). Nenhum agente de marketing ou vendas.

<a id="g23"></a>

### G23 — Direção criativa, mídia e vídeo

**Prioridade 3; revisado em 2026-11-11 (deltas propostos, não aplicados); 12 skills.**

**Evidência local:** [Nova](../../agents/nova.md), [Echo](../../agents/echo.md), [plano de game art](../../openspec/changes/archive/2026-11-11-ui-focused-visual-workflow/specs/game-art-direction/spec.md).

**O que vale avaliar:** Extrair leitura na escala de uso, referências verificáveis e proveniência. Pipelines de vídeo, geração e edição não estão incorporados só por existir Nova/Echo.

**Destino provável:** Skills criativas opcionais; ferramentas e contas escolhidas por projeto.

**Responsabilidades ao revisar:** Nova/Echo apenas quando instaladas; Bob/Perry/Gard nos riscos próprios. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [blender-motion-state-inspection](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/blender-motion-state-inspection/SKILL.md) | Inspeção de rigs, poses e animação com evidência estrutural | A comparar |
| [fal-ai-media](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/fal-ai-media/SKILL.md) | Geração de imagem, vídeo e áudio pelo provedor fal.ai | A comparar |
| [frontend-slides](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/frontend-slides/SKILL.md) | Apresentações HTML e conversão de decks | A comparar |
| [manim-video](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/manim-video/SKILL.md) | Animações explicativas e diagramas técnicos com Manim | A comparar |
| [remotion-video-creation](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/remotion-video-creation/SKILL.md) | Vídeo programático com componentes React/Remotion | A comparar |
| [taste](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/taste/SKILL.md) | Vocabulário e direção criativa de gêneros de vídeo específicos | A comparar |
| [taste-application](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/taste-application/SKILL.md) | Aplicar style pack e finalizar vídeo com geração e edição | A comparar |
| [taste-distillation](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/taste-distillation/SKILL.md) | Medir referências em cor, cadência e materiais reutilizáveis | A comparar |
| [tasteforge-video](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/tasteforge-video/SKILL.md) | Style packs, proveniência e export de timelines editáveis | A comparar |
| [ui-demo](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/ui-demo/SKILL.md) | Gravação de demonstrações de UI com Playwright | A comparar |
| [video-editing](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/video-editing/SKILL.md) | Edição e composição de filmagem com ferramentas de mídia | A comparar |
| [videodb](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/videodb/SKILL.md) | Ingestão, busca, indexação e edição via serviço VideoDB | A comparar |

**Desambiguação:** `frontend-slides` produz apresentações; não é uma skill geral de layout de produto. O `game-art-direction` planejado é uma extração do conhecimento atual de Nova, não importação desses pipelines de vídeo.

**Revisão (2026-11-11, snapshot `d2ef268`; 12 entrypoints lidos, nenhum falhou; resumos do WebFetch; scripts e auxiliares não lidos).** Fontes locais: [Nova](../../agents/nova.md), [Echo](../../agents/echo.md), specs de game art e de ownership visual, [pack game-art-direction](../../stack-packs/game-art-direction/SKILL.md), `ui-design` (grep), Pixie, Perry. **Nova e Echo existem em `agents/` mas não estão instalados neste projeto** (sem `.claude/agents`): `npx canonkit add nova` ou `npx canonkit add echo`.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| proveniência e licença de material de terceiros ou gerado (`tasteforge` lineage, `fal-ai-media` confirmar modelo e custo) | L | Echo cobre licença e proveniência só de áudio; Nova e o pack game-art só mandam ler a proveniência de referências, sem licença nem origem de asset gerado e sem rota a Gard | Uma cláusula no pack `game-art-direction` (ou no Context rules de Nova): havendo asset gerado ou de terceiros, registrar origem e licença e rotear o risco de licença e consentimento a Gard. Sem hashes, recibos nem formato de manifesto | 2, condicional a haver geração ou terceiros |
| `taste`, `taste-distillation`, `tasteforge-video`: referência útil, coerência por rejeição, "render concluído não é aprovação criativa" | C | Nova ("make references useful"), pack game-art ("adjectives alone cannot guide production"; inspeção de fonte não prova regressão renderizada) | Nada | — |
| gate de provedor: nenhuma geração, upload ou gasto como efeito colateral | C | Pack game-art ("authorizes no new service, private-asset upload..."); spec game-art sem instalação implícita | Nada; flags e chaves de provedor são receita | — |
| movimento (`manim-video`, `frontend-slides`): propósito, reduced-motion, teclado, contraste | C | `ui-design` M4; Pixie; spec de ownership visual | Nada | — |
| `blender-motion-state-inspection`: inspeção estrutural antes de screenshot | C / P | `ui-design`: "a screenshot cannot verify keyboard/focus or time-dependent motion" | Princípio já presente; procedimento Blender só como extensão opcional por projeto; limiares 1–2 cm, 5%, 30°/frame são heurística de um caso | 3 |
| `frontend-slides`: viewport fit rígido, limites de densidade, cinco tamanhos | P / D | Spec game-art: slides não são layout de produto | Pack de slides só com demanda; rejeitar contagens e tamanhos fixos | 3 |
| `ui-demo`, `remotion-video-creation`, `video-editing`, `videodb`, `taste-application`; medir referências em cor e cadência; direção de gênero e áudio de vídeo | P / D | Pipelines não ficam incorporados só por existir Nova e Echo; Nova ("no research quota or service is required") | Não distribuir; pack por projeto. Rejeitar pausas fixas, LUFS, CRF, BPM e cobertura percentual. `videodb` exige decisão de consentimento do projeto | 3 |

**Decisão:** uma cláusula de proveniência e licença (prioridade 2), roteando a Gard. O resto já está coberto por Nova, Pixie, `ui-design` M4 e a skill de game art, ou é pipeline e provedor não distribuído. Nenhum agente de vídeo.

<a id="g24"></a>

### G24 — Conectores, comunicação e documentos

**Prioridade 3; revisado em 2026-11-11 (deltas propostos, não aplicados); 16 skills.**

**Evidência local:** [Bob](../../agents/bob.md), [Gard](../../agents/gard.md), [finalização](../../openspec/specs/context-continuity/spec.md).

**O que vale avaliar:** Comparar padrão de conector, aprovação de ação externa e comprovação de envio. Não confundir conectores disponíveis no ambiente do mantenedor com recursos distribuídos pelo CanonKit.

**Destino provável:** Skills/conectores de projeto; nenhum envio, upload, conta ou contrato executado.

**Responsabilidades ao revisar:** Donos técnicos existentes; domínio comercial/jurídico requer dono adequado. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [api-connector-builder](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/api-connector-builder/SKILL.md) | Adicionar integração seguindo o padrão do repositório | Parcial |
| [counterparty-channel-discipline](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/counterparty-channel-discipline/SKILL.md) | Regras de observação e comunicação por canal externo | A comparar |
| [email-ops](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/email-ops/SKILL.md) | Triagem, rascunhos, envio e comprovação de e-mails | A comparar |
| [esign-field-placement](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/esign-field-placement/SKILL.md) | Posicionar campos de assinatura com coordenadas verificáveis | A comparar |
| [google-workspace-ops](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/google-workspace-ops/SKILL.md) | Fluxos entre Drive, Docs, Sheets e Slides | A comparar |
| [jira-integration](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/jira-integration/SKILL.md) | Leitura e atualização de tarefas pela API Jira | A comparar |
| [laravel-plugin-discovery](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/laravel-plugin-discovery/SKILL.md) | Pesquisar pacotes Laravel e compatibilidade via LaraPlugins | A comparar |
| [mailtrap-email-integration](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/mailtrap-email-integration/SKILL.md) | Integrar e testar e-mail transacional via Mailtrap | A comparar |
| [master-agreement-generator](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/master-agreement-generator/SKILL.md) | Rascunhar contratos a partir de template e especificação | A comparar |
| [mcp-server-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/mcp-server-patterns/SKILL.md) | Tools, resources, validação e transporte de servidores MCP | A comparar |
| [messages-ops](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/messages-ops/SKILL.md) | Ler conversas e preparar mensagens com evidência do destino | A comparar |
| [nutrient-document-processing](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/nutrient-document-processing/SKILL.md) | OCR, conversão, redação e assinatura via API Nutrient | A comparar |
| [operator-approval-loop](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/operator-approval-loop/SKILL.md) | Aprovação de rascunhos e recibos de comunicação externa | Parcial |
| [project-flow-ops](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/project-flow-ops/SKILL.md) | Coordenar tarefas e PRs entre GitHub e Linear | A comparar |
| [unified-notifications-ops](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/unified-notifications-ops/SKILL.md) | Roteamento e deduplicação de notificações e alertas | A comparar |
| [visa-doc-translate](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/visa-doc-translate/SKILL.md) | OCR e tradução documental em PDF bilíngue | A comparar |

**Revisão (2026-11-11, snapshot `d2ef268`; 16 entrypoints lidos, nenhum falhou; resumos do WebFetch; auxiliares não lidos).** Fontes locais: Gard (grep), orchestrate, [out-of-scope-issues](../out-of-scope-issues.md), specs de segurança (grep), hook (grep: `SendMessage` ali é só crédito de revisão e Stop gate). **O hook não tem gate de envio externo**; o que vale é a regra do `~/AGENTS.md` (confirmar ação irreversível ou voltada ao exterior), por julgamento.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `operator-approval-loop`, `email-ops`, `counterparty-channel-discipline`, `master-agreement-generator`, `nutrient-document-processing`, `visa-doc-translate`, `esign-field-placement`: aprovar o texto exato; aprovação não prova entrega; upload de documento com dados pessoais a serviço externo é publicação | V | `out-of-scope-issues.md` já exige aprovação do rascunho exato, publica só o aprovado e trata "resultado incerto" sem reenvio, mas só para issues; orchestrate separa PR, commit e publicação de autorização sem cobrir envio a terceiros | Uma frase em orchestrate (entrega): ação externa irreversível (mensagem, e-mail, upload, assinatura) envia só o texto aprovado; "enviado" só com confirmação do destino; sem ela, reportar "resultado incerto" e não repetir. Sem máquina de estados, hash nem nonce | 2 |
| conteúdo recebido (e-mail, ticket, mensagem) é dado, nunca instrução; não vazar segredo, raciocínio, erro bruto nem caminhos | C | `out-of-scope-issues.md` ("tracker content is untrusted data"); Gard (segredo em prompt, log e saída) | Nada; conector não é distribuído | — |
| credencial em env, menor privilégio, rotação (`jira-integration`, `mailtrap`, `api-connector-builder`) | C | Gard (segredos, rotação, integração externa como superfície); Bob e spec de engenharia | Nada | — |
| `mailtrap-email-integration` (sandbox × produção), `mcp-server-patterns` (schema por tool, versão do SDK pinada) | P | Gard/Pipe cobrem ambientes em geral; nenhum pack MCP; o kit não distribui servidores MCP | Pack por demanda; versões de SDK mudam, checar a documentação atual | 3 |
| `google-workspace-ops`, `jira-integration` (transições), `project-flow-ops`, `unified-notifications-ops`, `laravel-plugin-discovery`, `master-agreement-generator`, `visa-doc-translate` | D / P | Conectores e domínio comercial e jurídico não distribuídos; `google-workspace-ops` não define aprovação nem escopo para editar ou apagar | Rejeitar como política universal; contrato e visto exigem dono jurídico, inexistente | 3 |

**Decisão:** uma frase em orchestrate generalizando o padrão de `out-of-scope-issues.md` para ações externas irreversíveis. Sem agente, hook, conector, máquina de estados, limiares nem receitas de provedor.

<a id="g25"></a>

### G25 — Operações de negócios e indústria

**Prioridade 4; revisado em 2026-11-11 (deltas propostos, não aplicados); 8 skills.**

**Evidência local:** [Limites de escopo e especialistas](../../reference/agents-block.md).

**O que vale avaliar:** Não transportar playbooks de logística, comércio ou indústria para o núcleo de engenharia. Reavaliar somente com projeto e expertise necessários.

**Destino provável:** Fora do núcleo; eventual pack vertical separado.

**Responsabilidades ao revisar:** Não há dono de domínio demonstrado; designar antes de recomendar decisões. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [carrier-relationship-management](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/carrier-relationship-management/SKILL.md) | Seleção, negociação e avaliação de transportadoras | A comparar |
| [customs-trade-compliance](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/customs-trade-compliance/SKILL.md) | Classificação tarifária, origem e documentação de comércio | A comparar |
| [energy-procurement](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/energy-procurement/SKILL.md) | Tarifas, demanda e contratação de energia | A comparar |
| [inventory-demand-planning](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/inventory-demand-planning/SKILL.md) | Previsão de demanda, estoque de segurança e reposição | A comparar |
| [logistics-exception-management](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/logistics-exception-management/SKILL.md) | Atrasos, perdas, danos e disputas no transporte | A comparar |
| [production-scheduling](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/production-scheduling/SKILL.md) | Sequenciamento, capacidade e gargalos de produção industrial | A comparar |
| [quality-nonconformance](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/quality-nonconformance/SKILL.md) | Não conformidades, causa raiz e qualidade industrial | A comparar |
| [returns-reverse-logistics](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/returns-reverse-logistics/SKILL.md) | Devoluções, inspeção, reembolso e logística reversa | A comparar |

**Desambiguação:** `production-scheduling` trata de programação de produção industrial; não é scheduler de jobs de software. `quality-nonconformance` trata de qualidade industrial/regulada, não revisão comum de código.

**Triagem de prioridade 4 (2026-11-11, snapshot `d2ef268`; 8 entrypoints lidos, nenhum falhou; resumos do WebFetch).** Fontes locais: Scott, Pipe e Gard (grep), spec de descoberta, `reference/agents-block.md`. Setores sem dono no CanonKit: o lead não os cobre.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| metas numéricas e faixas de alerta do setor (OTD ≥95%, score de fraude 65/80, escalonamento acima de US$ 500 mil) | D | A forma de definir meta já está em Pipe ("a reliability target names the operation, the success definition, and the window") | Rejeitar os números; a forma fica com Pipe | 4 |
| personas ("senior ... 15+ years"), cadeias de escalonamento fixas, templates de comunicação | D | Mesma rejeição de personas simuladas de G13; escalonamento é definido por projeto | Rejeitar | 4 |
| adaptar templates à organização antes de produção; não inventar evidência | C | Scott não inventa evidência de usuário; spec de descoberta | Nada | — |
| triagem por severidade, contenção antes da causa raiz (`logistics-exception-management`, `quality-nonconformance`, `returns-reverse-logistics`) | C (parcial) | Pipe tem incidentes, runbook e validação pós-mudança; a triagem com prazo não foi confirmada no trecho lido | Nada no núcleo | — |
| `quality-nonconformance` (CAPA com janela de eficácia), `customs-trade-compliance` (classificação tarifária, triagem de partes restritas), `carrier-relationship-management` (vetting de transportadora) | P / D | Domínios regulados sem especialista; Gard cobre cadeia de suprimento de software, não fornecedores comerciais | Pack vertical só com projeto que o demande e dono designado | 4 |

**Decisão:** nenhum delta nem pack agora. Os princípios portáveis já estão com Scott e Pipe. Personas, cadeias fixas e limiares: rejeitar.

<a id="g26"></a>

### G26 — Finanças, pagamentos e blockchain

**Prioridade 4; revisado em 2026-11-11 (deltas propostos, não aplicados); 10 skills.**

**Evidência local:** [Gard](../../agents/gard.md), [roster](../../reference/agents-block.md).

**O que vale avaliar:** Separar billing operacional, aritmética de tokens, contratos on-chain e risco financeiro. Não importar execução de pagamento/trading nem alegar expertise financeira pela presença de Gard.

**Destino provável:** Fora do núcleo; packs verticais somente com demanda, autoridade e evidência próprias.

**Responsabilidades ao revisar:** Gard nos riscos técnicos; dono financeiro/compliance precisa ser designado. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [agent-payment-x402](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/agent-payment-x402/SKILL.md) | Pagamentos de agentes, carteiras e limites de gasto | A comparar |
| [customer-billing-ops](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/customer-billing-ops/SKILL.md) | Operar assinaturas, reembolsos e recuperação de cobrança | A comparar |
| [defi-amm-security](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/defi-amm-security/SKILL.md) | Riscos de contratos AMM, liquidez e swaps | A comparar |
| [evm-token-decimals](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/evm-token-decimals/SKILL.md) | Decimais e normalização de valores entre redes EVM | A comparar |
| [finance-billing-ops](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/finance-billing-ops/SKILL.md) | Auditar receita, preços e verdade do modelo de cobrança | A comparar |
| [ito-baskets](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/ito-baskets/SKILL.md) | Pesquisa somente leitura de cestas e dados de mercados | A comparar |
| [llm-trading-agent-security](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/llm-trading-agent-security/SKILL.md) | Permissões, simulação e limites de agentes de trading | A comparar |
| [nodejs-keccak256](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/nodejs-keccak256/SKILL.md) | Evitar confusão entre SHA3 e Keccak em Ethereum | A comparar |
| [prediction-market-oracle-research](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/prediction-market-oracle-research/SKILL.md) | Mercados de previsão como fonte de sinal e oráculo | A comparar |
| [prediction-market-risk-review](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/prediction-market-risk-review/SKILL.md) | Riscos de execução, privacidade e compliance de mercados | A comparar |

**Triagem de prioridade 4 (2026-11-11, snapshot `d2ef268`; 10 entrypoints lidos, nenhum falhou; resumos do WebFetch).** Fontes locais: Gard (`gard.md:15-16`, `25-33`, `50`), Archie (`:56`), Pipe (`:20`, `:114`), Bob (`:108`: pagamento aciona Gard), Dana (grep), regra do `~/AGENTS.md` de que pagamento é HIGH. Finanças, cripto e compliance não têm dono instalado, e o roster instalável não tem especialista para isso.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `agent-payment-x402`, `llm-trading-agent-security`: política de gasto fora do modelo, allowlist de destinos, simulação, circuit breakers | C (parte genérica) / D (execução de pagamento e trading) | Gard cobre segredos, permissões amplas e superfície pública; pagamento é HIGH | Sem delta; limites de gasto, wallet e simulação on-chain são domínio sem dono | 4 |
| claim único e atômico de autorização; reservar orçamento antes de qualquer `await` | C | Archie (idempotência, retry, timeout), Pipe (DLQ), Dana (deduplicação de evento) | Nada; exemplos de dinheiro são material de projeto | 4 |
| `customer-billing-ops`, `finance-billing-ops`: reembolso, assinatura, auditoria de receita | D | Exige dono financeiro ou de compliance, inexistente | Rejeitar | 4 |
| `evm-token-decimals`, `nodejs-keccak256`, `defi-amm-security` | D / P | Nenhuma fonte local trata de blockchain; "dinheiro em tipo exato, nunca float" é boa prática genérica de Bob e Quinn, estreita demais para virar regra | Pack vertical web3 só com demanda e autoridade própria; não improvisar o domínio via Gard | 4 |
| `ito-baskets`, `prediction-market-oracle-research`, `prediction-market-risk-review` | D | Pesquisa de mercado financeiro e compliance de venue sem dono; aprovação humana e segredos já em Gard | Rejeitar | 4 |

**Decisão:** nenhuma melhoria incorporada. Pagamento já é HIGH, com Gard e revisão independente após a última edição. O kit não cobre o domínio financeiro; pacote financeiro ou web3 só com demanda e autoridade próprias.

<a id="g27"></a>

### G27 — Saúde e dados clínicos

**Prioridade 4; revisado em 2026-11-11 (deltas propostos, não aplicados); 5 skills.**

**Evidência local:** [Limites de especialistas](../../reference/agents-block.md), [Gard](../../agents/gard.md).

**O que vale avaliar:** Segurança genérica não comprova segurança clínica nem conformidade HIPAA. O inventário não valida conteúdo médico/regulatório do ECC.

**Destino provável:** Fora do núcleo; projeto clínico exige expertise e validação independentes.

**Responsabilidades ao revisar:** Dono clínico/regulatório não demonstrado; Gard cobre apenas seu domínio técnico. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [healthcare-cdss-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/healthcare-cdss-patterns/SKILL.md) | Suporte clínico à decisão e validação de alertas | A comparar |
| [healthcare-emr-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/healthcare-emr-patterns/SKILL.md) | Fluxos clínicos e prontuários eletrônicos | A comparar |
| [healthcare-eval-harness](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/healthcare-eval-harness/SKILL.md) | Avaliação de segurança clínica e integridade de fluxos | A comparar |
| [healthcare-phi-compliance](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/healthcare-phi-compliance/SKILL.md) | Classificação, acesso e auditoria de dados clínicos | A comparar |
| [hipaa-compliance](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/hipaa-compliance/SKILL.md) | Requisitos e evidência de privacidade específicos de HIPAA | A comparar |

**Triagem de prioridade 4 (2026-11-11, snapshot `d2ef268`; 5 entrypoints lidos, nenhum falhou; resumos do WebFetch).** Fontes locais: Gard (`gard.md:15`, `19`, `25`, `30`, `42`, `50`), Archie e Quinn (grep, sem trecho sobre dados clínicos). O domínio clínico fica **sem dono neste projeto** e o lead não o cobre. O kit não alega conformidade com HIPAA, DISHA, GDPR nem qualquer outra norma.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `healthcare-cdss-patterns`, `healthcare-emr-patterns`: alertas de interação e dose, prontuário assinado travado, trilha de auditoria | D | Roster sem dono clínico; os especialistas instaláveis não incluem clínico | Rejeitar como conteúdo do kit | 4 |
| `healthcare-eval-harness`: gates de segurança clínica com 100% e 95% de aprovação | D / P | Cobertura percentual fixa já rejeitada em G08 e G13 | Rejeitar limiares; projeto clínico exige especialista e validação independente | 4 |
| `healthcare-phi-compliance`, `hipaa-compliance`: dado sensível fora de logs, URLs, storage do navegador, prompts e relatórios de crash; IDs opacos; terceiros e LLMs bloqueados por padrão | C | Gard cobre segredos e dados sensíveis em Git, imagem, log, saída, prompt, cache e artefato (`gard.md:15`, `19`, `25`, `30`); dado sensível é HIGH | Nada; Gard cobre só o domínio técnico de exposição | — |
| conformidade regulatória (HIPAA, DISHA, GDPR), BAA, auditoria insert-only, RLS por unidade | D | Segurança genérica não comprova conformidade; Gard não declara papel jurídico | Rejeitar | 4 |
| dado sensível em fixtures e testes | — | Nenhuma das cinco skills trata de fixtures (confiança média, leitura por resumo); a lacuna não é demonstrável localmente | Sem delta | — |

**Decisão:** nenhuma mudança proposta. O único ponto portável (dado sensível fora de logs, prompts, URLs e storage) já está em Gard e é HIGH.

<a id="g28"></a>

### G28 — Redes e homelab

**Prioridade 4; revisado em 2026-11-11 (deltas propostos, não aplicados); 10 skills.**

**Evidência local:** [Pipe](../../agents/pipe.md), [Gard](../../agents/gard.md).

**O que vale avaliar:** Separar disponibilidade/segurança de receitas de Cisco, BGP, VLAN, DNS e VPN. Conhecimento específico só com necessidade e ambiente identificados.

**Destino provável:** Packs de infraestrutura de projeto; não configurar redes nesta revisão.

**Responsabilidades ao revisar:** Pipe/Gard nos riscos técnicos; especialista de rede conforme necessidade. Esses nomes descrevem responsabilidades futuras; nenhum subagente foi acionado neste inventário.

| Skill ECC no snapshot | Conhecimento a comparar | Situação inicial |
| --- | --- | --- |
| [cisco-ios-patterns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/cisco-ios-patterns/SKILL.md) | Configuração e verificação segura de Cisco IOS/IOS-XE | A comparar |
| [homelab-network-readiness](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/homelab-network-readiness/SKILL.md) | Prontidão para segmentação, DNS e acesso remoto | A comparar |
| [homelab-network-setup](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/homelab-network-setup/SKILL.md) | Planejamento de gateway, switches, IPs, DHCP e DNS | A comparar |
| [homelab-pihole-dns](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/homelab-pihole-dns/SKILL.md) | Filtragem DNS e diagnóstico com Pi-hole | A comparar |
| [homelab-vlan-segmentation](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/homelab-vlan-segmentation/SKILL.md) | VLANs, trunks, firewall e segmentação de redes | A comparar |
| [homelab-wireguard-vpn](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/homelab-wireguard-vpn/SKILL.md) | Peers, chaves, túneis e acesso remoto WireGuard | A comparar |
| [netmiko-ssh-automation](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/netmiko-ssh-automation/SKILL.md) | Coleta e alterações de rede limitadas via SSH/Netmiko | A comparar |
| [network-bgp-diagnostics](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/network-bgp-diagnostics/SKILL.md) | Diagnóstico de sessões, rotas e políticas BGP | A comparar |
| [network-config-validation](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/network-config-validation/SKILL.md) | Validar endereços, referências e risco de configuração | A comparar |
| [network-interface-health](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/skills/network-interface-health/SKILL.md) | Erros, drops, flapping e tendências de interfaces | A comparar |

**Triagem de prioridade 4 (2026-11-11, snapshot `d2ef268`; 10 entrypoints lidos, nenhum falhou; resumos do WebFetch).** Fontes locais: [Pipe](../../agents/pipe.md) (`:30`, `:46`, `:57`, `:92`), Gard (grep), [política ambiental](../../openspec/specs/environment-security-policy/spec.md) (grep). Sem agente de rede no roster: o lead não cobre essa área, e nenhuma mudança de rede é proposta para execução.

| Skill / ideia | Classe na revisão | Evidência local | Destino / melhoria decidida | Prioridade |
| --- | --- | --- | --- | --- |
| `cisco-ios-patterns`, `netmiko-ssh-automation`, `network-config-validation`: ler antes de mudar, diff ou dry-run, aprovação explícita, rollback, salvar só após validar, mudança em etapas | C | Pipe (produção executada pelo usuário, rollback obrigatório, deploy incremental); política ambiental (modo de aprovação nativo decide) | Nada | — |
| mudança que pode cortar o próprio acesso de gerenciamento (VLAN de gestão, firewall, VPN, DNS, SSH) | L | Pipe cita rede só como HIGH (`:92`) e rollback genérico; grep não achou "lockout" nem acesso fora de banda | Uma frase em Pipe ("How to handle deployment and rollback"): rollback e caminho de acesso fora da faixa afetada confirmados antes de aplicar. Só se rede entrar no escopo | 4 |
| exposição de painéis, DNS, SSH e VPN; chave VPN por dispositivo; segredo fora do Git; credenciais fora do código | C | Gard (`:16` superfície pública, `:28` serviço público sem necessidade, `:50` HIGH, `:42` não abre segredos) | Nada; senhas e portas ficam no pack | — |
| `homelab-network-setup`/`-readiness`/`-vlan-segmentation`/`-pihole-dns`/`-wireguard-vpn`; `network-bgp-diagnostics`, `network-interface-health` | P | Pipe e Gard tratam risco, não receita; sem diagnóstico de rede | Pack de rede por demanda, dono a designar; "não relaxar controle para diagnosticar" pode virar complemento de Gard se rede entrar no escopo | 4 |

**Decisão:** um único delta, condicionado a rede entrar no escopo (uma frase em Pipe). Receitas de Cisco, BGP, Pi-hole, VLAN e WireGuard viram pack por demanda.

## Achados de documentação a preservar

- **Links quebrados confirmados em 2026-11-11:** `learning-loop-design.md` (linha da tabela "Aprendizado manual"), `stack-packs-design.md` (tabela "Dez packs opcionais" e seção G05) e `ecc-lessons-handoff.md` (achados abaixo) não existem em `docs/plans/`; foram removidos em um commit anterior de limpeza. Corrigir ou remover os links é decisão pendente.
- **Corrigido no planejamento em 2026-11-09 — baseline da change visual:** [proposal.md](../../openspec/changes/archive/2026-11-11-ui-focused-visual-workflow/proposal.md) e [design](../../openspec/changes/archive/2026-11-11-ui-focused-visual-workflow/design.md) agora reconhecem as seis capacidades principais e distinguem a baseline histórica do working tree atual. As main specs são reutilizadas, não modificadas por essa correção.
- O [handoff histórico ECC](ecc-lessons-handoff.md) e a [auditoria de 2026-10-29](../../evals/audits/2026-10-29-ecc.json) são evidências de outros recortes/revisões, incluindo agentes e hooks. Não estender seus vereditos a este catálogo inteiro.

<a id="deltas-propostos-por-destino"></a>

## Deltas propostos por destino

Consolidação de 2026-11-11 das linhas de prioridade 1–2 (e dos condicionais) dos 28 grupos. **Nada foi aplicado.** Cada linha é uma ou duas frases na fonte indicada; as de prioridade 3 e 4 ficam como demanda futura e não entram aqui. Aplicar muda instruções de agentes e packs: pede decisão do usuário, mudança de risco MEDIUM com Bob implementando, Quinn revisando e Virgo validando a configuração, e atualização da documentação afetada na mesma change.

| Destino | Deltas (grupo) |
| --- | --- |
| `agents/bob.md` | RED vale só se falha pelo defeito pretendido (G08); resposta ambígua em escrita externa = estado desconhecido (G10); procurar antes de criar utilitário (G10); mensagem de commit conforme a convenção medida, quando autorizado (G10); confirmar antes de reescrever histórico publicado (G10); jobs assíncronos: enfileirar após o commit, identificadores, falha esgotada (G06); rede de testes antes de refatorar sem mudar comportamento (G13) |
| `agents/gard.md` | fronteira de confiança agentic/MCP e revisão estática de config MCP (G09); varrer histórico e artefatos ao publicar um repositório (G18) |
| `agents/archie.md` | classificar mudança de contrato como aditiva ou quebrante (G06); compatibilidade entre código antigo e novo na migração destrutiva (G07); compatibilidade inverificada sem contrato verificável, com Quinn (G08/G06) |
| `agents/pipe.md` | mitigação de rollback e risco de lock em migração (G07); nomear o que o rollback não reverte (G18); "como reverter" no brief HIGH de migração ou contrato (G10); acesso de gerenciamento em mudança de rede, só se rede entrar no escopo (G28) |
| `agents/scott.md` | efeito colateral proibido e invariantes e falha/recuperação como decisão (G11); proveniência em pesquisa para decisão (G21); glossário existente e termos sobrecarregados, com Spencer (G15) |
| `agents/spencer.md` | ciclo de vida de ADR com link nos dois sentidos, fonte única por fato e gatilhos curtos de atualização (G12) |
| `agents/perry.md` | otimização só vale com a correção verde, e a busca para no ruído (G19) |
| `skills/orchestrate/SKILL.md` | consumidor afetado e não verificado mantém PARTIALLY VERIFIED; aceitação em ambiente-alvo não provada por checks locais (G08); superfície de escrita e dependência por raia, integração uma a uma (G13); execução recorrente ou em loop (G14, condicional); ação externa irreversível envia só o texto aprovado (G24) |
| `docs/evals.md` | rótulo alvo/controle, limite de adesão a procedimentos de vários passos não medida, guia de variantes neutra e competidora, e verificação de ERROR × falha (G16) |
| `stack-packs/` | `ui-design` e `ui-review`: condições nativas e mobile (G04, prioridade 1); `cpp`, `rust`, `kotlin`: cláusulas curtas (G05); `game-art-direction`: proveniência e licença de asset (G23) |

Fora desta lista, sem delta proposto: G26 e G27 (domínios sem dono instalado), G22 e G25 (fora do foco) e os itens de prioridade 3 e 4 de todos os grupos. Dois pontos a decidir antes de qualquer apply: o hook **não tem gate para comandos destrutivos genéricos nem para a execução de migração** (hoje depende do modo nativo e do `deny` do usuário; um novo gate seria change própria com Gard e Pipe), e os links quebrados citados nos achados de documentação.

## Se retomar a revisão de um grupo

Atualizar somente o diagnóstico e as decisões do grupo, sem implementar nem instalar, e verificar branch, HEAD e estado sujo antes. Packs de plataforma exigem plataforma ou projeto definido.

## Verificação histórica do inventário inicial

- Check documental via Python, em 2026-11-09: 314 linhas individuais, 314 IDs únicos, 28 grupos; contagens do resumo iguais às tabelas detalhadas; âncoras internas e links locais existentes; zero whitespace ao final de linhas.
- Comparação dos IDs extraídos do Markdown com os caminhos da árvore Git fixada: nenhum ausente, excedente ou duplicado. Todos os links individuais usam o mesmo SHA do snapshot recuperado.
- Não foram rodados testes de aplicação ou evals comportamentais: o único arquivo criado por esta tarefa é este handoff informativo, sem mudança de código ou de instruções executáveis. O grafo não foi reconstruído; foi usado apenas para navegação antes das leituras diretas.

## Rastreabilidade da revisão G01–G04

| V/L aceito de G01–G03 | Destino consolidado na change | Verificação prevista |
| --- | --- | --- |
| G01 `frontend-a11y`: operação acessível | M3; Rendered review matches the changed experience | Formulário/overlay/status com evidência operacional, não só screenshot |
| G01 `browser-qa`: falhas, assets e temas | M3; Rendered review matches the changed experience | Falha esperada versus quebra do fluxo; assets e temas afetados |
| G01 `click-path-audit`: resultado e recuperação | M2; Content states and flow outcomes are explicit | Resultado prometido, retry/interrupção/ordem quando pertinentes |
| G01 `frontend-design-direction`: estados completos | M2; Content states and flow outcomes are explicit | Gatilho/feedback/ação; parcial; não testado versus não aplicável |
| G01 `make-interfaces-feel-better`: acabamento | M1/M4; Design decisions follow the product and existing direction; Motion preserves purpose access and stability | Elemento/defeito/correção, escala real e geometria estável |
| G01 `i18n-sync`: contexto e fit | M3; Rendered review matches the changed experience | Conteúdo/formatação/placeholders/RTL de locales suportados afetados |
| G02 `motion-foundations`: propósito e redução | M4; Motion preserves purpose access and stability | Preferência normal/reduzida preserva informação/ações |
| G02 `motion-patterns`: continuidade/interrupção | M4; Motion preserves purpose access and stability | Reversão/navegação, foco e estado final |
| G02 `motion-advanced`: gestos e trabalho contínuo | M4; Motion preserves purpose access and stability | Entrada pertinente/alternativa operável e pausa/limpeza |
| G03 `react-performance`: conteúdo progressivo estável | M3/M4; Rendered review matches the changed experience | Troca fallback/conteúdo/assets/labels preserva leitura e alvos, com ou sem animação |

Todas essas verificações alimentam as tarefas existentes 2.2 e 3.3; ownership e proporcionalidade ficam em 1.2/1.3. As classificações C/S/P/D e o L de G04 (antes adiado, reaberto em 2026-11-11) permanecem nas tabelas dos grupos. “Suficiente no planejamento” não significa implementado, instalado ou eficácia medida. A validação documental da revisão e seu review ficam em [tasks.md](../../openspec/changes/archive/2026-11-11-ui-focused-visual-workflow/tasks.md), sem duplicar o registro de entrega.


