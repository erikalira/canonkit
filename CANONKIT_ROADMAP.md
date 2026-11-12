# CanonKit — Roadmap de Evolução

**Snapshot avaliado:** `canonkit` 1.1.3, branch `main`  
**Stack atual:** CanonKit + OpenSpec + Graphify  
**Objetivo:** reduzir custo/contexto, aumentar previsibilidade do roteamento e qualidade dos agentes, sem adicionar novas camadas antes de existir evidência de que elas são necessárias.

**Estado de implementação:** Fases 1, 2, 3, 4, 5, 6 e 7 concluídas. A Fase 2 preserva
`agent` / `model` / `effort`, acrescenta expectativas opcionais de dispatch e
mantém os checks anteriores. A Fase 3 expande o quality eval de 7 para 33 casos:
todos os 10 core têm cenário positivo, adversarial e LOW sem burocracia, com
calibração de respostas e rescore hermético. Runner e corpos dos agentes preservados.
A Fase 4 liga o bloco OpenSpec à skill `orchestrate`: estado durável no change
existente, owners conforme o risco, handoffs sem duplicação e fechamento após
aceite, revisões e drift resolvidos. Três casos de routing cobrem LOW/MEDIUM/HIGH.
A Fase 5 aplica a opção A: check de Git antes da evidência estrutural, refresh
para mudanças relevantes e aviso/fallback para arquivos atuais quando a freshness
não puder ser assegurada. Quatro casos de routing cobrem os principais desvios.
A Fase 6 torna hooks e merge driver opt-in via `--with-git-hooks`; o default
executa apenas `update .`, preserva automação existente e avisa sobre a migração.
Preflights e testes herméticos cobrem os dois modos; decisão, avaliação upstream
e migração estão na [ADR 0002](docs/adr/0002-graphify-git-hooks-opt-in.md).
A Fase 7 adiciona quatro quality evals e reutiliza o caso existente de factory:
os cinco cenários passaram em 15/15 execuções reais do Bob atual, após calibrar
vereditos equivalentes e corrigir o intervalo do fixture monetário. Nenhuma nova
instrução ou variante foi necessária; o corpus agora tem 37 casos.
Próxima fase: **Fase 8 — Gate quantitativo para Caveman / Shunt**.
O bloco P5 (Fases 11–15: signal-to-fix, feedback ↔ hipótese, evidência de
conclusão, cobertura por harness, latência e custo por tarefa) está planejado,
sem implementação.
Os casos de roteamento com modelo real continuam sendo uma medição manual paga;
o mesmo vale para os novos casos de qualidade. Os testes herméticos validam o
contrato dos evals, sem demonstrar comportamento dos modelos.

---

## 1. Princípios do roadmap

1. **Medir antes de otimizar.**  
   Caveman, Shunt, Ponytail ou qualquer outra camada só entram se métricas do próprio CanonKit mostrarem um gap concreto.

2. **CanonKit continua sendo a fonte de governança.**  
   - OpenSpec = estado durável da mudança/spec.
   - CanonKit = ownership, risco, roteamento, modelo, gates e revisão.
   - Graphify = evidência estrutural do código.

3. **Evitar duplicação de artefatos.**  
   Não criar um PRD, plano do Bob, documento paralelo e spec OpenSpec para representar a mesma decisão.

4. **Toda instrução permanente paga “instruction tax”.**  
   Uma nova regra de agente só deve entrar quando um eval demonstrar que o comportamento atual falha de forma relevante.

5. **Observabilidade sem conteúdo sensível.**  
   Medir tamanho, duração, contagens e metadados; não registrar prompts, resultados, código, paths completos ou segredos.

6. **Pequenos passos, cada um testável e reversível.**  
   Uma fase por vez. Nada de “big-bang refactor” do CanonKit.

---

# Prioridades

## P0 — fechar os maiores gaps de evidência

### Fase 1 — Telemetria de contexto do main thread

### Problema

Hoje o CanonKit mede muito bem os subagentes:

- modelo / effort;
- tokens;
- cache read/write;
- duração;
- quantidade de API calls;
- `report_chars`.

Mas ainda não responde:

> **o que está enchendo o contexto do agente principal?**

Sem isso, não dá para saber se o próximo problema é:

- `Read` de arquivos grandes;
- `Bash` / testes / logs;
- `Grep` / `Glob`;
- resultados de ferramentas;
- relatórios de subagentes;
- simplesmente uma sessão longa.

### Implementação proposta

Estender o hook de observabilidade para registrar **somente metadados quantitativos** de tool results do main thread.

Começar por:

- `Read`
- `Grep`
- `Glob`
- `Bash`
- `PowerShell`

Registrar algo conceitualmente assim:

```json
{
  "event": "tool_result",
  "tool": "Read",
  "chars": 28341,
  "lines": 812,
  "project": "foo",
  "session": "..."
}
```

Para `Bash` / `PowerShell`, não persistir o comando completo nem o output.

Se houver forma segura de distinguir stdout/stderr ou sucesso/falha sem armazenar conteúdo, registrar apenas:

```json
{
  "status": "success",
  "chars": 71042,
  "lines": 1804
}
```

### Dashboard

Adicionar uma seção:

```text
Context contributors
────────────────────────────
Read        381k chars   42%
Bash        247k chars   27%
Grep         91k chars   10%
Glob         18k chars    2%
Agents       76k chars    8%
Other       113k chars   11%
```

Idealmente mostrar:

- total por sessão;
- média por chamada;
- quantidade de chamadas;
- maior resultado individual;
- agrupamento por ferramenta.

### Segurança / privacidade

Não registrar:

- conteúdo;
- prompt;
- código;
- command line completa;
- secret;
- path completo.

Se path for útil para diagnóstico, preferir apenas categoria ou basename e somente se não expuser contexto sensível. A opção mais segura é não registrar path na primeira versão.

### Testes

Adicionar testes herméticos para:

- `PostToolUse(Read)`;
- `PostToolUse(Grep)`;
- `PostToolUse(Glob)`;
- `PostToolUse(Bash)`;
- `PostToolUse(PowerShell)`;
- output vazio;
- output gigantesco;
- payload inesperado;
- falha interna continua fail-open;
- nenhum conteúdo sensível aparece no JSONL.

### Critério de aceite

Ao final de uma sessão real, deve ser possível responder com números:

> “Qual ferramenta mais aumentou o contexto desta sessão?”

sem abrir ou armazenar o conteúdo retornado pelas ferramentas.

---

### Fase 2 — Fazer o routing eval validar `model` e `effort`

### Problema

O `eval-routing.mjs` mede corretamente **quem** foi chamado, mas ainda não mede se o dispatch usou o modelo e o effort planejados.

Hoje estes três dispatches podem parecer equivalentes para o eval:

```text
Gard / sonnet / medium
Gard / opus / high
Gard / haiku / low
```

Mas custo, latência e capacidade são diferentes.

### Implementação proposta

Alterar o parser de dispatch para guardar:

```json
{
  "agent": "gard",
  "model": "sonnet",
  "effort": "medium"
}
```

Em vez de guardar apenas:

```text
gard
```

Manter compatibilidade com os checks existentes de inclusão/exclusão.

Adicionar expectativas opcionais aos casos:

```json
{
  "dispatch": {
    "agent": "gard",
    "model": "sonnet",
    "effort": "medium"
  }
}
```

ou uma estrutura equivalente que seja simples de manter.

### Casos iniciais

Adicionar casos que comprovem:

- decisão estrutural / irreversível → modelo/effort “up”;
- revisão mecânica verificável → modelo/effort “down”;
- dispatch ad-hoc sem override continua herdando o frontmatter;
- LOW não cria dispatch desnecessário só para economizar com modelo barato;
- o eval não falha quando o runtime omite um campo que realmente não é enviado.

### Critério de aceite

O pipeline precisa distinguir:

```text
roteou para o agente certo
```

de:

```text
roteou para o agente certo com o nível de modelo errado
```

---

### Fase 3 — Expandir `quality evals`

### Problema

O quality eval atual é excelente como mecanismo, mas a cobertura ainda é pequena.

Cobertura atual mais importante:

- Gard
- Quinn
- Archie
- Pixie

Os agentes centrais de implementação/produto/operação ainda precisam de casos próprios.

### Ordem sugerida

#### Bob

Adicionar casos para provar que ele:

- corrige root cause, não só symptom;
- lê callers relevantes antes de corrigir um bug compartilhado;
- não cria abstração compartilhada para um único uso;
- preserva failure path;
- não “esconde” teste falhando;
- evita refactor sem ganho concreto.

#### Scott

Casos para provar que ele:

- separa problema de solução;
- identifica ausência de evidência;
- propõe o menor MVP;
- não exige cerimônia em LOW;
- não aceita scope creep sem justificativa.

#### Perry

Casos para provar que ele:

- rejeita performance claim sem medição;
- distingue dev build de production build;
- não afrouxa budget sem measured floor;
- reconhece complexidade que cresce com input;
- não transforma intuição em número.

#### Pipe

Casos para provar que ele:

- exige rollback viável;
- cobra observabilidade de mudança operacional relevante;
- distingue “deploy funciona” de “deploy é operável”;
- não executa operação destrutiva sem autorização;
- trata migration/runbook de forma proporcional ao risco.

#### Spencer

Casos para provar que ele:

- detecta documentação divergindo do código;
- não inventa decisão ausente;
- pede ADR somente quando a decisão é durável/estrutural;
- mantém documentação mínima suficiente.

#### Virgo

Casos para provar que ele:

- nunca edita installed copy como fonte de verdade;
- respeita o escopo source repo vs current project;
- roda as validações corretas antes de sugerir commit;
- não mexe em settings/credenciais fora da autorização.

### Depois

Expandir para specialists somente quando houver projetos reais usando-os:

- Maya
- Nova
- Echo
- Dana
- Iris

### Critério de aceite

Cada agente core deve ter ao menos:

- 1 caso positivo;
- 1 caso que tenta induzir comportamento incorreto;
- 1 caso LOW em que ele deve evitar burocracia.

---

# P1 — melhorar integração entre as três peças atuais

## Fase 4 — OpenSpec como artefato durável do change lifecycle

### Objetivo

Tornar explícita a relação:

```text
OpenSpec = state
CanonKit = governance
Graphify = code evidence
```

### Fluxo desejado

```text
OpenSpec change
      │
      ▼
classificar risco
      │
      ├── LOW ─────── trabalho inline quando possível
      │
      ├── MEDIUM ─── owners dos riscos nomeados
      │
      └── HIGH ───── owners obrigatórios
                         │
                         ▼
                        Bob
                         │
                         ▼
                 revisão necessária
                         │
                         ▼
             critérios de aceite satisfeitos?
                         │
                         ▼
          Spencer verifica drift documental
                         │
                         ▼
                OpenSpec atualizado/arquivado
```

### Regra principal

Não criar um artefato paralelo quando o OpenSpec já é o lugar correto.

Evitar:

```text
openspec/change
+
Scott PRD duplicado
+
Bob plan durável duplicado
+
Spencer spec paralela
```

### Implementação provável

Preferir mudanças pequenas em:

- `tools/openspec.md`;
- `skills/orchestrate/SKILL.md`;
- eventualmente `reference/agents-block.md`.

Não criar um novo agente.

Criar uma regra clara de handoff:

- Scott decide “o que precisa ser verdade”;
- Archie decide a estrutura quando necessário;
- Bob implementa;
- Quinn valida comportamento;
- Spencer garante que o estado durável ainda corresponde ao sistema.

### Critério de aceite

Dado um change OpenSpec MEDIUM/HIGH, o agente principal deve saber:

1. qual artefato é a fonte de verdade;
2. quais owners precisam participar;
3. onde registrar uma decisão durável;
4. quando o change pode ser considerado fechado.

---

## Fase 5 — Freshness explícita do Graphify

### Problema

O grafo pode estar correto para o último commit e incorreto para o working tree atual.

Depois de edits não commitados:

```text
graphify-out
   !=
working tree
```

### Objetivo

Nunca tratar um grafo stale como evidência atual sem perceber.

### Opções, da menor para a maior

#### Opção A — instrução + check leve

Antes de uma query estrutural relevante:

- verificar se o working tree está dirty;
- se estiver e a pergunta depender das mudanças atuais:
  - rodar `graphify update .`;
  - só então consultar o grafo.

#### Opção B — status no CanonKit

Futuramente:

```text
canonkit tool status graphify
```

poderia mostrar algo como:

```text
graph built at: <commit>
HEAD:           <commit>
working tree:   dirty
freshness:      stale for uncommitted changes
```

Só implementar se a opção A se mostrar insuficiente.

### Critério de aceite

Nenhuma decisão estrutural deve usar Graphify stale sem um aviso explícito.

---

## Fase 6 — Reavaliar o trust boundary dos hooks do Graphify

**Estado:** concluída em 2026-10-20. `npm test`: 182 aprovados, 1 ignorado por
limitação de symlink no Windows, nenhuma falha. `npm run validate`, checks de
sintaxe e `git diff --check` aprovados. Os testes usam Git real e binários de
ferramentas simulados; a avaliação upstream foi por inspeção de fonte.

### Problema

O próprio CanonKit já documenta um risco relevante:

- hooks Git / merge driver inicializam Python a partir do repositório;
- uma branch pode introduzir módulos que sombreiam imports;
- checkout/commit/merge pode executar código antes de revisão.

### Caminho sugerido

Avaliar se a UX deveria migrar de:

```bash
canonkit tool add graphify
```

com hooks automáticos

para algo conceitualmente como:

```bash
canonkit tool add graphify
```

sem hooks automáticos, e:

```bash
canonkit tool add graphify --with-git-hooks
```

quando o usuário explicitamente aceita o trust boundary.

Antes de alterar comportamento existente:

- revisar compatibilidade;
- documentar migração;
- avaliar se upstream corrigiu o problema;
- criar testes de preflight;
- não quebrar clones já configurados silenciosamente.

### Critério de aceite

O default do CanonKit não deve executar automaticamente código de branches não confiáveis sem que o risco seja explícito.

---

# P2 — melhorias condicionais

## Fase 7 — Testar a “solution ladder” antes de adicioná-la ao Bob

**Estado:** concluída em 2026-10-20, sem acrescentar a instrução ao Bob.
Validação: `npm test` com 183 aprovados, 1 ignorado por limitação de symlink no
Windows e nenhuma falha; `npm run validate`, sintaxe e `git diff --check` aprovados.

### Resultado medido

Baseline com o corpo de `agents/bob.md` do commit `0d96f26`, sem alterações,
Claude Code `2.1.302`, modelo do frontmatter `sonnet` resolvido pela CLI como
`claude-sonnet-5-5`. Três execuções por caso, `--budget 0.6`, plan mode e blocos
globais instalados, conforme o runner existente. Resultado após `--rescore`
com a calibração final do judge:

| Cenário | Caso | Execuções aprovadas |
|---|---|---|
| Date picker customizado vs campo nativo | `bob-native-date-input` | 3/3 |
| Formatter manual vs API nativa | `bob-native-formatter` | 3/3 |
| Helper duplicado vs existente | `bob-reuse-existing-helper` | 3/3 |
| Dependência nova para operação trivial | `bob-trivial-dependency` | 3/3 |
| Factory com uma implementação | `bob-single-use-abstraction` (reutilizado) | 3/3 |

O judge foi calibrado para aceitar rejeições equivalentes como “don't keep”,
“drop the change”, “dependency isn't justified” e restaurar o import compartilhado;
os testes continuam rejeitando aprovações que apenas citam as palavras certas.
O teto de 25 linhas foi preservado. A primeira versão do fixture monetário pedia
todos os centavos inteiros seguros, criando uma questão de precisão além do
objetivo do cenário; foi limitada a 0–1.000.000.000 centavos e medida novamente.
As três execuções preliminares foram preservadas separadamente (uma excedeu o
teto de linhas), sem entrar nos 15 resultados do fixture final.

Transcripts locais ignorados pelo Git: `.tmp/phase7/baseline/` e
`.tmp/phase7/preliminary-formatter/`. Custo reportado pela CLI: US$ 1,346236
na baseline final e US$ 0,247466 na preliminar, total de US$ 1,593702.
Para reproduzir, executar o primeiro comando abaixo para cada ID da tabela.
O segundo reavalia os transcripts salvos sem chamada paga:

```bash
node scripts/eval-quality.mjs --only bob-native-date-input --runs 3 --budget 0.6 --save .tmp/phase7/baseline
node scripts/eval-quality.mjs --only bob-native-date-input --rescore .tmp/phase7/baseline
```

**Decisão:** os cinco cenários sustentaram a solução mínima com o Bob atual.
Não houve falha de overengineering que justifique instrução permanente nem A/B
com `--variant`. Corpo do Bob e runners preservados. A medição é de revisão
read-only sob estes prompts, não prova implementação, correção universal ou
comportamento em outros modelos. Os outros casos da Fase 3 não foram medidos
novamente com modelo real nesta fase.

A maior parte da filosofia do Ponytail já existe em Bob/Archie/Scott.

O único pedaço que ainda pode valer explicitar é:

```text
antes de criar código:

1. já existe implementação equivalente no repo?
2. stdlib resolve?
3. recurso nativo da plataforma resolve?
4. dependência já instalada resolve?
5. implementação local simples resolve?
6. só então nova abstração/dependência
```

### Importante

**Não adicionar essa instrução imediatamente.**

Primeiro criar quality evals que tentem induzir overengineering:

- date picker customizado vs `<input type="date">`;
- formatter manual vs API nativa;
- helper duplicado vs helper já existente;
- dependência nova para algo trivial;
- interface/factory com uma única implementação.

Se Bob já escolher consistentemente a solução mínima, nenhuma regra nova é necessária.

Se falhar, adicionar a menor instrução possível e rodar A/B com `eval-quality --variant`.

### Critério de aceite

A nova instrução só entra se:

1. um eval falhar antes;
2. passar depois;
3. não piorar casos de segurança/correção;
4. justificar seu custo permanente de contexto.

---

# P3 — decidir se ferramentas externas ainda são necessárias

## Fase 8 — Gate quantitativo para Caveman / Shunt

Depois de acumular sessões reais com a Fase 1:

### Se o principal custo for `Read`

Exemplo:

```text
Read/Grep/Glob = parcela dominante do crescimento de contexto
```

e especialmente se houver full-file reads grandes e repetidos, fazer um **protótipo controlado do Shunt**.

Testar:

- mesmos tasks;
- com e sem bulk-reader;
- custo total, não apenas tokens do modelo principal;
- latência;
- qualidade;
- quantidade de re-reads;
- falhas em debugging/refactor.

Não adotar apenas porque o benchmark do Spotify mostra ~90% no cenário deles.

---

### Se o principal custo for `Bash`, logs, JSON e test output

Primeiro melhorar `context-tune`.

Se ainda houver muito output imprevisível que não pode ser silenciado na origem, testar **Caveman proxy**.

Comparar:

- quantidade de contexto reduzida;
- recoverability;
- false negatives causados pela compressão;
- overhead;
- custo real por tarefa.

---

### Se o problema for sessão longa

Não adicionar nada.

O CanonKit já tem:

- medição do contexto atual;
- bandas de ~100k / 150k / 200k;
- recomendação de nova sessão;
- handoff;
- opening prompt pronto.

Ajustar bandas com evidência real antes de inventar outra solução.

---

### Ponytail

Não instalar como camada global por enquanto.

Se algum comportamento útil for confirmado por eval, incorporá-lo na menor instrução possível dentro do owner existente.

---

# P4 — maturação

## Fase 9 — Dashboard de eficiência por agente e por tipo de trabalho

Quando os dados anteriores estiverem estáveis, expandir o dashboard para permitir responder:

- qual agente mais consome tokens por dispatch?
- qual agente devolve relatórios maiores?
- qual combinação model/effort entrega melhor custo por decisão?
- quais agentes são chamados e quase nunca encontram blocker?
- quais tipos de tasks geram cold start sem ganho?
- quanto do contexto da sessão veio de tools vs subagents?

Evitar “score de agente” simplista.

Os números devem apoiar perguntas, não produzir ranking de vaidade.

---

## Fase 10 — período de freeze

Depois das fases P0/P1:

**não adicionar agentes, skills ou plugins por algumas semanas**, salvo bug ou risco.

Usar o sistema em projetos reais e coletar:

- dispatch rate;
- model/effort;
- tokens;
- duração;
- report size;
- tool-result volume;
- context growth;
- gates acionados;
- false positive / false negative percebidos.

Ao final, abrir uma revisão do CanonKit baseada em dados.

---

# P5 — evidência de resultado: do sinal à correção

As fases P0–P4 medem o custo e a qualidade do **trabalho dos agentes**. Este bloco
mede se esse trabalho **fecha o ciclo** nos projetos onde o CanonKit é usado: um
sinal real (alerta, erro, feedback) vira correção, a correção é comprovada e o
custo por entrega fica visível.

Regras do bloco:

- não criar agentes, skills ou documentos obrigatórios novos; usar Pipe, Dana,
  Scott, `orchestrate`, OpenSpec, `doctor` e a telemetria existente;
- toda instrução nova em agente segue o princípio 4: entra só com eval que
  mostre a falha atual;
- métricas de projeto vivem nas ferramentas do projeto (tracker, CI, deploy);
  o CanonKit define o contrato e a pergunta, não coleta dados de produção;
- Fases 11–13 alteram instruções; respeitar o freeze da Fase 10 se ele estiver
  em vigor.

| Ordem | Fase | Onde encaixar | Prioridade |
|---|---|---|---|
| 1 | 11 — Signal-to-fix | Pipe + Dana, por projeto | Alta |
| 2 | 12 — Feedback vinculado à hipótese | Scott + Dana + Issues | Alta |
| 3 | 13 — Evidência de conclusão consolidada | `orchestrate` + OpenSpec | Alta |
| 4 | 14 — Cobertura técnica por harness | `doctor` + documentação | Média |
| 5 | 15 — Latência e custo por tarefa concluída | Telemetria existente | Média |

---

## Fase 11 — Definir e medir signal-to-fix

### Problema

Pipe já define alertas, metas de confiabilidade e error budget, e Dana já protege
a definição de métricas. Mas nenhum dos dois responde:

> **quanto tempo passa entre um sinal real de problema e a correção em produção?**

Sem isso, alertas podem disparar sem dono, e "corrigido" pode significar
"mergeado" em vez de "o sinal parou".

### Definição proposta

`signal-to-fix` = tempo entre o **primeiro sinal acionável** (alerta, erro
agrupado, issue de usuário) e o **deploy da correção confirmado pelo
desaparecimento ou redução do sinal**.

Pipe é dono de:

- quais fontes contam como sinal e onde está o timestamp de cada uma;
- o que conta como "correção entregue" (deploy, não merge);
- como confirmar que o sinal parou.

Dana é dona de:

- denominador e janela (por exemplo, sinais de severidade X nos últimos 30 dias);
- estatística (mediana e p90, não média);
- exclusões explícitas (sinais descartados, duplicados, falsos positivos);
- o que **não** pode ser concluído com a instrumentação existente.

### Implementação provável

- critério curto em `agents/pipe.md`: um alerta sem caminho até uma correção
  medível não está pronto;
- critério curto em `agents/dana.md`: signal-to-fix precisa de definição de
  início, fim, janela e exclusões antes de ser comparado;
- quality evals: Pipe recusando "alerta configurado" como prontidão quando
  ninguém consegue medir o fechamento; Dana rejeitando uma média sem janela;
  caso LOW sem burocracia (projeto sem produção não ganha métrica).

### Critério de aceite

- definição escrita uma vez, sem duplicar entre Pipe e Dana;
- evals novos falham sem a instrução e passam com ela;
- nenhum projeto sem usuários ou produção recebe a exigência.

---

## Fase 12 — Capturar feedback real e vinculá-lo à hipótese de produto

### Problema

Scott já distingue evidência de hipótese e define o sinal para revisitar uma
decisão; Dana já exige que todo evento sirva a uma hipótese. Falta o elo
operacional: o feedback real chega como issue solta e não volta para a hipótese
que deveria confirmar ou derrubar.

### Fluxo desejado

```text
Scott registra a hipótese (no change OpenSpec ou na decisão existente)
→ Dana define o sinal quantitativo que a testa, quando houver volume
→ feedback qualitativo chega como issue com referência à hipótese
→ Scott revisita: confirmada, refutada ou ainda sem evidência
```

### Implementação provável

- convenção mínima de referência (label ou campo) ligando issue → hipótese,
  reutilizando o tracker do projeto; sem template novo obrigatório;
- Scott: ao revisitar uma decisão, citar o feedback vinculado e declarar o
  estado da hipótese;
- Dana: separar sinal quantitativo de relato qualitativo e não somar os dois;
- quality evals: Scott tratando um pedido de feature sem evidência externa como
  hipótese; Scott revisitando uma hipótese com feedback contraditório.

### Privacidade

Feedback pode conter PII. O vínculo guarda referência e resumo, não o texto
bruto do usuário; Gard revisa quando houver dado pessoal.

### Critério de aceite

- uma hipótese consegue listar o feedback que a afeta sem busca manual ampla;
- nenhum artefato novo obrigatório foi criado;
- evals de Scott cobrem os dois cenários acima.

---

## Fase 13 — Consolidar evidências de conclusão, sem novo documento obrigatório

### Problema

`orchestrate` já classifica a conclusão (VERIFIED / PARTIALLY VERIFIED /
UNVERIFIED) e a Fase 4 já usa o change OpenSpec como estado durável. Mesmo
assim, a evidência fica espalhada entre relatório final, `tasks.md`, saídas de
teste e revisões, e pode divergir.

### Regra principal

**A evidência de conclusão mora em um único lugar já existente:**

- com change OpenSpec: o próprio change (`tasks.md`), com estado de
  verificação, comandos executados, resultados, critérios sem evidência e
  revisão/estado de Git em que a evidência foi produzida;
- sem change OpenSpec (LOW): o relatório final, como hoje.

O relatório final referencia essa evidência em vez de reescrevê-la.

### Implementação provável

- ajuste pequeno em `skills/orchestrate/SKILL.md` (seções de evidence-based
  completion e OpenSpec lifecycle), sem template novo;
- archive só depois de VERIFIED ou de pendências explicitamente aceitas;
- routing/quality cases: change marcado como concluído com evidência apenas no
  relatório; evidência obsoleta após nova edição; caso LOW sem OpenSpec.

### Critério de aceite

- nenhum documento novo obrigatório;
- relatório e change não podem divergir sobre o estado de conclusão;
- evidência obsoleta é detectada ou rebaixada para PARTIALLY VERIFIED.

---

## Fase 14 — Explicitar a cobertura técnica por harness

### Problema

O CanonKit instala para Claude Code, Codex, OpenCode e Copilot, mas a cobertura
não é igual: em alguns harnesses gates viram texto, e Stop gate, lembrete de
contexto ou telemetria podem não existir. Hoje isso está em comentários dos hooks
e espalhado no README; o `doctor` não mostra.

### Implementação provável

- matriz única em `docs/` (por exemplo `docs/harness-coverage.md`):
  capacidade × harness, com valores `enforced`, `advisory`, `ausente`;
  capacidades mínimas: gates de segurança, Stop gate / Definition of Done,
  lembrete de contexto, telemetria de dispatch, telemetria de tool results,
  access levels, seleção de modelo/effort, skills;
- `doctor` exibe, para os harnesses instalados, as capacidades `advisory` e
  `ausente`, com link para a matriz;
- teste hermético garantindo que a matriz e o `doctor` usam a mesma fonte (sem
  duas listas que divergem).

### Critério de aceite

- um usuário de Codex/OpenCode/Copilot sabe pelo `doctor` o que **não** está
  protegido;
- adicionar uma capacidade nova exige atualizar uma única fonte.

---

## Fase 15 — Medir latência da interação e custo por tarefa concluída

### Problema

A telemetria mede duração e tokens por dispatch, mas não:

- quanto tempo o usuário espera por turno;
- quanto custa uma tarefa **concluída**, que é a unidade que importa.

`docs/telemetry.md` já declara que custo financeiro não é calculado sem preços
verificados; esta fase mantém essa regra.

### Implementação provável

- latência da interação: tempo entre `UserPromptSubmit` e `Stop` no mesmo turno,
  reaproveitando eventos já tratados pelo hook; apenas números;
- custo por tarefa concluída: somar tokens (e dispatches, duração) da sessão
  até um fechamento VERIFIED da Fase 13; custo em dinheiro só com tabela de
  preços versionada e verificada; caso contrário, reportar tokens;
- dashboard: distribuição (mediana / p90), sem ranking de agente, alinhado à
  Fase 9;
- tarefas não concluídas aparecem como contagem separada, nunca descartadas
  silenciosamente.

### Segurança / privacidade

Mesmas regras da Fase 1: nenhum prompt, resultado, código ou path completo.

### Critério de aceite

- testes herméticos com payloads de `UserPromptSubmit`/`Stop` incompletos,
  fora de ordem e fail-open;
- compatibilidade com eventos antigos do dashboard;
- "custo" nunca aparece em moeda sem fonte de preço verificada.

---

# P6 — Live Development Observatory

**Status em 2026-11-12:** Execution Graph implementado nesta worktree para eventos locais de Claude Code, com build e testes automatizados aprovados. Entrega **parcial** em relação ao pedido completo: identidade confiável de projeto/worktree/branch, integração de artefatos OpenSpec/Graphify, validação visual/acessível em navegador e observação de uma sessão real continuam pendentes. Codex, OpenCode e Copilot ainda não têm adaptadores equivalentes. O Agent Office 2D/3D é roadmap, não implementação.

## Princípios e contrato

- Uma fonte normalizada de observações para grafo, timeline e futuras visualizações; React Flow e qualquer escritório são apenas apresentação.
- CanonKit continua dono da governança e dos gates; OpenSpec dos changes/specs; Graphify da evidência estrutural; runtimes dos eventos de execução.
- Só afirmar atividade, identidade, relação, classificação, aprovação ou conclusão quando existir evidência observável e correlacionável.
- Não correlacionar homônimos por basename de cwd. Identificadores indisponíveis permanecem `unknown`/`null` até surgir fonte estável autorizada.
- Sem chaves pagas, chamadas extras de modelo, sessões espelho, analytics externos ou automação de gates.
- Manter o servidor local no loopback, polling proporcional, logs sem prompts/transcrições e empacotamento independente do CLI.

## Estado atual — Execution Graph (implementado parcialmente)

- Projeção versionada `/execution.json` dos eventos Claude Code suportados atualmente: `prompt`, `gate`, `agent_start`, `agent_launch`, `agent_end`, `agent_stop`, `agent_resume`.
- Agregação por session + dispatch ID real; eventos sem ID estável continuam sem ID inventado. Medidas cumulativas mais recentes substituem anteriores, inclusive por ausência; paralelismo depende de intervalos observados sobrepostos.
- Gates expõem observação e decisão separadamente. Dispatch encerrado não implica sucesso; início não prova escrita de código; review/approval e workflow permanecem desconhecidos sem evidência explícita.
- UI React Flow com canvas, minimap, controles, layout explícito, inspector e timeline filtrável. A navegação temporal foca o nó correlacionável. Grafo observado e rotas de referência LOW/MEDIUM/HIGH ficam em visualizações distintas; rotas de referência não provam caminho executado.
- `/activity.html` e endpoints legados preservados; stale snapshot informa desconexão e tenta reconectar. A instalação inclui frontend compilado, sem dependências frontend no runtime normal do CLI.
- Segurança implementada no servidor local: Host/Origin loopback, sem CORS, arquivos estáticos confinados, CSP, `frame-ancestors`, `nosniff` e sem rotas de execução.
- Evidência registrada no change OpenSpec `openspec/changes/live-development-observatory/`: typecheck/build, suíte completa (1042 total, 1021 passou, 21 ignorados, 0 falhou), package dry-run (71 arquivos), diff check e Graphify update passaram. `npm audit` não foi verificado por DNS `EAI_AGAIN`; navegador, acessibilidade e sessão real não foram verificados.

## Fase P6.1 — Fechar lacunas do Execution Graph

1. Verificar a UI compilada em navegador: legibilidade do canvas e nós, responsividade, teclado, foco, leitores de tela e movimentos/redução de movimento. Registrar ambientes e corrigir problemas observados sem depender de inspeção visual paga.
2. Validar com uma sessão Claude Code já existente, sem iniciar agentes nem criar telemetria adicional; comparar o que aparece com eventos efetivamente retidos.
3. Investigar uma fonte estável para project/worktree/branch/session. Especificar correlação para worktrees simultâneas e projetos homônimos; se o runtime não fornecer identidade, manter as dimensões desconhecidas.
4. Acrescentar marcos de workflow, classificação e verificação apenas quando artifacts/events tiverem identificadores e evidência suficientes. Cobrir ausência, duplicatas, rotação, eventos fora de ordem e associação ambígua.
5. Ligar OpenSpec/Graphify a sessões somente quando a correlação for comprovada; mostrar existência, origem e freshness separadamente. Não inicializar, validar, sincronizar, arquivar ou atualizar esses sistemas automaticamente pelo polling.
6. Medir preservação de viewport/seleção em mudanças apenas de status e em mudanças estruturais; manter layout explícito e não oscilar em polling.

**Gate de saída:** aceite demonstrado por sessão real e testes determinísticos de UI/modelo; incógnitas permanecem nomeadas e não inferidas. Revisar contratos e UX se novos identificadores ou relações se tornarem públicos.

## Fase P6.2 — Observabilidade multi-runtime

Investigar, em mudanças separadas, interfaces oficiais ou estáveis para Codex, OpenCode, GitHub Copilot e runtimes adicionais. Para cada adapter, documentar disponibilidade de session/dispatch/agent IDs, lifecycle, retenção, duplicatas, ordenação, privacidade, worktree identity e limitações no VS Code. Reutilizar o read model versionado, sem alegar cobertura além do sinal testado. Não iniciar CLI/session paralela para espelhar editor, não acessar estado privado de extensões e não exigir API paga.

**Gate de saída:** adapter só é suportado quando houver fonte sustentável, fixtures reais anonimizadas/locais, testes de correlação e documentação de lacunas; “unknown” continua comportamento válido.

## Fase P6.3 — Agent Office 2D (opcional)

Desenhar primeiro uma visualização 2D de pixel art inspirada em escritórios de agentes, sem copiar código, personagens ou assets. Separar identidade estável do agente, processo/dispatch e execução atual: um nome de agente pode ter múltiplos dispatches e sessões. Mesas, salas e personagens devem mapear apenas presença observada; working/waiting/blocked/finished/unknown são categorias de apresentação, não atividades específicas como “escrevendo código”. Alertas de atenção dependem de evento explícito. Clique abre evidência da mesma sessão/dispatch no inspector.

Construir protótipo leve e opcional, com assets originais ou licenças verificadas, navegação por teclado, alternativa textual equivalente, suporte a movimento reduzido e desempenho medido com múltiplas sessões/worktrees. O escritório não altera o Execution Graph nem cria segunda API/estado; ambos consomem o mesmo snapshot. Animações decorativas são claramente distintas de telemetria.

**Gate de saída:** protótipo avaliado contra o grafo em clareza, acessibilidade, custo de manutenção e carga de CPU/memória; só então decidir se vale implementar.

## Fase P6.4 — Estudo Agent Office 3D

Somente após evidência de valor do modelo 2D, avaliar Three.js, React Three Fiber ou alternativas. Comparar custo de manutenção, tamanho de bundle, consumo GPU/CPU, acessibilidade, fallback sem WebGL, interação e escala de entidades. Prototipar sem compromisso com engine. Representar salas/projetos/agentes com as mesmas limitações de identidade e presença do modelo compartilhado; nunca fabricar atividade para preencher animação.

**Gate de saída:** decisão registrada com medições comparativas; manter apenas 2D/grafo é resultado válido. Não adicionar dependência 3D ao CLI nem tornar a visualização padrão sem decisão explícita.

## Fase P6.5 — Replay e análise histórica (condicional)

Após política explícita de retenção, investigar replay baseado estritamente em eventos retidos: navegação temporal, reprodução das transições observadas e eventualmente comparação de execuções. Gaps de retenção/rotação devem aparecer como lacunas, nunca ser reconstruídos como fato. Métricas candidatas: duração por etapa, espera e retrabalho apenas quando eventos definirem esses intervalos; tokens por dispatch quando medidos. Não inferir qualidade a partir de consumo de tokens.

**Gate de saída:** metodologia, privacidade e custo definidos; nenhuma métrica entra como indicador de qualidade sem validação própria. Custo financeiro só pode ser mostrado com preços atuais e entradas completas, identificando estimativa.

## Fase P6.6 — Interações controladas (fora do MVP)

Avaliar em change separado, após análise de abuso e autorização, ações de conveniência como abrir a sessão/runtime correspondente, navegar a um change ou diff e abrir um PR. Responder aprovações, executar comandos, deploy ou alterar permissões permanece fora do escopo até integração oficial, fronteira de segurança, confirmação explícita e revisão independente. Nunca contornar permissões do runtime ou do sistema operacional.

**Gate de saída:** contrato de ação explícito, autorização por ação, validação de destino, proteção contra CSRF/DNS rebinding, auditoria sem conteúdo sensível, falha recuperável e revisão de segurança. Aprovação automática não é objetivo.

---

# Ordem recomendada de implementação

```text
1. Main-thread tool-result telemetry
2. Dashboard de context contributors
3. Routing eval com model + effort
4. Quality evals: Bob
5. Quality evals: Perry
6. Quality evals: Pipe
7. Quality evals: Scott
8. Quality evals: Spencer
9. Quality evals: Virgo
10. OpenSpec lifecycle bridge
11. Graphify freshness
12. Graphify trust-boundary decision
13. Overengineering evals para Bob
14. Só então avaliar solution ladder
15. Coletar dados reais
16. Decidir Caveman / Shunt com A/B
17. Freeze e revisão
18. Signal-to-fix (Pipe + Dana)
19. Feedback vinculado à hipótese (Scott + Dana + Issues)
20. Evidência de conclusão consolidada (orchestrate + OpenSpec)
21. Cobertura por harness (doctor + docs)
22. Latência e custo por tarefa concluída
```

---

# Definition of Done do roadmap

O roadmap pode ser considerado concluído quando:

- o CanonKit consegue medir quem está enchendo o contexto do main thread;
- routing eval valida agente + model + effort;
- todos os agentes core têm quality evals mínimos;
- OpenSpec tem um lifecycle explícito com os owners do CanonKit;
- Graphify nunca é tratado como fresh quando não é;
- o trust boundary dos hooks Git está deliberadamente decidido/documentado;
- qualquer nova instrução permanente foi justificada por eval;
- Caveman/Shunt foram rejeitados ou adotados com A/B real;
- houve um período de uso sem adicionar novas camadas;
- signal-to-fix tem definição única e evals em Pipe e Dana;
- feedback real consegue ser rastreado até a hipótese de produto que afeta;
- a evidência de conclusão mora em um único lugar existente;
- o `doctor` mostra o que cada harness instalado não protege;
- latência por turno e custo por tarefa concluída são medidos sem conteúdo sensível.

---

# Não objetivos

Este roadmap **não** pretende:

- criar mais agentes;
- transformar CanonKit em framework de workflow genérico;
- substituir OpenSpec;
- substituir Graphify;
- implementar compressão própria de LLM;
- criar um proxy de modelos;
- adicionar RAG/vector DB;
- centralizar todo contexto do projeto dentro do CanonKit;
- automatizar decisões de veto;
- maximizar número de hooks ou gates.

O objetivo é tornar o sistema atual **mais mensurável, previsível e econômico**.

---

# Prompt para começar a implementar

Copie o prompt abaixo em uma **nova sessão** dentro do repositório `agent-team-config`.

```text
Quero começar a implementar o roadmap de evolução do CanonKit.

Contexto:
- Repositório: erikalira/agent-team-config.
- Stack atual: CanonKit + OpenSpec + Graphify.
- O roadmap está em CANONKIT_ROADMAP.md.
- CanonKit continua sendo a fonte de governança; OpenSpec é o estado durável das mudanças e Graphify é evidência estrutural.
- Não quero adicionar Caveman, Shunt, Ponytail ou novos agentes agora.
- Trabalhe incrementalmente e não implemente várias fases de uma vez.

Leia primeiro:
1. CANONKIT_ROADMAP.md
2. README.md
3. hooks/meu-time-hook.js
4. dashboard/
5. test/meu-time-hook.test.js
6. skills/orchestrate/SKILL.md
7. scripts/eval-routing.mjs
8. scripts/eval-quality.mjs

Use Graphify para entender a estrutura antes de fazer uma varredura ampla de arquivos. Se o working tree estiver dirty e a consulta depender de alterações não commitadas, atualize o grafo antes de confiar nele.

Comece SOMENTE pela Fase 1 do roadmap: telemetria de contexto do main thread.

Objetivo da Fase 1:
- medir o tamanho dos resultados de Read, Grep, Glob, Bash e PowerShell;
- registrar apenas metadados quantitativos;
- nunca persistir conteúdo, prompt, código, command line completa, secrets ou paths completos;
- manter o hook fail-open;
- preservar todo comportamento atual de gates e métricas de subagentes;
- adicionar testes herméticos;
- adicionar ao dashboard uma visão de “Context contributors”.

Antes de editar:
- confirme a source of truth e não altere cópias instaladas;
- classifique o risco da mudança;
- identifique os arquivos mínimos que precisam mudar;
- explique em poucas linhas o desenho proposto e os dados que serão registrados;
- verifique o contrato real dos payloads de PostToolUse em vez de assumir campos inexistentes;
- reutilize helpers existentes antes de criar abstrações novas.

Restrições:
- não registrar conteúdo dos tool results;
- não aumentar o log com eventos redundantes;
- não quebrar compatibilidade com eventos antigos do dashboard;
- não mudar as bandas de contexto nesta fase;
- não mexer em OpenSpec/Graphify/routing eval ainda;
- não instalar dependências novas sem necessidade comprovada;
- não fazer commit ou push sem minha autorização.

Validação mínima:
- npm test
- npm run validate
- node --check hooks/meu-time-hook.js
- testes novos cobrindo Read/Grep/Glob/Bash/PowerShell, output vazio, payload inesperado e fail-open
- confirmar que nenhum teste persiste conteúdo sensível nos eventos
- revisar o diff final por escopo e overengineering

Ao terminar:
1. diga exatamente o que foi implementado;
2. mostre os eventos novos e sua forma sem usar conteúdo real;
3. liste os testes executados e resultados;
4. diga qualquer limitação do contrato de PostToolUse encontrada;
5. diga se a Fase 1 está pronta ou se existe blocker;
6. NÃO comece a Fase 2 sem minha autorização.
```

---

# Prompt curto para continuar cada fase

Depois da Fase 1, uma sessão nova pode começar com:

```text
Continue o roadmap em CANONKIT_ROADMAP.md.

A fase anterior está concluída. Leia o estado atual do repositório e implemente SOMENTE a próxima fase ainda não concluída.

Antes de editar:
- confirme qual fase é a próxima;
- use os evals/testes existentes como contrato;
- mantenha a menor solução suficiente;
- não crie novo agente ou plugin;
- não duplique artefatos do OpenSpec;
- não faça commit/push sem autorização.

Ao terminar, valide, reporte resultados e pare antes da fase seguinte.
```
