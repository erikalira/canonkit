# Handoff — conhecimentos das skills do ECC para revisão no CanonKit

Data: 2026-11-09. Estado: **G01–G03 revisados, V/L incorporados ao planejamento visual; G04 classificado e adiado; G05–G28 pendentes**.

Atualização do apply em 2026-11-09: os V/L aceitos de G01–G03 foram implementados nas fontes locais
da change visual; progresso, evidências offline, reviews e limites atuais ficam
em [tasks.md](../../openspec/changes/ui-focused-visual-workflow/tasks.md).
O inventário e as classificações abaixo preservam o diagnóstico histórico.
G04 continua adiado; implementação local não significa instalação nem eficácia
comportamental medida.

## Objetivo e próximo passo

Revisar o conhecimento do ECC por grupo, identificar o que já existe no CanonKit e decidir o menor complemento útil. Este documento organiza a comparação; não aprova instalação, importação em massa, criação de agentes, implementação ou publicação. O usuário autorizou a revisão dos artefatos de `ui-focused-visual-workflow` para todos os V/L de G01–G03 e o registro das classificações de G01–G04; isso não autoriza aplicar as instruções planejadas aos agentes/packs.

**Próximo passo da área visual:** implementar a change `ui-focused-visual-workflow` somente após pedido de apply. G01–G03 já têm destino documental; G04 fica para uma futura change focada em stack packs, sem plataforma selecionada nem criação dessa change nesta etapa. Para continuar o inventário, a proposta é revisar G08/G09/G10/G12/G16, que afetam qualidade e confiabilidade em vários projetos; essa ordem não é decisão aprovada.

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

Nas tabelas de revisão, prioridade **1** significa incorporar nesta revisão; **2**, verificação condicional à superfície; **3**, demanda futura; **—**, nenhuma adição. Os códigos V/L ficam como rastreio do diagnóstico: todos os de G01–G03 foram aceitos no planejamento, sem alegar implementação. G04 mantém o diagnóstico, mas foi adiado por decisão explícita do usuário, inclusive os acréscimos portáveis nativos.

Destinos M1–M4 remetem às decisões consolidadas do [design visual](../../openspec/changes/ui-focused-visual-workflow/design.md) e aos requisitos/cenários de [interface workflow](../../openspec/changes/ui-focused-visual-workflow/specs/interface-design-workflow/spec.md). Este handoff preserva a comparação e as decisões; os artefatos da change são a fonte de verdade para implementação e aceitação.

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
| UI visual | [Proposta](../../openspec/changes/ui-focused-visual-workflow/proposal.md), [design](../../openspec/changes/ui-focused-visual-workflow/design.md), [tasks](../../openspec/changes/ui-focused-visual-workflow/tasks.md). | **Planejamento, 0/12 tarefas implementadas** no estado inspecionado. `ui-design`, `ui-review` e `game-art-direction` ainda não estão no catálogo. |

## Mapa dos grupos

Cada skill aparece em um único grupo principal, mesmo quando toca vários assuntos. O grupo define por onde começar; os donos dos riscos continuam sendo os existentes no CanonKit.

| Grupo | Conhecimento | Skills | Prioridade | Cobertura local inicial | Revisão |
| --- | --- | ---: | --- | --- | --- |
| [G01](#g01) | UI, UX e acessibilidade | 9 | 1 | Planejado + parcial | Revisado; V/L no planejamento |
| [G02](#g02) | Motion de interfaces | 3 | 2 | Princípios gerais | Revisado; V/L no planejamento |
| [G03](#g03) | Frontend web e ferramentas | 10 | 2 | React parcial | Revisado; V/L no planejamento |
| [G04](#g04) | Mobile e interfaces nativas | 9 | 3 | Linguagens parciais | Classificado; incorporação adiada |
| [G05](#g05) | Linguagens, concorrência e runtime | 12 | 2 | Packs de linguagem existentes | Pendente |
| [G06](#g06) | Arquitetura, APIs e frameworks backend | 14 | 2 | Arquitetura geral | Pendente |
| [G07](#g07) | Bancos, ORM e migrações | 10 | 2 | Governança geral | Pendente |
| [G08](#g08) | Testes, regressão e verificação | 25 | 1 | Protocolos parciais | Pendente |
| [G09](#g09) | Segurança, permissões e supply chain | 12 | 1 | Segurança parcial | Pendente |
| [G10](#g10) | Prática de engenharia, revisão e Git | 12 | 1 | Recortes presentes | Pendente |
| [G11](#g11) | Produto, escopo e planejamento | 7 | 2 | Descoberta parcial | Pendente |
| [G12](#g12) | Documentação e navegação de código | 7 | 1 | Documentação parcial | Pendente |
| [G13](#g13) | Orquestração de equipes e execução paralela | 16 | 2 | Orquestração parcial | Pendente |
| [G14](#g14) | Construção de agentes e loops autônomos | 11 | 3 | Sem runtime equivalente demonstrado | Pendente |
| [G15](#g15) | Contexto, memória e aprendizado | 11 | 2 | Continuidade e aprendizado manual | Pendente |
| [G16](#g16) | Avaliação e diagnóstico de agentes | 7 | 1 | Infraestrutura de eval existente | Pendente |
| [G17](#g17) | Catálogo, instalação e ferramentas do ECC | 18 | 3 | Lifecycle próprio | Pendente |
| [G18](#g18) | Operações, deploy e ambientes | 13 | 2 | Operações gerais | Pendente |
| [G19](#g19) | Desempenho, custos e orçamento | 10 | 2 | Medição parcial | Pendente |
| [G20](#g20) | Dados, ML e aplicações de IA | 10 | 3 | Autoridade de especialistas | Pendente |
| [G21](#g21) | Pesquisa e evidência científica | 10 | 3 | Pesquisa sem catálogo equivalente demonstrado | Pendente |
| [G22](#g22) | Marca, conteúdo e crescimento | 17 | 4 | Fora do foco atual do núcleo | Pendente |
| [G23](#g23) | Direção criativa, mídia e vídeo | 12 | 3 | Direção visual parcial; pipeline não demonstrado | Pendente |
| [G24](#g24) | Conectores, comunicação e documentos | 16 | 3 | Princípios gerais; integrações não demonstradas | Pendente |
| [G25](#g25) | Operações de negócios e indústria | 8 | 4 | Não mapeado | Pendente |
| [G26](#g26) | Finanças, pagamentos e blockchain | 10 | 4 | Segurança geral não equivale a domínio | Pendente |
| [G27](#g27) | Saúde e dados clínicos | 5 | 4 | Não mapeado | Pendente |
| [G28](#g28) | Redes e homelab | 10 | 4 | Operações gerais não equivalem a rede | Pendente |

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

**Evidência local:** [Pixie](../../agents/pixie.md), [Nova](../../agents/nova.md) e [change visual](../../openspec/changes/ui-focused-visual-workflow/design.md).

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

**Evidência local:** [Divisão visual/UX planejada](../../openspec/changes/ui-focused-visual-workflow/specs/visual-design-ownership/spec.md), [Perry](../../agents/perry.md).

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

**Prioridade 3; classificado em 2026-11-09; incorporação adiada; 9 skills.**

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
| `flutter-dart-code-review`: texto ampliado, safe areas, orientação, retorno e offline | L | Workflow genérico não explicita essas condições nativas | Aprendizado portável preservado para futura change de stack packs; adiado inclusive esse L por decisão do usuário | 2 |
| `flutter-dart-code-review`: lint, state managers, goldens e cobertura | P | Quinn define cobertura por risco; não há suporte Flutter específico | Pack futuro sem limites de linhas, percentuais ou goldens universais | 3 |
| `foundation-models-on-device`: LLM local e streaming | D | Integração de IA fora do escopo visual | Adiar; disponibilidade e parcialidade já cabem no contrato genérico de estados | 3 |
| `ios-icon-gen`: seleção e integração de ícones | P | Nova já considera escala/coerência/proveniência; Swift não inclui gerador | Pack futuro; preservar inspeção no tamanho real sem universalizar scripts/imagesets/fornecedores | 3 |
| `liquid-glass-design`: materiais e morphing Apple | P | Nova/Pixie/Perry têm as autoridades relevantes | Não universalizar vidro/translucidez; avaliar aparências suportadas e conteúdo real no projeto selecionado | 3 |
| `react-native-patterns`: Expo, navegação, listas e APIs nativas | P | React não equivale a React Native/Expo | Pack separado por demanda; não transpor DOM/ARIA diretamente ao nativo | 3 |
| `swiftui-patterns`: estado, composição, navegação e previews | P | Swift cobre ownership/isolamento/tarefas, sem workflow SwiftUI completo | Pack futuro; previews de estados não comprovam dispositivo, navegação ou tecnologia assistiva | 3 |

**Decisão do usuário:** deixar G04 para uma change futura focada em adicionar stack packs. Nenhum procedimento nativo, critério de simulador/dispositivo, safe area ou biblioteca mobile foi adicionado à change visual a partir deste grupo. Os diagnósticos ficam disponíveis para retomada; “parcial” nos packs de linguagem não significa cobertura completa de Android/Compose/SwiftUI. A futura change ainda precisa selecionar plataforma e demanda; não foi criada nesta revisão.

<a id="g05"></a>

### G05 — Linguagens, concorrência e runtime

**Prioridade 2; revisão pendente; 12 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g06"></a>

### G06 — Arquitetura, APIs e frameworks backend

**Prioridade 2; revisão pendente; 14 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g07"></a>

### G07 — Bancos, ORM e migrações

**Prioridade 2; revisão pendente; 10 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g08"></a>

### G08 — Testes, regressão e verificação

**Prioridade 1; revisão pendente; 25 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g09"></a>

### G09 — Segurança, permissões e supply chain

**Prioridade 1; revisão pendente; 12 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g10"></a>

### G10 — Prática de engenharia, revisão e Git

**Prioridade 1; revisão pendente; 12 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g11"></a>

### G11 — Produto, escopo e planejamento

**Prioridade 2; revisão pendente; 7 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g12"></a>

### G12 — Documentação e navegação de código

**Prioridade 1; revisão pendente; 7 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g13"></a>

### G13 — Orquestração de equipes e execução paralela

**Prioridade 2; revisão pendente; 16 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g14"></a>

### G14 — Construção de agentes e loops autônomos

**Prioridade 3; revisão pendente; 11 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g15"></a>

### G15 — Contexto, memória e aprendizado

**Prioridade 2; revisão pendente; 11 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g16"></a>

### G16 — Avaliação e diagnóstico de agentes

**Prioridade 1; revisão pendente; 7 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g17"></a>

### G17 — Catálogo, instalação e ferramentas do ECC

**Prioridade 3; revisão pendente; 18 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g18"></a>

### G18 — Operações, deploy e ambientes

**Prioridade 2; revisão pendente; 13 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g19"></a>

### G19 — Desempenho, custos e orçamento

**Prioridade 2; revisão pendente; 10 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g20"></a>

### G20 — Dados, ML e aplicações de IA

**Prioridade 3; revisão pendente; 10 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g21"></a>

### G21 — Pesquisa e evidência científica

**Prioridade 3; revisão pendente; 10 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g22"></a>

### G22 — Marca, conteúdo e crescimento

**Prioridade 4; revisão pendente; 17 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g23"></a>

### G23 — Direção criativa, mídia e vídeo

**Prioridade 3; revisão pendente; 12 skills.**

**Evidência local:** [Nova](../../agents/nova.md), [Echo](../../agents/echo.md), [plano de game art](../../openspec/changes/ui-focused-visual-workflow/specs/game-art-direction/spec.md).

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g24"></a>

### G24 — Conectores, comunicação e documentos

**Prioridade 3; revisão pendente; 16 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g25"></a>

### G25 — Operações de negócios e indústria

**Prioridade 4; revisão pendente; 8 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g26"></a>

### G26 — Finanças, pagamentos e blockchain

**Prioridade 4; revisão pendente; 10 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g27"></a>

### G27 — Saúde e dados clínicos

**Prioridade 4; revisão pendente; 5 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

<a id="g28"></a>

### G28 — Redes e homelab

**Prioridade 4; revisão pendente; 10 skills.**

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

**Decisões deste grupo:** ainda não registradas. Retomar por este inventário e pelas fontes citadas antes de propor mudanças.

## Achados de documentação a preservar

- **Corrigido no planejamento em 2026-11-09 — baseline da change visual:** [proposal.md](../../openspec/changes/ui-focused-visual-workflow/proposal.md) e [design](../../openspec/changes/ui-focused-visual-workflow/design.md) agora reconhecem as seis capacidades principais e distinguem a baseline histórica do working tree atual. As main specs são reutilizadas, não modificadas por essa correção.
- O [handoff histórico ECC](ecc-lessons-handoff.md) e a [auditoria de 2026-10-29](../../evals/audits/2026-10-29-ecc.json) são evidências de outros recortes/revisões, incluindo agentes e hooks. Não estender seus vereditos a este catálogo inteiro.

## Continuação em uma sessão por grupo

G01–G03 já foram revisados e seus V/L estão no planejamento visual; G04 foi classificado e adiado. Para os demais, começar pelo grupo escolhido, atualizar somente seu diagnóstico e decisões e deixar os outros pendentes. Uma decisão de aprofundar não aprova implementação, instalação ou publicação.

Prompt inicial sugerido:

```text
Vamos revisar o grupo G08 do handoff docs/plans/ecc-skills-knowledge-groups-handoff.md.
Leia primeiro o handoff e as fontes ECC fixadas nele; confira as fontes atuais do CanonKit e a change ui-focused-visual-workflow.
Para cada conhecimento relevante, separe já coberto, adotar, adaptar, adiar ou rejeitar, com evidência.
Atualize o diagnóstico e as tabelas desse grupo no handoff. Não implemente nem instale nada.
Apresente o menor delta necessário para decisão, preservando os donos e a proporcionalidade do CanonKit.
```

Trocar G08 pelo grupo desejado. Antes de continuar, verificar branch/HEAD/dirty state e se a evidência local mudou desde este inventário. Retomar G04 somente com demanda/plataforma para a futura change de stack packs; não incluir seus acréscimos automaticamente no apply visual.

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

Todas essas verificações alimentam as tarefas existentes 2.2 e 3.3; ownership e proporcionalidade ficam em 1.2/1.3. As classificações C/S/P/D e o L adiado de G04 permanecem nas tabelas dos grupos. “Suficiente no planejamento” não significa implementado, instalado ou eficácia medida. A validação documental da revisão e seu review ficam em [tasks.md](../../openspec/changes/ui-focused-visual-workflow/tasks.md), sem duplicar o registro de entrega.


