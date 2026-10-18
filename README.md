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
| `virgo` | Maintainer — configuração do time: agentes, skills, blocos gerenciados, quais specialists um projeto instala |

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

Fronteiras que costumam confundir. As que envolvem um specialist viajam na
`description` dele, então só carregam no projeto que o instalou; no bloco global
fica só a fronteira entre agentes do core (Pipe / Perry / Pixie):

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
cache write, número de chamadas de API e `report_chars`, o tamanho do relatório
que voltou para o contexto de quem despachou — ele é relido em todo turno
seguinte, então é um custo à parte do que o subagente gastou). Só números e
metadados — nunca o texto do prompt nem do resultado.

Os tokens são **somados do transcript do subagente**, não lidos do payload do
hook: o `usage` que o `PostToolUse` entrega descreve só a última chamada de API
(≈ tamanho final do contexto) e subestima justamente os despachos de muitas
voltas. Num despacho em background (o padrão), o `PostToolUse` chega no
lançamento, sem números, e o `agent_end` é gravado no `SubagentStop`. Se o
transcript não puder ser lido, `tokens` fica `null` — nunca estimado.

O `install` copia o dashboard para `~/.claude/meu-time-dashboard/`. Rode
`node ~/.claude/meu-time-dashboard/serve.js` e abra `http://localhost:4317`: além
da timeline, ele agrupa os despachos por (modelo, effort) e por agente, com número
de despachos, tokens médios, tamanho médio do relatório e duração média.

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
| `install` | core no usuário + hooks + dashboard + blocos de referência globais + skill `orchestrate` |
| `install --no-reference` | só os agentes, os hooks e o dashboard |
| `reference` | só os blocos globais e a skill `orchestrate` |
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
frase final "Use when ..." fica no roster, porque é orientação para
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
| `reference/agents-block.md` | `~/AGENTS.md` | Codex e Claude Code | o time inteiro: quem existe, autoridade de bloqueio, roteamento HIGH, regras de despacho |
| `reference/routing-block.md` | `~/.claude/CLAUDE.md` | Claude Code | só o específico do Claude: o ponteiro para `~/AGENTS.md` e as regras `[ENFORCED]` dos hooks |

Junto dos blocos vai a skill `orchestrate` (`skills/orchestrate/SKILL.md`), que guarda
o que só importa na hora de orquestrar: a justificativa de nomear modelo e esforço
em cada despacho e o procedimento do Integration Review. O `AGENTS.md` mantém uma
linha sempre carregada por regra, apontando para a skill, então a regra não some
quando a skill não é carregada. A skill é instalada em `~/.claude/skills/orchestrate/`
(Claude Code) e em `~/.agents/skills/orchestrate/` (Codex lê skills de
`$HOME/.agents/skills`, conforme a documentação oficial de skills da OpenAI). Uma cópia
divergente é preservada como `SKILL.md.local.bak` antes de ser sobrescrita.

O `AGENTS.md` é neutro de runtime e é a única definição do time. O bloco de
roteamento guarda só o que é mecânica do Claude Code (hooks e o que eles
impõem) e apenas aponta para `~/AGENTS.md`, sem `@`: os projetos ficam sob uma
pasta que contém o `AGENTS.md`, o Claude Code já o carrega como ancestral, e um
import o carregaria duas vezes. O bloco não carrega tabela própria do time.

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

O roster afirma coisas sobre os agentes — em que camada estão, quem
tem veto, quem roda em opus. São fatos guardados em outro lugar, então podem
divergir sem nada quebrar. É o `validate.sh` que faz isso quebrar.

## Validação

```bash
./scripts/validate.sh          # relatório completo
./scripts/validate.sh --quiet  # só falhas e o resumo
```

Read-only, sai com código diferente de zero em qualquer falha. Automatiza o
protocolo do Virgo e checa as convenções que este README promete:

- frontmatter — `name` bate com o nome do arquivo, `model` e `tier` declarados e
  válidos, `description` abrindo com "Use ..." e abaixo de 300 caracteres (o Claude
  Code lista a descrição de todo agente instalado em todo turno: ela é o gatilho de
  delegação, não uma biografia);
- estrutura — Mission, Responsibilities, Collaboration, Expected Output, autoridade,
  fronteiras e risco: a **Risk scale** do time (no `AGENTS.md`) mais o que o domínio
  eleva, ou uma escala própria do domínio (Perry, specialists) — nunca uma cópia
  privada da genérica;
- relatório limitado — o Expected Output abre com o veredito, omite campo vazio e
  tem teto de linhas, porque o relatório é relido em todo turno de quem despachou;
- core não nomeia specialist — um agente core instalado em todo projeto apontaria,
  na maioria deles, para um agente que não existe; ele aponta para os specialists
  que o projeto instalou;
- a regra de veto — quem declara veto também diz o que fazer quando é rejeitado;
- o split core/specialist — todo agente declara `tier`, todos têm linha de resumo
  em `reference/agents-block.md`, o roster não lista nome sem arquivo, e as duas
  seções do roster batem com o `tier` declarado;
- o grafo de escalation — nenhum agente core isolado, e ninguém escalando para um papel
  genérico ("the security owner") em vez de um agente nomeado;
- o roster e o bloco de roteamento — todo agente aparece no roster, a divisão core/specialist bate
  com os instaladores, a coluna de autoridade bate com quem declara veto no próprio
  arquivo, e a regra de modelo bate com o frontmatter, e o bloco de roteamento aponta para o `AGENTS.md` (sem importá-lo) em vez de repetir a tabela;
- skills citadas pelos blocos — toda skill que `agents-block.md` ou
  `routing-block.md` mencionam precisa ser distribuída em `skills/`. Os blocos
  carregam em todo projeto de quem instala; uma skill que só existe na máquina de
  quem mantém o pacote vira uma instrução para chamar algo que não está lá;
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

### Eval de roteamento

`validate.sh` prova que as instruções estão bem formadas; não prova que funcionam.
O eval mede o comportamento: roda cada caso de `evals/routing-cases.json` com
`claude -p` numa cópia descartável de um repo-fixture e registra quem o modelo
principal despacha.

```bash
npm run eval -- --dry-run          # mostra o plano, não chama nada
npm run eval                       # todos os casos, uma vez
npm run eval -- --runs 3           # repete para ver variância
npm run eval -- --only high-auth --save out/   # guarda o transcript
```

- Um hook `PreToolUse` nega todo despacho: a decisão fica no stream e o
  subagente nunca roda, então um caso custa uma conversa, não um time inteiro.
  `--budget` limita cada caso (padrão US$ 0,50).
- Roda em plan mode. Headless, a confirmação de um gate não tem quem responda, e
  a edição de um arquivo HIGH-risk é recusada antes de a revisão "depois da
  última edição" vencer — o eval mediria o gate, não as instruções. Planejando,
  nada é editado e nenhum gate dispara: sobra a pergunta que o eval responde, se as
  instruções sozinhas fazem o modelo chamar o dono do domínio e manter LOW inline.
- Mede o que está **instalado**, não o clone, e avisa quando os dois divergem:
  rode `node bin/cli.js install` antes para medir a árvore de trabalho. Gasta
  crédito de API, então roda à mão antes de um release, não no `npm test` (que
  testa o parser, o juiz e o arquivo de casos). Codex fica fora do escopo.
- O modelo não é determinístico: com `--runs 3`, um caso só se sustenta se passar
  em 2 de 3 das execuções respondidas. Uma execução que o modelo não chegou a
  responder (limite de uso, rate limit, erro de API) sai como `ERROR` e fica fora
  da conta — uma queda não é regressão de roteamento. `--model` fixa o modelo do loop principal; `--rescore <dir>` rejulga
  transcripts salvos sem chamar nada.
- Plan mode grava o plano em `~/.claude/plans`; o eval apaga exatamente os
  arquivos que ele mesmo escreveu.

Cada caso declara `includes` / `includesAny` (o agente precisa ser despachado
**ou** aparecer como passo do plano — a revisão do time vem depois da última
edição, então planejá-la é o comportamento certo), `excludes` (não pode ser
despachado), `avoids` (nem despachado nem planejado), `none` (nenhum agente do
time despachado; os built-ins do plan mode não contam) e `says` (regex que a
resposta precisa conter). "Aparecer no plano" é estrito: o nome na forma de agente
("Gard", `**gard**`, `` `gard` ``) numa frase sem negação — "pipe the output" e "no
need for Gard" não contam. Os casos cobrem
trabalho LOW que deve ficar inline, as superfícies HIGH (auth, migração, contrato
público, budget) e um specialist ausente que precisa ser declarado sem dono, não
inventado.

Antes e depois desta versão (2026-10-17, mesmo juiz, 3 execuções por caso, modelo
padrão da sessão):

| Versão | Casos sustentados | Execuções |
| --- | --- | --- |
| anterior (`da7d5a2`) | 10/12 | 30/36 |
| esta | 12/12 | 34/34 respondidas (2 sem resposta: limite de uso, orçamento) |

Dez casos não distinguem as versões — as duas acertam; provam ausência de
regressão, não melhora. Dois distinguem, e miram regras que mudaram:

- `parallel-writers` (0/3 → 2/2 respondidas): o texto anterior mandava dois
  agentes que escrevem código "passar pelo Virgo", e o modelo fez isso nas três
  execuções; o atual isola cada um num worktree.
- `customize-installed-agent` (0/3 → 3/3): o texto anterior chamava o repositório
  `agent-team-config` de fonte da verdade, e o modelo mandou editar lá nas três
  execuções — um repositório que quem instala o pacote não tem; o atual cria um
  agente do projeto com outro nome ou corrige upstream.

Nos dois juntos, 0/6 contra 5/5 (teste exato de Fisher, p ≈ 0,002). Exigindo despacho
imediato em vez de "despachado ou planejado", os casos HIGH falhariam nas duas
versões: o modelo planeja o revisor para depois da edição, como a regra manda.

### Eval de qualidade

O eval de roteamento nunca roda o corpo de um agente: o despacho é negado. Este
roda só o corpo. Cada caso de `evals/quality-cases.json` grava um fixture, commita,
e grava por cima uma mudança com um defeito plantado (rota admin sem checagem de
papel, token em log, teste que mocka o próprio alvo, caso pulado para o suite
ficar verde, contrato público quebrado, formulário sem label); o agente revisa o
diff em plan mode. Um caso de controle sem defeito cobre a falha oposta: bloqueio
inventado numa mudança LOW.

```bash
npm run eval:quality -- --dry-run
npm run eval:quality -- --runs 3
npm run eval:quality -- --variant gard=out/gard-lean.md --runs 3   # A/B de corpo
```

- O agente vem **deste checkout** (`--agents` + `--agent`), não do que está
  instalado: dá para medir um corpo antes de publicá-lo. `--variant` troca só o
  corpo, mantendo nome, descrição e modelo — a pergunta que ele responde é se um
  corpo mais curto acha o mesmo tanto.
- Cada caso exige o defeito (`says`), o veredito na primeira linha (`firstLine`) e
  um teto de linhas (`maxLines`); o resumo dá a média de linhas por agente.
- Os blocos globais são os instalados, como numa sessão real. Gasta crédito: roda
  à mão, não no `npm test`.

### Custo sempre carregado

Medido: os dois blocos mais as descrições dos 10 agentes core, que o Claude Code
lista em todo turno, somam ~12,0k caracteres (~3,0k tokens) — já contando a Risk
scale, que passou a existir uma vez no bloco em vez de catorze vezes nos agentes.
Antes da 1.1 eram ~14,5k (~3,6k tokens). As descrições dos specialists só pesam no
projeto que os instalou.

Por despacho, o corpo de um agente core tem ~6–10,5k caracteres (~1,5–2,6k
tokens); o relatório que ele devolve é medido em `report_chars` no log.

## Editing an agent

1. Edite `agents/<name>.md` neste repo.
2. Se for core, rode `npx canonkit install` (ou o script do clone).
3. Se for specialist, rode `npx canonkit add <nome>` de novo nos
   projetos que o usam.
4. Rode `./scripts/validate.sh` e `npm test`.
5. Commit.
6. Antes de um release que mude instrução (blocos, descrições, corpo de agente):
   `node bin/cli.js install` e `npm run eval -- --runs 3`; se mudou o corpo de um
   agente com caso de qualidade, também `npm run eval:quality -- --runs 3`.

O passo de sincronizar os blocos globais saiu da lista porque `install` já faz.

Não edite `~/.agents`, `~/.claude/agents`, `.claude/agents/` de um projeto, nem o
bloco gerenciado do `~/AGENTS.md` — a próxima instalação sobrescreve. Este repo é
a única fonte de verdade.

## File format

```markdown
---
name: <agent-id>
description: "Use when/for <trigger>. <authority>."   # < 300 caracteres
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
  recommending, and states what *not* to do on LOW. The scale lives once, as the
  **Risk scale** in the `AGENTS.md` block; an agent file adds only what its domain
  raises.
- **Relatório curto.** Every agent opens with its verdict, reports only the
  fields that have content, and stays under ~25 lines unless asked for more —
  the report lands in the caller's context and is re-read on every later turn.
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
quem juntou os reviews. O procedimento completo mora na skill `orchestrate`; o
`AGENTS.md` mantém só a linha sempre carregada que manda executá-la.

1. As recomendações dos especialistas se contradizem?
2. Alguma característica melhorou sacrificando outra de forma não documentada?
3. O fluxo end-to-end continua coerente?
4. Existe algum gap entre responsabilidades/handoffs, ou algum risco que caiu entre dois agentes?
5. A solução continua sendo a menor solução suficiente?
6. Produto, UX, engenharia, segurança, qualidade e operação continuam alinhados?
7. Só se Maya/Nova/Echo/Dana participaram: continua divertido e compreensível, coerente com a direção artística, o que importa continua audível, a hipótese é mensurável sem coleta desnecessária?

Uma mudança LOW não passa por Integration Review.

Quando o passo encontra uma contradição, o resultado é uma escalation nomeada
para o dono da decisão — não uma média entre as duas recomendações.

## Não versionar

- tokens, `.env`, auth profiles, credenciais
- caches, logs, bancos locais
- qualquer arquivo gerado pelo runtime
