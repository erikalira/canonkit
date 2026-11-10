# ADR 0006 — Modelo e effort escolhidos pela pessoa, a partir do que o harness informa

- Status: aceita
- Data: 2026-11-10
- Mudança: `openspec/changes/runtime-model-discovery`
- Os fatos sobre o Claude Code são de 2026-11-10 (versão 2.1.322); a evidência está em
  `openspec/changes/runtime-model-discovery/evidence.md`.

## Contexto

Cada agente declarava `model: opus|sonnet|haiku`, um rótulo da Anthropic. Para os
outros harnesses, o canonkit traduzia esse rótulo por tabelas fixas (`CODEX_MODELS`,
depois `CODEX_EFFORTS`). Catálogos e níveis de effort mudam todo mês e variam por
assinatura, então qualquer equivalência embarcada fica velha para alguém. No Claude
Code o próprio harness age sobre o campo `model:`: o rótulo da fonte escolhia o
modelo de quem instalava.

Cada harness sabe dizer o que oferece. O Claude Code lista aliases e efforts no
`claude --help`. A ferramenta Agent aceita os parâmetros `model` e `effort`, que têm
precedência sobre o frontmatter do agente.

## Decisão

1. **Não há equivalência entre fornecedores.** Os agentes declaram
   `need: light|standard|deep`, que descreve o trabalho e não cita modelo. Sem
   escolha configurada, nenhum agente gerado fixa modelo ou effort: vale o da sessão.
2. **O harness é consultado em tempo de execução** (`canonkit models refresh`), e a
   pessoa escolhe a partir dessa lista (`canonkit models setup`). As escolhas ficam
   em `~/.canonkit/models.json` e, opcionalmente, em `<projeto>/.canonkit/models.json`,
   resolvidas campo a campo: agente no projeto, nível no projeto, agente do usuário,
   nível do usuário, herdar.
3. **Escolhas de projeto chegam pelos parâmetros de dispatch, não por cópias.** Os
   agentes core continuam só no nível do usuário. Dentro de um projeto, a skill
   `orchestrate` lê `models show --json` e passa `model` e `effort` na ferramenta
   Agent. O frontmatter gerado pelo `install` guarda só a escolha do usuário, como
   padrão para um dispatch não planejado.
4. **"Projeto" tem um único significado:** a raiz do repositório Git de onde o
   comando roda (de qualquer subpasta), ou a pasta atual fora de um repositório,
   nunca a pasta pessoal. `models setup --project`, `add`, `models show` e `doctor`
   usam a mesma raiz. Um arquivo numa pasta acima do repositório não vale. O arquivo
   e a pasta `.canonkit` do projeto não são seguidos quando são links, porque vêm de
   quem escreveu o repositório.
5. **Regra de versão.** `models.json` e a saída de `models show --json` estão na
   versão 1. Chaves novas mantêm a versão; ela só muda quando um campo existente muda
   de sentido. Um `models.json` de outra versão é recusado, nunca sobrescrito. O
   catálogo é cache: se tiver formato desconhecido, a descoberta o substitui.
6. **Claude Code primeiro.** Esta mudança entrega descoberta e aplicação só para o
   Claude Code. Codex, OpenCode e Copilot ficam com formato de configuração e
   adaptadores definidos, mas herdam o modelo da sessão até uma mudança de
   continuação.

## Alternativas consideradas

- **Manter tabelas por fornecedor, atualizadas a cada release.** Rejeitada: o dado
  muda mais rápido que o release e depende da conta de cada pessoa.
- **Manter `model: opus` como nome de nível.** Rejeitada: no Claude Code o harness
  age sobre esse campo, que é justamente o acoplamento a remover.
- **Cópias por projeto dos agentes core, com o modelo do projeto.** Rejeitada: os
  parâmetros de dispatch já levam a escolha do projeto, sem duplicar quinze arquivos
  em cada repositório nem criar divergência entre cópias.
- **Escolher automaticamente "o melhor modelo".** Rejeitada: custo, cota e acesso
  são da pessoa, e o canonkit não tem como avaliá-los.

## Quando reavaliar

- Quando a mudança de continuação trouxer adaptadores para Codex (`codex debug
  models`, aplicação pelos arquivos de papel), OpenCode e Copilot.
- Se o Claude Code ganhar um comando que liste modelos de forma estável: o
  adaptador troca a leitura do `--help` por ele.
- Se o campo `effort` do frontmatter se mostrar ignorado. Hoje está documentado, mas
  não teve efeito observável no teste; foi mantido por decisão de quem mantém o kit.

## Consequências aceitas

- **Mudança incompatível** no frontmatter: um agente com `model:` deixa de validar, e
  a mensagem pede `need:`.
- Quem usa Codex perde, até a continuação, o effort por nível que a tabela dava. Os
  agentes do Codex herdam modelo e effort da sessão. Isso fica temporariamente aquém
  do "modelo e effort fixos por agente" que a
  [ADR 0004](0004-full-quality-harnesses-only.md) aponta como parte do valor do time.
  A continuação devolve esse controle, agora escolhido pela pessoa.
- A leitura do `--help` é frágil. O registro marca `confidence: "help-text"`, e um
  texto irreconhecível vira `unknown`, nunca erro.
- Um repositório clonado pode mudar o modelo e o effort dos agentes, inclusive dos
  revisores. O `doctor` lista cada mudança em relação às escolhas da pessoa, e a
  skill `orchestrate` manda avisar antes de dar a um revisor com veto um modelo mais
  fraco que o dela.
- O lead pode esquecer de passar os parâmetros. O frontmatter ainda dá o padrão do
  usuário, mas não a escolha do projeto. O `doctor` não detecta esse caso.
