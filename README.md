# Agent Team Config

Versioned source for the agent team used with Claude Code.

Each agent is a single Markdown file in `agents/`, stored in exactly the format
the runtime reads. Installing is a copy — there is no generation step and
nothing to reconcile by hand.

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

Linux e macOS:

```bash
./scripts/install.sh
```

Windows (PowerShell):

```powershell
.\scripts\install.ps1
```

Se a política de execução bloquear scripts locais, rode somente essa execução
com bypass, sem alterar a configuração permanente do sistema:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

Copia os 10 agentes core para os dois caminhos de runtime:

- `~/.agents`
- `~/.claude/agents`

Ambos são lidos pelo Claude Code. O script mantém os dois idênticos, que é o que
impede a divergência entre eles.

As listas de core são explícitas e validadas nos dois instaladores. Um arquivo
novo em `agents/` é specialist até ser nomeado ali — adicionar um agente nunca o
instala em todo lugar por acidente. Os instaladores também **removem** specialists
que tenham sobrado no nível de usuário de instalações anteriores; uma cópia
esquecida ali fica disponível em todo projeto e anula a regra.

### Specialists, por projeto

Rodado **de dentro do projeto** que vai receber os agentes:

```bash
cd ~/meu-projeto
~/erika/agent-team-config/scripts/add-specialist.sh maya nova
```

Escolher quais specialists o projeto tem continua sendo decisão explícita sua —
o script só cuida do que é fácil esquecer. Dois runtimes precisam saber do
agente, e esquecer um deles é a falha que o script existe para evitar:

- **Claude Code** lê `.claude/agents/<nome>.md`
- **Codex** lê `AGENTS.md` — ele não olha `.claude/agents/`

O script copia o arquivo **e** registra o agente no `AGENTS.md` do projeto, num
passo só. O bloco é reconstruído a partir do que está de fato em disco, então o
`AGENTS.md` sempre reflete a realidade e não o histórico de comandos.

```bash
add-specialist.sh --list           # o que este projeto tem instalado
add-specialist.sh --remove nova    # remove o arquivo e a entrada
```

Removendo o último specialist, o bloco inteiro sai do `AGENTS.md`. Tudo fora dos
marcadores é preservado, e o script se recusa a rodar dentro do próprio
`agent-team-config` ou a instalar um agente core.

### Arquivos de referência globais

```bash
./scripts/install-reference.sh
```

Escreve a descrição do time em `~/AGENTS.md` (lido pelo Codex) e garante que
`~/.claude/CLAUDE.md` importe esse arquivo (lido pelo Claude Code). Assim os dois
runtimes têm a mesma noção de quem é core, quem é specialist e onde ficam as
fronteiras.

Só o trecho entre os marcadores é gerenciado:

```markdown
<!-- agent-team-config:start -->
...conteúdo de reference/agents-block.md, sobrescrito a cada execução...
<!-- agent-team-config:end -->
```

Tudo fora dos marcadores é preservado. O script é idempotente e, na primeira
execução, substitui uma seção `# subagentes` escrita à mão em vez de duplicá-la.

## Validação

```bash
./scripts/validate.sh          # relatório completo
./scripts/validate.sh --quiet  # só falhas e o resumo
```

Read-only, sai com código diferente de zero em qualquer falha. Automatiza o
protocolo do Virgo e checa as convenções que este README promete:

- frontmatter — `name` bate com o nome do arquivo, `description` presente e útil,
  `model` declarado e válido;
- estrutura — Mission, Responsibilities, Collaboration, Expected Output, autoridade,
  fronteiras e LOW/MEDIUM/HIGH;
- a regra de veto — quem declara veto também diz o que fazer quando é rejeitado;
- o split core/specialist — todo agente está em exatamente uma das listas, os
  instaladores Bash e PowerShell concordam, e todos aparecem em
  `reference/agents-block.md`;
- o grafo de escalation — ninguém isolado, e ninguém escalando para um papel
  genérico ("the security owner") em vez de um agente nomeado;
- sintaxe dos scripts e higiene do repo.

Checa a regra, não uniformidade: `pipe` usa "Operational authority", `virgo` não
classifica risco de produto, e ambos passam.

## Editing an agent

1. Edite `agents/<name>.md` neste repo.
2. Se for core, rode `./scripts/install.sh` (Linux/macOS) ou
   `.\scripts\install.ps1` (Windows).
3. Se for specialist, rode `add-specialist.sh <nome>` de novo nos projetos que o usam.
4. Se mexeu na descrição do time, rode `./scripts/install-reference.sh`.
5. Rode `./scripts/validate.sh`.
6. Commit.

Não edite `~/.agents`, `~/.claude/agents`, `.claude/agents/` de um projeto, nem o
bloco gerenciado do `~/AGENTS.md` — a próxima instalação sobrescreve. Este repo é
a única fonte de verdade.

## File format

```markdown
---
name: <agent-id>
description: "<one-line summary shown in the agent picker>"
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
intention, and the runtime quietly uses the session default instead.

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
