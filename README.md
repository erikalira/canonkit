# canonkit

Versioned source for the agent team used with Claude Code and Codex. Published
on npm as `canonkit`; the repository is `agent-team-config`.

Each agent is a single Markdown file in `agents/`, stored in exactly the format
the runtime reads. Installing is a copy — there is no generation step and
nothing to reconcile by hand.

```bash
npx canonkit install
```

> **canonkit 1.0 is not canonkit 0.x.** Versions up to `0.2.0` were a different
> tool: a generator that installed Spec-Kit-style governance templates
> (`.specify/`, constitution, gates, scale profiles) into a project, driven by
> `canonkit init`. That tool is archived and none of its commands exist here.
> The name carried over; the program did not. Pin `canonkit@0.2.0` if you were
> using it.

## Agents

O time tem duas camadas. A diferença não é de importância — é de quando o agente
entra.

A diferença entre elas não é só conceitual — é **onde cada uma é instalada**.
Core vai para o usuário e existe em todo projeto; specialist só existe num
projeto se alguém o copiou para lá. A ausência é o mecanismo: um agente que não
está instalado não pode ser acionado por completude.

### Core Team

Instalado no usuário (`~/.agents` e `~/.claude/agents`) por
`scripts/install.sh` no Linux/macOS ou `scripts/install.ps1` no Windows.
Disponível para qualquer mudança, em qualquer projeto.

| Agent | Role |
| --- | --- |
| `scott` | Produto — escopo, critérios de aceite, métricas |
| `archie` | Arquitetura — fronteiras, contratos, trade-offs, risco de overengineering |
| `bob` | Engenharia — implementação, debugging, refactor |
| `quinn` | Qualidade — estratégia de teste, cobertura, risco de regressão |
| `gard` | Segurança — auth, secrets, exposição de serviço |
| `pixie` | UX — fluxos, estados de UI, acessibilidade, microcopy |
| `perry` | Performance — budgets medidos, método de medição, velocidade percebida, regressão |
| `pipe` | DevOps — CI/CD, Docker, deploy readiness, observabilidade, rollback |
| `spencer` | Documentação — ADRs, specs, runbooks, release notes |
| `virgo` | Maintainer — configuração de agentes |

### Domain Specialists

**Não instalados por padrão.** Ficam versionados aqui e são copiados para
`.claude/agents/` do projeto que precisa deles. Não participam de toda mudança, e
a ausência deles não é um gap: é o estado normal de um projeto que não tem aquele
domínio.

| Agent | Role | Instale quando |
| --- | --- | --- |
| `maya` | Game Design / Game Feel — core loop, progressão, pacing, recompensa, dificuldade, balance, economia como sistema de jogo, playtest | existe gameplay ou gamification relevante |
| `nova` | Visual / Art Direction — identidade visual, palette, composição, silhueta, luz, materiais, VFX language, mood | existe identidade ou linguagem visual em jogo |
| `echo` | Audio / Sound Design — identidade sonora, paleta de som, hierarquia de mixagem, SFX como feedback, música adaptativa, silêncio | existe som que carrega significado ou identidade |
| `dana` | Data / Analytics / Experimentation — event taxonomy, telemetry schemas, funis, cohorts, retenção, A/B testing, guardrails | existem usuários reais, telemetria, experimentos, funis, retenção ou volume de eventos |
| `iris` | ML / Visão Computacional — modelo, dataset, avaliação, confiança, rastreabilidade | existe extração de dados não estruturados ou predição |

Um specialist entra quando o domínio dele está em jogo, não por completude. Puxar
Nova para uma mudança sem superfície visual, ou Dana para uma mudança sem decisão
apoiada em dado, é burocracia — exatamente o que a separação existe para evitar.

Fronteiras que costumam confundir:

- **Scott define o que significa sucesso; Dana define como medir isso corretamente.**
- **Pixie decide se a interface é compreensível e acessível; Nova decide se ela é
  coerente e reconhecível.** Estética nunca passa por cima de acessibilidade.
- **Maya decide se um estado deve existir e o que ele precisa comunicar; Nova
  decide como ele aparece; Echo decide como ele soa.**
- **Dana é dona de analytics de produto; Pipe é dono de observabilidade
  operacional e de tudo que roda em produção.**
- **Pipe é dono de o sistema estar de pé e observável; Perry é dono de ele estar
  rápido o suficiente para uma pessoa.** Pixie é dona do que o usuário vê; Perry,
  do que o usuário espera. Só Perry afrouxa um budget de performance.

## Install

### Core, no usuário

Sem clonar nada:

```bash
npx canonkit install
```

Roda igual em Linux, macOS e Windows: o instalador é Node puro, sem nenhuma
dependência. Um instalador que roda **antes** de você confiar no repositório não
deveria pedir que você confie numa árvore de dependências primeiro.

De um clone, os scripts continuam valendo — são wrappers do mesmo `bin/cli.js`:

```bash
./scripts/install.sh          # Linux e macOS
.\scripts\install.ps1         # Windows
```

Copia os 10 agentes core para os dois caminhos de runtime:

- `~/.agents`
- `~/.claude/agents`

Ambos são lidos pelo Claude Code. O instalador mantém os dois idênticos, que é o
que impede a divergência entre eles. Em seguida sincroniza os blocos de
referência globais (`--no-reference` pula esse passo).

O split core/specialist é declarado no **frontmatter de cada agente** (`tier:`),
ao lado de `name` e `model` — que é onde o runtime já lê os outros fatos sobre o
agente. Antes era uma lista literal repetida em três instaladores, e manter as
três honestas custava uma seção inteira do `validate.sh`. Um arquivo novo em
`agents/` sem `tier` válido não instala: falha, em vez de assumir um padrão — os
dois padrões possíveis estão errados, um instala o agente em todo lugar e o
outro o esconde.

Os instaladores também **removem** specialists que tenham sobrado no nível de
usuário de instalações anteriores; uma cópia esquecida ali fica disponível em
todo projeto e anula a regra. Só nomes que este repo é dono são tocados.

### Hooks

O bloco de roteamento promete gates `[ENFORCED]`: confirmação em `git commit`,
bloqueio de segredos, e o gate de definition-of-done no `Stop`. Esses gates só
existem enquanto `~/.claude/hooks/meu-time-hook.js` está no disco **e** é
referenciado pelo `settings.json`. O `install` copia o arquivo; o registro no
`settings.json` ele apenas **reporta**, com o JSON pronto para colar.

A divisão é deliberada. O `settings.json` é seu — carrega permissões, env e
escolha de modelo que este instalador não tem por que reescrever. Já um hook no
disco que nenhum evento referencia não faz nada e não reclama, que é o pior modo
de falha possível para um gate: todo mundo segue acreditando que ele roda.

O hook **falha aberto** — `main()` é envolvido num `catch` que sai com 0, então
um erro de sintaxe nunca trava sua sessão. Ele apenas desliga todos os gates, em
silêncio. Por isso o `validate.sh` roda `node --check` em cada `hooks/*.js`.

Editar esse arquivo no lugar sempre foi o único fluxo que ele teve, e foi assim
que ele passou a existir numa cópia só, numa máquina só. Versioná-lo inverte a
fonte de verdade, então o instalador protege o caso: se a cópia instalada
divergir da do repo, ela é preservada como `meu-time-hook.js.local.bak` antes de
ser sobrescrita.

O registro é conferido **por evento**: `PreToolUse`, `PostToolUse` (matcher
`Agent|Task`), `SubagentStop`, `UserPromptSubmit` e `Stop`. Um hook ligado a parte
deles funciona pela metade — os gates disparam, então ninguém procura as métricas
de despacho que nunca são gravadas.

### Métricas de despacho e dashboard

Cada despacho de subagente vira duas linhas em
`~/.claude/meu-time-activity/events.jsonl`, ligadas pelo `id` (o `tool_use_id`):
`agent_start` (agente, descrição, `model`, `effort`; vazio = herdou o padrão) e
`agent_end` (modelo resolvido, duração, tokens de entrada / saída / cache read /
cache write e número de chamadas de API). Só números e metadados — nunca o texto
do prompt nem do resultado.

Os tokens são **somados do transcript do subagente**, não lidos do payload do
hook: o `usage` que o `PostToolUse` entrega descreve só a última chamada de API
(≈ tamanho final do contexto) e subestima justamente os despachos de muitas
voltas. Num despacho em background (o padrão), o `PostToolUse` chega no
lançamento, sem números, e o `agent_end` é gravado no `SubagentStop`. Se o
transcript não puder ser lido, `tokens` fica `null` — nunca estimado.

O `install` copia o dashboard para `~/.claude/meu-time-dashboard/`. Rode
`node ~/.claude/meu-time-dashboard/serve.js` e abra `http://localhost:4317`: além
da timeline, ele agrupa os despachos por (modelo, effort) e por agente, com número
de despachos, tokens médios e duração média.

### Codex

O mesmo core também vai para `~/.codex/agents/<nome>.toml`, no formato de custom
agent que o Codex lê: `name`, `description`, `developer_instructions`, mais
`model` e `model_reasoning_effort`. As instruções são o corpo do mesmo
`agents/<nome>.md` — não existe uma segunda cópia editável. Antes disso, a única
coisa que este repo conseguia contar ao Codex era o roster em prosa no
`AGENTS.md`, que descreve o time mas não consegue acionar ninguém.

O `model` do frontmatter diz o quanto o trabalho *normal* daquele agente exige,
no eixo do Claude. O Codex tem eixo próprio, então a intenção atravessa por um
mapa declarado — e não por um segundo campo de modelo em cada agente, que seriam
mais quinze linhas para manter em sincronia e mais uma coisa para divergir:

| frontmatter | Codex | reasoning effort |
| --- | --- | --- |
| `opus` | `gpt-5.6` | `high` |
| `sonnet` | `gpt-5.6` | `medium` |
| `haiku` | `gpt-5.6-luna` | `low` |

Todo agente deste time é agente de julgamento, não scanner otimizado para
velocidade — por isso os modelos rápidos ficam no fim do mapa e nada seleciona
`gpt-5.6-luna` hoje.

Seus próprios custom agents do Codex vivem no mesmo diretório e não são da conta
do instalador. A única coisa que ele comenta é mais estreita: um arquivo que
parece **cópia antiga de um agente que este repo é dono**, num formato que o
Codex não carrega dali — o que deixa uma segunda versão divergente daquele agente
solta. Reportado, nunca removido: o nome não é um que o repo reivindica, então
apagar não é decisão de instalador.

Scaffolding (`.gitignore`, `.github/`), diretórios e agentes seus não geram
aviso. Um aviso que dispara em `.gitignore` ensina você a ignorar avisos.

### Comandos

| Comando | O que faz |
| --- | --- |
| `install` | core no usuário + hooks + dashboard + blocos de referência globais |
| `install --no-reference` | só os agentes, os hooks e o dashboard |
| `reference` | só os blocos globais |
| `add <nome>...` | specialists no projeto atual |
| `remove <nome>...` | remove specialists do projeto atual |
| `list` | o roster e o que está instalado onde |

`--dry-run` funciona em todos: relata o que mudaria sem escrever nada.

### Specialists, por projeto

Rodado **de dentro do projeto** que vai receber os agentes:

```bash
cd ~/meu-projeto
npx canonkit add maya nova
```

Escolher quais specialists o projeto tem continua sendo decisão explícita sua —
o instalador só cuida do que é fácil esquecer. **Três** destinos precisam saber
do agente, e esquecer um deles é a falha que ele existe para evitar:

- **Claude Code** lê `.claude/agents/<nome>.md`
- **Codex** lê `.codex/agents/<nome>.toml` — ele não olha `.claude/agents/`
- **o `AGENTS.md` do projeto** é o que diz ao agente principal *quando* acionar
  cada um; sem ele o subagente existe e ninguém o chama

Os três são escritos num passo só. O bloco do `AGENTS.md` é reconstruído a partir
do que está de fato em disco, então ele sempre reflete a realidade e não o
histórico de comandos.

```bash
npx canonkit list            # o que este projeto tem instalado
npx canonkit remove nova     # remove o arquivo e a entrada
```

A descrição de uma linha que vai para o `AGENTS.md` do projeto é lida do próprio
`reference/agents-block.md`, não de uma segunda lista dentro do instalador — a
frase final "Aciona quando ..." fica no roster, porque é orientação para
escolher um agente e não descrição de um.

Removendo o último specialist, o bloco inteiro sai do `AGENTS.md`. Tudo fora dos
marcadores é preservado, e o script se recusa a rodar dentro do próprio
`agent-team-config` ou a instalar um agente core.

### Arquivos de referência globais

Já rodam junto com `install`. Standalone, para quando você editou um bloco sem
mexer em nenhum agente:

```bash
npx canonkit reference
```

Sincroniza **dois blocos**, porque dois runtimes leem coisas diferentes:

| Arquivo do repo | Vai para | Lido por | Conteúdo |
| --- | --- | --- | --- |
| `reference/agents-block.md` | `~/AGENTS.md` | Codex | quem existe e o que cada um é dono |
| `reference/routing-block.md` | `~/.claude/CLAUDE.md` | Claude Code | como o trabalho é despachado |

O roster é neutro de runtime. O bloco de roteamento fala de `subagent_type`, piso
de modelo, hooks e paralelismo — mecânica que não significa nada para o Codex, e
por isso não entra no `AGENTS.md`.

Os dois runtimes partem do mesmo roster sem que um arquivo importe o outro: o
Codex lê o `~/AGENTS.md` direto do disco, e o bloco de roteamento carrega a
própria tabela do time. O instalador **não** adiciona mais um import do
`AGENTS.md` ao `CLAUDE.md` — isso colocava o mesmo roster duas vezes no contexto
do Claude e não mudava nada para o Codex. Um import que você já tem é
preservado: o script só deixou de criar um novo.

Só o trecho entre os marcadores é gerenciado:

```markdown
<!-- agent-team-config:start -->        <!-- agent-team-config:routing:start -->
...agents-block.md...                   ...routing-block.md...
<!-- agent-team-config:end -->          <!-- agent-team-config:routing:end -->
```

Tudo fora dos marcadores é preservado. O script é idempotente e, na primeira
execução, substitui a seção escrita à mão em vez de duplicá-la — identificando-a
pelo próprio título do bloco, não por um regex passado à mão, porque um erro de
quoting ali duplica a seção em silêncio em vez de substituí-la.

O bloco de roteamento afirma coisas sobre os agentes — em que camada estão, quem
tem veto, quem roda em opus. São fatos guardados em outro lugar, então podem
divergir sem nada quebrar. É o `validate.sh` que faz isso quebrar.

## Validação

```bash
./scripts/validate.sh          # relatório completo
./scripts/validate.sh --quiet  # só falhas e o resumo
```

Read-only, sai com código diferente de zero em qualquer falha. Automatiza o
protocolo do Virgo e checa as convenções que este README promete:

- frontmatter — `name` bate com o nome do arquivo, `description` presente e útil,
  `model` e `tier` declarados e válidos;
- estrutura — Mission, Responsibilities, Collaboration, Expected Output, autoridade,
  fronteiras e LOW/MEDIUM/HIGH;
- a regra de veto — quem declara veto também diz o que fazer quando é rejeitado;
- o split core/specialist — todo agente declara `tier`, todos têm linha de resumo
  em `reference/agents-block.md`, o roster não lista nome sem arquivo, e as duas
  seções do roster batem com o `tier` declarado;
- o grafo de escalation — ninguém isolado, e ninguém escalando para um papel
  genérico ("the security owner") em vez de um agente nomeado;
- o bloco de roteamento — todo agente aparece nele, a divisão core/specialist bate
  com os instaladores, a coluna de autoridade bate com quem declara veto no próprio
  arquivo, e a regra de modelo bate com o frontmatter;
- o pacote npm — `bin/cli.js` compila, `files[]` inclui `agents/` e `reference/`
  (o CLI publicado os lê em runtime, e um clone sempre os tem — é o erro de
  empacotamento que rodar de um clone nunca pega), `bin` aponta para o arquivo
  certo, LICENSE existe;
- sintaxe dos scripts e higiene do repo.

Os testes são separados e rodam o CLI de verdade contra um filesystem de verdade,
num `HOME` descartável:

```bash
npm test
```

Sem mocks: a falha que este instalador pode de fato causar é escrever os bytes
errados num arquivo que você já tinha — `~/AGENTS.md`, `~/.claude/CLAUDE.md`, o
`AGENTS.md` de um projeto — e um filesystem mockado não prova nada sobre isso.

`scripts/` e `test/` não vão no pacote npm — o tarball leva só `bin/`, `agents/`,
`reference/`, README e LICENSE. Essas duas verificações são do clone.

Checa a regra, não uniformidade: `pipe` usa "Operational authority", `virgo` não
classifica risco de produto, e ambos passam.

## Editing an agent

1. Edite `agents/<name>.md` neste repo.
2. Se for core, rode `npx canonkit install` (ou o script do clone).
3. Se for specialist, rode `npx canonkit add <nome>` de novo nos
   projetos que o usam.
4. Rode `./scripts/validate.sh` e `npm test`.
5. Commit.

O passo de sincronizar os blocos globais saiu da lista porque `install` já faz.

Não edite `~/.agents`, `~/.claude/agents`, `.claude/agents/` de um projeto, nem o
bloco gerenciado do `~/AGENTS.md` — a próxima instalação sobrescreve. Este repo é
a única fonte de verdade.

## File format

```markdown
---
name: <agent-id>
description: "<one-line summary shown in the agent picker>"
tier: core | specialist
model: opus | sonnet | haiku
---

Você é <Nome>, agente de ... da equipe.

## Missão
...
```

The `name` must match the filename. The `description` is what the delegating
model reads when deciding whether the agent fits a request, so it should say
what the agent owns, not just its title. The `model` must be declared in the
file itself: stated anywhere else — a table, a note, a habit — it is an
intention, and the runtime quietly uses the session default instead. The `tier`
decides where the agent installs, and is read by every installer; it lives here
for the same reason the model does — a fact kept beside the thing it describes
cannot drift from it.

The declared model is a **floor for the agent's normal work**, not a ceiling. A
dispatch may override it for a task that is clearly an outlier — up for a
structural or irreversible decision, down for a mechanical pass — and says so
when it does. Calibrate the floor on the work the agent usually gets; a floor set
by the hardest imaginable task makes every agent expensive for no gain.

## Conventions

- **Autoridade explícita.** Each agent declares what it may veto, what it may
  ask for, and what it cannot decide alone.
- **Quando o veto é rejeitado.** Agents with veto power (`archie`, `gard`,
  `quinn`, `scott`, `pixie`, `spencer`, and the specialists `maya`, `nova`,
  `echo`, `dana`) also say what to do when overruled: register the open risk,
  the condition that materializes it, the cost of fixing later, and the
  observable signal — then support the chosen implementation.
- **Proporcionalidade.** Every agent classifies LOW / MEDIUM / HIGH before
  recommending, and states what *not* to do on LOW.
- **Nenhum contexto assumido.** Agents look for existing context first and
  declare gaps explicitly instead of inventing evidence.
- **Escalonamento.** Agents name the owner when a decision leaves their
  authority. Because a subagent cannot spawn another, escalation surfaces in the
  agent's report for you to route.
- **Specialists sob demanda.** Maya, Nova, Echo, Dana e Iris entram por domínio,
  não por completude. Não são instalados no core e não devem ser acionados em
  mudanças LOW só para fechar a lista. A regra é sustentada pela instalação, não
  só pela disciplina de leitura: se o domínio não existe no projeto, o agente não
  está lá.

## Integration Review

Reviews especializados otimizam cada um a sua própria dimensão. Isso produz uma
falha específica: **localmente excelente, globalmente incoerente** — cada
recomendação está certa isolada, e juntas não formam uma solução.

Para mudanças **MEDIUM ou HIGH que envolvam múltiplas disciplinas**, depois dos
reviews especializados e antes de fechar a decisão, o agente principal — quem
orquestra, não um agente novo — faz um Integration Review.

Não é um agente. Não é um artefato. É um passo de leitura do conjunto, feito por
quem juntou os reviews.

1. As recomendações dos especialistas se contradizem?
2. Alguma característica melhorou sacrificando outra de forma não documentada?
3. O fluxo end-to-end continua coerente?
4. Existe algum gap entre responsabilidades/handoffs?
5. Algum risco caiu entre dois agentes?
6. A solução continua sendo a menor solução suficiente?
7. Produto, UX, engenharia, segurança, qualidade e operação continuam alinhados?
8. Se houver gameplay: continua divertido e compreensível?
9. Se houver visual: continua coerente com a direção artística?
10. Se houver áudio: o que importa continua audível?
11. Se houver analytics: conseguiremos medir a hipótese sem coleta desnecessária?

Os itens 8-11 só se aplicam quando o specialist correspondente participou. Uma
mudança LOW não passa por Integration Review.

Quando o passo encontra uma contradição, o resultado é uma escalation nomeada
para o dono da decisão — não uma média entre as duas recomendações.

## Não versionar

- tokens, `.env`, auth profiles, credenciais
- caches, logs, bancos locais
- qualquer arquivo gerado pelo runtime
