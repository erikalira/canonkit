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

Roda igual em Linux, macOS e Windows. Num terminal, pergunta para quais runtimes
instalar numa seleção múltipla — Claude Code e Codex vêm marcados, espaço
desmarca, Enter confirma, e pelo menos um tem que ficar. `--claude` e
`--codex` respondem sem o menu (os dois juntos = ambos), e sem terminal (script,
CI) instala para os dois, como antes do menu existir.

O menu é a única dependência (`prompts`, que traz `kleur` e `sisteransi`, nenhum
com script de install), e só é carregado quando aparece: um install decidido por
flag ou sem terminal roda em Node puro. Um instalador que roda **antes** de você
confiar no repositório não deveria pedir que você confie numa árvore de
dependências maior que isso.

| Escolha | Escreve |
| --- | --- |
| Claude Code | `~/.agents/*.md`, `~/.claude/agents`, hooks, dashboard, bloco em `~/.claude/CLAUDE.md`, `~/.claude/skills` |
| Codex | `~/.codex/agents/*.toml`, `~/.agents/skills` |
| ambos | os dois; o bloco de `~/AGENTS.md` vai em qualquer escolha |

`--wire-hooks` registra o hook do Claude Code, então é recusado num install só
para Codex. O `doctor` confere a metade do Claude Code.

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
existem enquanto `~/.claude/hooks/canonkit-hook.js` está no disco **e** é
referenciado pelo `settings.json`. O `install` copia o arquivo; o registro no
`settings.json`, por padrão, ele apenas **reporta**, com o JSON pronto para colar.

`npx canonkit install --wire-hooks` registra o hook em `~/.claude/settings.json`
(backup datado `settings.json.canonkit-<timestamp>.bak`, só quando algo muda;
nada além das entradas do hook é alterado; `settings.local.json` nunca é
escrito). Para desfazer, restaure o `.bak`. Ele guarda os mesmos valores do
`settings.json`, `env` incluído: mantenha-o fora de um repositório de dotfiles.
`npx canonkit doctor` verifica a instalação (agentes, blocos, hook, registro,
log, forwarder, config), só lê, e sai com 1 se algum check der `FAIL`.

A divisão é deliberada. O `settings.json` é seu — carrega permissões, env e
escolha de modelo que este instalador não reescreve sem você pedir. Já um hook no
disco que nenhum evento referencia não faz nada e não reclama, que é o pior modo
de falha possível para um gate: todo mundo segue acreditando que ele roda.

O hook **falha aberto** — `main()` é envolvido num `catch` que sai com 0, então
um erro de sintaxe nunca trava sua sessão. Ele apenas desliga todos os gates, em
silêncio. Por isso o `validate.sh` roda `node --check` em cada `hooks/*.js`.

Editar esse arquivo no lugar sempre foi o único fluxo que ele teve, e foi assim
que ele passou a existir numa cópia só, numa máquina só. Versioná-lo inverte a
fonte de verdade, então o instalador protege o caso: se a cópia instalada
divergir da do repo, ela é preservada como `canonkit-hook.js.local.bak` antes de
ser sobrescrita.

Quais caminhos contam como superfície HIGH-risk ou budget de performance é
ajustável por projeto em `.claude/canonkit.json`:

```json
{
  "version": 1,
  "highRisk": { "include": ["src/billing/**"], "exclude": ["src/domain/contracts/**"] },
  "perfBudgets": ["perf/thresholds.yml"]
}
```

**Onde é lido.** Na pasta mais próxima subindo a partir do cwd da sessão,
parando em `CLAUDE_PROJECT_DIR` quando o cwd está dentro dele (uma config acima
do repositório não vale para ele) e, fora disso, abaixo do home
(`~/.claude/canonkit.json` não é config de projeto); se nenhuma tiver o arquivo,
em `CLAUDE_PROJECT_DIR`. Vale o arquivo mais próximo, inteiro: um aninhado
(submódulo, exemplo) substitui o do projeto enquanto o cwd está nele — com uma
exceção que só acrescenta gates: quando o arquivo mais próximo fica abaixo de
`CLAUDE_PROJECT_DIR` e o projeto tem o seu, as listas aditivas do projeto
(`highRisk.include`, `perfBudgets`) valem também, casadas com o caminho relativo
ao projeto. O `exclude` do projeto nunca chega à pasta aninhada, e o `exclude`
do aninhado nunca cancela o `include` do projeto. Num worktree com config
própria vale a mesma regra: o `include` do projeto continua somando gates, mas
globs ancorados (com `/`) são casados contra o caminho relativo ao checkout
principal e não casam dentro do worktree; só globs sem `/` os alcançam. O cwd
vem primeiro na busca justamente porque, num worktree, `CLAUDE_PROJECT_DIR` é o
checkout principal, onde os globs ancorados do worktree nunca casariam. Os globs casam com o caminho relativo à pasta onde o
arquivo está. Só é lido um arquivo comum de até 64 KiB, e só as 100 primeiras
entradas de cada lista: um hook que trava ou estoura memória falha aberto.
`version` é opcional e só `1` é lido: outra versão = padrões. Chaves
desconhecidas são ignoradas. Config inválida = padrões — um erro de digitação
nunca desliga um gate.

**Dialeto de glob: parecido com gitignore, não gitignore.** Glob com `/` casa
com o caminho relativo ao projeto; sem `/`, com o nome do arquivo em qualquer
profundidade. `*` e `?` ficam dentro de um segmento; `**` como segmento inteiro
atravessa segmentos (em qualquer outro lugar é um `*`). `/` no fim = tudo abaixo
da pasta (`dir/` = `dir/**`). Não há `!` nem `[...]` (são literais). Sem
diferença de maiúsculas. Antes de casar, todo caminho é normalizado (`\`, `//`,
`./`, `..`, sufixo de stream NTFS, `/c/...` do Git Bash), então grafias
diferentes do mesmo arquivo dão o mesmo resultado.

**O que `exclude` não alcança.** `include` vence `exclude`. Um repo commita esse
arquivo e quem clona nunca passa pelo gate de edição dele, então `exclude`:
- nunca silencia a checagem de segredo no conteúdo;
- nunca silencia caminhos que guardam credenciais (`.env`, `secret`,
  `credential`, `.npmrc`, `github_token`, `*.pem`, `*.key`, `*.p12`, `*.pfx`,
  `id_rsa`/`id_ed25519`/`id_ecdsa`, `kubeconfig`, `.pgpass`, `*.tfvars`,
  `*.tfstate`...);
- nunca silencia os termos fortes (`auth`, `jwt`, `secret`, `credential`, `rbac`,
  `schema.prisma`, `migrations` em código...) — só as palavras ambíguas
  (`sessions`, `contracts`, `permissions`, `gateway`, `login`) e a lista de
  tokens. Por isso `migrations` em prosa (`docs/migration-guide.md`) não conta, e
  a palavra `author` (`AuthorCard`, `authors/`, `authoring/`, `AUTHORS.md`)
  não é `auth` — `authority`, `authorize`, `AUTHORITY` e `authOrRedirect` são;
- descarta globs pega-tudo, julgados pelo que casam, não pela grafia (`*`, `**`,
  `*.*`, `?*`...), e julgados juntos: o glob que, somado aos anteriores, faria
  a lista casar quase tudo é descartado (`*.ts`, `*.go`, `*.rb`, `*.py`).

Quando um `exclude` cala um gate, o hook grava um evento `excluded-by-config`
(com o glob) que o dashboard mostra e o gate do Stop ignora.

`perfBudgets` só acrescenta à lista padrão (lighthouserc, size-limit,
bundlesize, bundlewatch, `budget.json`/`budgets.json`/`*.budgets.json` em
qualquer profundidade, `*perf-budget*`/`*performance-budget*`, `perfBudget.json`
e afins em camelCase logo antes da extensão, de `-` ou de `_`
(`perfBudget-prod.json`), thresholds do
k6...): remover um padrão seria afrouxar o gate, e isso é do Perry. Os padrões
ignoram `.md`/`.mdx` e pastas geradas (`node_modules`, `dist`, `build`...),
só dentro da pasta da config — fora dela (um worktree irmão sem config própria,
um arquivo fora do projeto) o caminho fica absoluto e o gate pergunta; uma
entrada sua em `perfBudgets` vale como escrita. Budgets dentro de arquivos de
uso geral — `angular.json`, o `size-limit` do `package.json`, `next.config.*`,
hints de webpack — são opt-in via `perfBudgets`; thresholds do k6 escritos
inline no script são uma lacuna conhecida. Editar o próprio `canonkit.json` é um
gate.

Ao atualizar de uma versão com o nome antigo (`meu-time`), o `install` move
`~/.claude/meu-time-activity/` para `canonkit-activity/` (se as duas existirem,
junta o histórico, o mais antigo primeiro, e remove a antiga) e troca o
`meu-time-hook.js` por um repassador para `canonkit-hook.js`, que nunca é
removido: um `.claude/settings.json` de projeto pode ainda executá-lo, e o
`install` não tem como encontrá-lo. Aponte todo `settings.json` para
`canonkit-hook.js` e apague o repassador. O tratamento do nome antigo sai na 2.0.

O registro é conferido **por evento**: `PreToolUse`, `PostToolUse` (matcher
`Agent|Task|Read|Grep|Glob|Bash|PowerShell`), `SubagentStop`, `UserPromptSubmit` e `Stop`. Um hook ligado a parte
deles funciona pela metade — os gates disparam, então ninguém procura as métricas
de despacho que nunca são gravadas.

### Métricas de despacho e dashboard

Cada despacho de subagente vira duas linhas em
`~/.claude/canonkit-activity/events.jsonl`, ligadas pelo `id` (o `tool_use_id`):
`agent_start` (agente, descrição, `model`, `effort`; vazio = herdou o padrão) e
`agent_end` (modelo resolvido, duração, tokens de entrada / saída / cache read /
cache write, número de chamadas de API e `report_chars`, o tamanho do relatório
que voltou para o contexto de quem despachou — ele é relido em todo turno
seguinte, então é um custo à parte do que o subagente gastou). Só números e
metadados — nunca o texto do prompt nem do resultado.

**Campos estáveis do `events.jsonl`** (outras ferramentas podem lê-los): em toda
linha, `ts` (ms desde a época), `session` e `event` (`prompt`, `gate`,
`agent_start`, `agent_launch`, `agent_end`, `agent_stop`, `tool_result`). Em
`gate`: `kind` (`git`, `high-risk-surface`, `secret-block`, `secret-ask`,
`perf-budget`, `excluded-by-config`, `context-size`), `file`, `tool`, `project`
e, em `excluded-by-config`, `glob`. Em `agent_start`/`agent_end`: `id`, `agent`,
`model`, `effort`; em `agent_end`, também `resolved_model`, `mode`,
`duration_ms`, `tool_uses`, `tokens` e `report_chars`. Campos desconhecidos devem
ser ignorados por quem lê: novos podem aparecer sem aviso.

Os tokens são **somados do transcript do subagente**, não lidos do payload do
hook: o `usage` que o `PostToolUse` entrega descreve só a última chamada de API
(≈ tamanho final do contexto) e subestima justamente os despachos de muitas
voltas. Num despacho em background (o padrão), o `PostToolUse` chega no
lançamento, sem números, e o `agent_end` é gravado no `SubagentStop`. Se o
transcript não puder ser lido, `tokens` fica `null` — nunca estimado.

Dois limites conferidos num transcript real (2026-10-19). **A saída (`output`) é
um piso**: o transcript repete, em várias linhas da mesma chamada, a contagem do
início do streaming, e para muitas chamadas a contagem final nunca é gravada. O
hook guarda o maior valor visto por chamada; entrada e cache são completos. **Em
background, o relatório volta pela ferramenta `SubagentHandback`**, não como última
mensagem de texto, então `report_chars` mede a `message` do último
`SubagentHandback` do transcript e só cai para `last_assistant_message` quando não
há nenhum.

O `install` copia o dashboard para `~/.claude/canonkit-dashboard/`. Rode
`node ~/.claude/canonkit-dashboard/serve.js` e abra `http://localhost:4317`: além
da timeline, ele agrupa os despachos por (modelo, effort) e por agente, com número
de despachos, tokens médios, tamanho médio do relatório e duração média.

### Context contributors (Fase 1)

O mesmo `PostToolUse` registra uma única linha `tool_result` por resultado textual
reconhecido de `Read`, `Grep`, `Glob`, `Bash` e `PowerShell` no **main thread**:

```json
{"ts": 1234567890000, "session": "synthetic-session", "event": "tool_result", "tool": "Read", "chars": 1200, "lines": 40}
```

Só esses campos são persistidos: nenhum conteúdo, input, prompt, comando, path,
basename de projeto ou status arbitrário. `session` passa pelo validador de IDs
existente; sessão ausente/inválida não gera medição. `chars` usa unidades UTF-16
(como `report_chars`); `lines` conta linhas textuais, com CRLF contado uma vez,
sem linha extra por terminador final, e saída vazia é zero. Nos shells, os números
são a soma de stdout e stderr, contados separadamente. Falha de coleta/gravação
continua silenciosa e fail-open. Gates e métricas de despacho seguem iguais.

O contrato foi conferido no `sdk-tools.d.ts` de
[`@anthropic-ai/claude-agent-sdk@0.3.300`](https://unpkg.com/@anthropic-ai/claude-agent-sdk@0.3.300/sdk-tools.d.ts)
e nos schemas locais do Claude Code 2.1.302 (PowerShell e identificação do main
thread). `Read` usa `file.content` quando `type` é `text`; `Grep` usa `content`
nos modos `content`/`count`, ou `filenames` no modo de arquivos; `Glob` usa
`filenames` unidos por newline; os shells usam `stdout`/`stderr`. Um `agent_id`
presente exclui a chamada; `agent_type` sozinho também existe no main thread
com `--agent` e não o exclui. Runtimes antigos sem essa identificação de
subagentes não têm separação garantida.

**Limites:** [PostToolUse](https://code.claude.com/docs/en/hooks#posttooluse)
expõe saída estruturada, anterior à formatação final do tool result: o volume é
do texto no payload, **não** tokens ou crescimento exato do contexto. Não inclui
prefixos de linha, banners, imagens, outros formatos de Read ou resultados de
schema desconhecido. Esses casos ficam sem medição, em vez de zero inventado.
Saídas truncadas/persistidas/em background medem só o texto disponível naquele
payload, sem abrir arquivos de output. Não há exit code garantido; não se infere
sucesso/falha de stderr. Falhas de tool que só geram `PostToolUseFailure` ficam
fora desta fase.

A seção **Context contributors** permite escolher uma sessão e mostra total,
participação no volume medido, chamadas, média e maior resultado por ferramenta.
“Agents” reutiliza `agent_end.report_chars`, mantendo o último relatório cumulativo
por sessão/despacho. Eventos antigos sem medida continuam aceitos e não viram zero.
O denominador é apenas o volume medido nos dois arquivos retidos (`events.jsonl`
e `.1`), não a sessão inteira se dados anteriores já foram descartados. Não se
inventa uma categoria “Other” para volume desconhecido.

Para coletar em uma instalação existente, reinstale a partir deste checkout e
atualize **a entrada existente** de `PostToolUse` para o matcher acima, evitando
hooks duplicados. O instalador avisa se encontrar o matcher antigo `Agent|Task`,
mas continua sem escrever no `settings.json`. Editar as cópias instaladas não
substitui a alteração da fonte neste repo.

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
| `install` | core no usuário + hooks + dashboard + blocos de referência globais + skills `orchestrate` e `context-tune` |
| `install --no-reference` | só os agentes, os hooks e o dashboard |
| `install --claude` / `--codex` | só para um runtime, sem o menu |
| `reference` | só os blocos globais e as skills (`--claude`/`--codex` restringem; sem menu) |
| `add <nome>...` | specialists no projeto atual |
| `remove <nome>...` | remove specialists do projeto atual |
| `list` | o roster e o que está instalado onde (e aponta para `tool list`) |
| `tool add <graphify\|openspec>` | roda o setup da ferramenta neste projeto e registra no `AGENTS.md` |
| `tool remove <nome>` | tira a ferramenta do `AGENTS.md` |
| `tool list` | pin, versão instalada e se está ativa neste projeto |

`--dry-run` funciona em todos: relata o que mudaria sem escrever nada. `--yes`
só existe em `tool add`.

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

### Ferramentas, por projeto

Duas ferramentas de terceiros complementam o time: **graphify** (grafo do código,
atualizado sob demanda por padrão) e **openspec** (specs e critérios de aceite em
`openspec/`). Rodado **de dentro do projeto**:

```bash
npx canonkit tool add openspec      # ou graphify
npx canonkit tool add graphify --with-git-hooks  # opt-in: confie em toda branch
npx canonkit tool add graphify --dry-run
npx canonkit tool remove graphify
npx canonkit tool list
```

O canonkit **só integra, nunca instala**. Se o binário não está no `PATH`, ele
imprime o comando de instalação com a versão exata e sai com 1, sem escrever nada.
Instale você mesmo, nestas versões:

```bash
npm install --global --ignore-scripts @fission-ai/openspec@1.14.0
python -I -m pip install --user --only-binary :all: graphifyy==0.9.76
```

> **graphifyy tem dois y.** `graphify` com um y no PyPI é outro pacote.

O binário só é procurado no `PATH`, e o canonkit ignora toda entrada relativa,
inexistente ou dentro do projeto (por `realpath`, então links para dentro contam). Um binário achado só dentro do projeto (um `.venv` ativado, `node_modules/.bin`) recebe uma mensagem dizendo exatamente isso, não "não está no PATH".
Isso inclui `<projeto>/node_modules/.bin`, que o `npx canonkit` põe na frente: uma
instalação local do openspec nunca é usada, e é por isso que o comando impresso é o
global. O processo filho recebe o mesmo `PATH` filtrado e, no Windows,
`NoDefaultCurrentDirectoryInExePath=1`, para que um binário plantado no projeto
(um `node.exe`, por exemplo) não seja executado pelo shim da ferramenta. Com o
binário presente, o
`tool add`:

1. mostra o caminho absoluto, a versão (com aviso se for diferente da pin — nunca
   atualiza), os comandos exatos e os arquivos que serão tocados;
2. pergunta `y/N` (`--yes` pula; sem terminal e sem `--yes`, não roda);
3. roda o setup da própria ferramenta (`openspec init --tools claude,codex`;
   `graphify update .`; com `--with-git-hooks`, antes roda `graphify hook install`);
4. por último, e só se o setup deu certo, escreve o bloco "Project tools" no
   `AGENTS.md` do projeto (marcadores `agent-team-config:complements:*`).

`--dry-run` não executa nada, nem `--version`. O canonkit nunca cria `CLAUDE.md`
no projeto — com um, o Claude Code deixa de ler o `AGENTS.md` — e avisa alto se o
setup da ferramenta criar um. Por isso `graphify claude install`, qualquer
`graphify <plataforma> install` e `graphify extract` (chama um LLM) são recusados.
O motivo está em [`docs/adr/0001-tool-namespace-integrate-only.md`](docs/adr/0001-tool-namespace-integrate-only.md).

`tool remove` tira a entrada do bloco (a última remove o bloco) e imprime como
desfazer o setup. Não toca em `openspec/` nem em `graphify-out/`. Rodar `add` ou
`remove` duas vezes deixa o `AGENTS.md` igual.

**openspec.** O `init` da 1.14.0 escreve `openspec/`, `.claude/skills/openspec-*`,
`.claude/commands/opsx/`, `.agents/skills/openspec-*` e a configuração do próprio
openspec no nível do usuário (`openspec/config.json` em `%APPDATA%` ou
`$XDG_CONFIG_HOME`). Ele envia telemetria anônima por padrão: o canonkit define
`OPENSPEC_TELEMETRY=0` e `DO_NOT_TRACK=1` só nas execuções que ele mesmo faz; as
suas continuam enviando, a menos que você defina uma dessas variáveis. Versão importa: um openspec antigo
(1.4.1) com `--tools codex` escreveu prompts em `~/.codex/prompts`.

O OpenSpec guarda o estado durável; o CanonKit aplica risco, ownership, gates e
revisões; o Graphify fornece evidência do código. A ponte de handoff e fechamento
fica em [OpenSpec change lifecycle](skills/orchestrate/SKILL.md#openspec-change-lifecycle):
reutilize o change, o planning root e os artefatos do schema selecionado. Scott
define o aceite, Archie registra decisões estruturais quando necessário, Bob
implementa, Quinn valida comportamento quando a revisão é necessária e Spencer
verifica drift antes do fechamento MEDIUM/HIGH. A conclusão depende de evidência
e revisões atuais, seguida de sync aplicável verificado e archive autorizado no workflow
do projeto. PRD, plano ou spec paralelos não substituem esse estado.
O contrato foi conferido no [schema da versão fixada](https://github.com/Fission-AI/OpenSpec/blob/v1.14.0/schemas/spec-driven/schema.yaml)
e no [workflow de archive](https://github.com/Fission-AI/OpenSpec/blob/v1.14.0/src/core/templates/workflows/archive-change.ts).

**graphify.** Por padrão, o setup roda apenas `graphify update .`: não instala
hooks Git nem merge driver. `--yes` pula a confirmação, sem habilitá-los.
`--with-git-hooks` é aceito somente em `tool add graphify` e habilita explicitamente
`post-commit` e `post-checkout` em `.git/hooks/`, o merge driver em `.git/config`
e `.gitattributes`, com aviso do risco antes da confirmação. Nesse modo ele **não roda** se já existe
`post-commit` ou `post-checkout` que não seja do graphify, ou se `core.hooksPath`
está definido; nesse caso imprime como encadear à mão e sai com 1. Um `--dry-run`
do graphify não executa essa checagem, então não mostra essa recusa. Nos dois
modos, continua exigindo Git, a raiz do repositório e os checks de arquivos que
poderiam substituir o pacote ou o interpretador dos hooks.

**Migração de clones existentes:** atualizar o CanonKit ou repetir `tool add graphify`
sem a flag preserva os hooks, o merge driver e os atributos já configurados.
O comando detecta automação existente e avisa que continua habilitada; não a
desativa silenciosamente. Para manter/reinstalar o comportamento anterior, use
`npx canonkit tool add graphify --with-git-hooks` após avaliar o risco. Para passar
a atualizações manuais, revise e execute `graphify hook uninstall` (remove os
blocos marcados e o merge driver), confira `graphify hook status`,
`git config --get-regexp '^merge\.graphify\.'` e o diff de `.gitattributes`,
preservando hooks do projeto. Em hook managers, confira também o encadeamento
manual. `tool remove` continua removendo apenas a entrada no `AGENTS.md`.
Decisão e avaliação upstream: [ADR 0002](docs/adr/0002-graphify-git-hooks-opt-in.md).

Antes de usar relatório ou query como evidência estrutural, confira
`git status --porcelain --untracked-files=normal` no projeto: o check inclui
index, alterações não staged e arquivos não rastreados. Se a consulta depender
dessas mudanças, execute `graphify update .` com sucesso antes de consultar o
grafo. Uma alteração comprovadamente alheia à pergunta não exige rebuild por si
só. Se o grafo for conhecido como stale para a pergunta, atualize-o mesmo com
status limpo: ausência de mudanças locais não prova que ele corresponde ao HEAD.
Se o check ou refresh falhar, estiver indisponível ou a freshness continuar
desconhecida, avise explicitamente que o grafo pode estar stale e confira os
arquivos atuais. Esta é uma orientação no bloco do projeto (opção A do roadmap),
sem novo comando de status ou monitoramento automático. Os quatro casos
`graphify-*` calibram esses planos com o judge existente; não executam refresh real.

> **Habilite os hooks/merge driver do graphify só onde você confia em toda branch que faz
> checkout.** Os hooks e o merge driver iniciam o Python na raiz do repositório
> (`-c` / `-m graphify`), e o Python procura ali primeiro: um `graphify/` ou
> `graphify.py` commitado rodaria em commit, checkout ou merge, antes de qualquer
> revisão. Os hooks também executam o interpretador nomeado em
> `graphify-out/.graphify_python`. O canonkit só confere isso **uma vez, no
> `tool add`** (recusa se `graphify/` ou `graphify.py` existe na raiz, ou se esse
> arquivo está versionado) e avisa na confirmação. Depois, uma branch pode trazer um
> `graphify.py`, um módulo que o graphify importa (`networkx.py`, por exemplo) ou um
> `.pyc`/`.pyd`/`.so` sem fonte, e o próximo checkout, commit ou merge o executa sem
> sinal algum. Só o graphify corrige (iniciar o Python com `-I`/`-P`); reportar
> ao upstream está em aberto.

- O rebuild pós-commit e o merge driver (que roda o graphify a cada merge) são
  código de terceiros **fora do gate** do canonkit: o `git commit` é confirmado, o
  que o hook faz depois não (veja o aviso acima sobre o que o Python importa).
- O graphify reescreve as cópias de skill que ele instalou antes no nível do
  usuário (por exemplo `~/.claude/skills/graphify`) quando o selo de uma skill é
  mais antigo que o pacote instalado: uma vez por upgrade do graphify, em qualquer
  comando (`--version` inclusive), não a cada execução. Em toda execução feita por ele, o canonkit
  passa `GRAPHIFY_NO_AUTO_REFRESH=1`, a opção documentada do graphify para evitar
  isso. Um graphify rodado fora do canonkit (seu shell, os hooks, agentes rodando
  `graphify query`) ainda faz isso, a menos que `GRAPHIFY_NO_AUTO_REFRESH=1` esteja
  no seu próprio ambiente.
- Hooks git são **por clone**: novos clones só os recebem com `tool add graphify --with-git-hooks`.
- `graphify-out/` precisa estar no `.gitignore` ou ser versionado de propósito.
  Neste repo `GRAPH_REPORT.md` é versionado e fica sujo a cada commit.
- O canonkit nunca instala o hook de Claude do graphify. Se você o instalar por
  conta própria, ele e o hook do canonkit disparam em `PreToolUse` sem ordem
  garantida; não conte com um rodar antes do outro.

Subir uma pin é uma mudança MEDIUM, revisada pelo Gard. Quem publicou o pacote
`graphifyy` tem atestado de Trusted Publishing que bate com o repositório declarado; o que ficou em aberto está na ADR.

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
divergente é preservada como `<arquivo>.local.bak` antes de ser sobrescrita. O
instalador copia todos os arquivos da pasta da skill, não só o `SKILL.md`.

A skill `context-tune` é de outro tipo: **só roda quando você chama**
(`/context-tune` no Claude Code, `$context-tune` no Codex). Ela mede a saída dos
comandos que os agentes rodam no projeto (testes, build, lint), separa sinal de
ruído (códigos de cor, banners, dicas, reporters verbosos) e silencia o ruído onde
a configuração fica salva no projeto: `env` em `.claude/settings.json` /
`[shell_environment_policy.set]` em `.codex/config.toml`, a config da própria
ferramenta e, por último, um script para agentes. No fim, mede de novo e mostra o
antes e depois. Roda uma vez por projeto, em vez de virar uma regra no `AGENTS.md`
que toda sessão carrega. Por isso ela não pesa nada por sessão: o Claude Code não
põe no contexto a descrição de uma skill com `disable-model-invocation: true`, e o
Codex não a escolhe sozinho por causa de `allow_implicit_invocation: false` em
`agents/openai.yaml`.

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

Os casos `openspec-*` usam estado fornecido no prompt para cobrir LOW inline,
handoff MEDIUM com schema customizado e fechamento HIGH bloqueado por testes,
revisão antiga e sync pendente. Reutilizam o mesmo judge; não executam sync ou archive.

O check opcional `dispatch` mede a configuração pedida numa chamada real de
`Agent` ou `Task`: por exemplo,
`"dispatch": {"agent": "gard", "model": "sonnet", "effort": "medium"}`.
Todas as chamadas ao agente indicado precisam corresponder; citar a configuração
no plano não passa esse check. Campos omitidos na expectativa não são avaliados;
`null` exige ausência de override, preservando os defaults da definição do agente.
Isso permite avaliar runtimes que não enviam `effort` sem inventar esse campo:
deixe-o fora da expectativa. Se exigir `"effort": "high"` e ele não vier, o caso
falha. O parser e o resumo guardam os overrides, com `null` / `inherited` para
ausência; não inferem o modelo ou effort efetivamente executado, pois o hook
nega o despacho antes da execução. Casos novos cobrem decisão estrutural (up),
verificação mecânica solicitada (down), ad-hoc sem overrides e LOW sem delegação.
`--rescore` aplica os mesmos checks aos transcripts salvos, inclusive antigos.

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
roda só o corpo. Cada caso de `evals/quality-cases.json` grava um fixture, commita
nesse repositório temporário e grava por cima a mudança proposta; o agente revisa
o diff em plan mode. Os casos incluem defeitos em código, testes, propostas de
escopo, evidências de performance, planos operacionais, documentação e configuração
do time, além de controles sem defeito para detectar bloqueio inventado em LOW.

O corpus tem **37 casos para os 10 agentes core** (7 originais, 26 da Fase 3
e 4 da Fase 7).
Cada core tem `kind: positive` (achado realista), `adversarial` (pressão para
aceitar comportamento incorreto) e `low` (mudança benigna sem burocracia).
`kind` é metadado de cobertura; os checks continuam sendo os mesmos. Bob cobre
root cause, callers, failure path, abstração de uso único e teste escondido;
Scott, evidência e menor MVP; Perry, medição, build, floor e crescimento com input;
Pipe, rollback, observabilidade e autorização; Spencer, drift e decisões duráveis;
Virgo, fonte canônica, escopo e validações. Specialists aguardam uso em projetos reais.

A Fase 7 acrescenta ao Bob os casos `bob-native-date-input`,
`bob-native-formatter`, `bob-reuse-existing-helper` e `bob-trivial-dependency`.
O cenário de factory com uma implementação reutiliza `bob-single-use-abstraction`.
São propostas sob pressão de necessidades futuras: o relatório deve rejeitar o
excesso e indicar a alternativa suficiente hoje. Há calibração com respostas
úteis e recomendações erradas que citam as palavras certas. Isso mede revisão
read-only, não uma implementação efetiva da solução.
Na baseline real da Fase 7, os cinco cenários passaram em 15/15 execuções com o
Bob atual; a “solution ladder” não foi adicionada. Modelo, calibração, custo e
limites estão em [CANONKIT_ROADMAP.md](CANONKIT_ROADMAP.md#fase-7--testar-a-solution-ladder-antes-de-adicioná-la-ao-bob).

```bash
npm run eval:quality -- --dry-run
npm run eval:quality -- --runs 3
npm run eval:quality -- --variant gard=out/gard-lean.md --runs 3   # A/B de corpo
```

- O agente vem **deste checkout** (`--agents` + `--agent`), não do que está
  instalado: dá para medir um corpo antes de publicá-lo. `--variant` troca só o
  corpo, mantendo nome, descrição e modelo — a pergunta que ele responde é se um
  corpo mais curto acha o mesmo tanto.
- Casos com achado exigem sinais do problema (`says`); todos exigem veredito na
  primeira linha (`firstLine`) e teto de linhas (`maxLines`). `notSays` rejeita
  sinais de recomendações incorretas; o resumo dá a média de linhas por agente.
- Os blocos globais são os instalados, como numa sessão real. Gasta crédito: roda
  à mão, não no `npm test`.
- Os testes herméticos verificam cobertura por core, regexes, respostas corretas
  e incorretas e o fluxo de `--rescore` com transcripts sintéticos. Isso valida o
  contrato lexical do eval; não prova raciocínio, leitura de callers, execução
  de comandos ou comportamento do modelo. A medição real continua manual, com
  `--runs 3` e `--save`, antes de atribuir resultados aos agentes. Os corpos e o
  runner não foram alterados nesta expansão.

Baseline anterior à expansão, com os 7 casos originais (2026-10-18, 3 execuções
por caso, modelo do frontmatter): Gard,
Quinn, Archie e Pixie perderam a persona, a Mission genérica e as regras que só
repetiam o comportamento padrão — corpo 21–31% menor. Listas de veto, checklists e
conhecimento de domínio ficaram.

| Corpo | Casos sustentados | Execuções | Corpo (caracteres) |
| --- | --- | --- | --- |
| anterior | 7/7 | 20/21 | gard 6,9k · quinn 4,9k · archie 7,4k · pixie 6,8k |
| enxuto | 7/7 | 20/21 | gard 4,8k · quinn 3,7k · archie 5,8k · pixie 5,4k |

Cada lado tem uma falha só pelo teto de linhas (34 e 32 de 30), com o defeito
encontrado. Sete casos com 3 execuções detectam uma perda grosseira, não uma
sutil: o que o corte tirou e nenhum caso cobre — as regras de contexto do Gard,
a Stance do Archie e do Pixie, os passos de hierarquia e microcopy do Pixie —
fica sem medida.

### Custo sempre carregado

Medido: os dois blocos mais as descrições dos 10 agentes core, que o Claude Code
lista em todo turno, somam ~12,0k caracteres (~3,0k tokens) — já contando a Risk
scale, que passou a existir uma vez no bloco em vez de catorze vezes nos agentes.
Antes da 1.1 eram ~14,5k (~3,6k tokens). As descrições dos specialists só pesam no
projeto que os instalou.

Por despacho, o corpo de um agente core tem ~3,7–8,7k caracteres (~0,9–2,2k
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
