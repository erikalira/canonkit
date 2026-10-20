# CanonKit — Roadmap de Evolução

**Snapshot avaliado:** `canonkit` 1.1.3, branch `main`  
**Stack atual:** CanonKit + OpenSpec + Graphify  
**Objetivo:** reduzir custo/contexto, aumentar previsibilidade do roteamento e qualidade dos agentes, sem adicionar novas camadas antes de existir evidência de que elas são necessárias.

**Estado de implementação:** Fases 1, 2, 3 e 4 concluídas. A Fase 2 preserva
`agent` / `model` / `effort`, acrescenta expectativas opcionais de dispatch e
mantém os checks anteriores. A Fase 3 expande o quality eval de 7 para 33 casos:
todos os 10 core têm cenário positivo, adversarial e LOW sem burocracia, com
calibração de respostas e rescore hermético. Runner e corpos dos agentes preservados.
A Fase 4 liga o bloco OpenSpec à skill `orchestrate`: estado durável no change
existente, owners conforme o risco, handoffs sem duplicação e fechamento após
aceite, revisões e drift resolvidos. Três casos de routing cobrem LOW/MEDIUM/HIGH.
Próxima fase: **Fase 5 — Freshness explícita do Graphify**.
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
- houve um período de uso sem adicionar novas camadas.

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
