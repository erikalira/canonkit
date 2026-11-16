# ADR 0008 — `tool add openspec --harness`: o usuário escolhe para quais harnesses o openspec é configurado

- Status: aceita
- Data: 2026-11-12
- Amplia a [ADR 0001](0001-tool-namespace-integrate-only.md): o `setup` do registro
  deixa de ser só argumentos literais e passa a aceitar um único argumento
  parametrizado, `{harness}`, resolvido a partir de uma lista fechada.
- Dono: Spencer (registro). Revisões em 2026-11-12: Archie (contrato do registro e da CLI): aprovada com condições, atendidas (linha de config de usuário no registro; aviso do Copilot só no registro). Gard (lista permitida, argv e symlinks): aprovada, sem condições. Quinn (testes): aprovada com condições, atendidas (cancelamento do menu; FIFO no doctor).

## Contexto

O `setup` do openspec era fixo: `init --tools claude,codex`. Quem usa OpenCode ou
GitHub Copilot ficava sem as skills e comandos do openspec no seu harness, e a única
saída era rodar `openspec init` por fora do canonkit, sem a confirmação, sem a lista de
arquivos tocados e sem a checagem de symlink. O openspec aceita cerca de 50 valores em
`--tools`; o canonkit só tem evidência, e teste, de quatro.

A [ADR 0001](0001-tool-namespace-integrate-only.md) (seção "Revisar quando", linhas
146-147) previa este gatilho: uma ferramenta que precise de "`setup` fora de argumentos
literais". Esta ADR é a resposta.

## Decisão

1. **Lista fechada de exatamente quatro valores:** `claude`, `codex`, `opencode`,
   `github-copilot`. São os ids do próprio openspec. Não é o vocabulário do `install`,
   onde a flag é `--copilot`: a diferença é de propósito (o valor vai para o
   `openspec init --tools`, que não conhece `copilot`). Quem digita `copilot` recebe
   a sugestão `github-copilot`.
2. **Forma no registro** (`tools/openspec.md`): `harness:` é uma lista com os caminhos
   que cada valor escreve; `defaultharness: claude,codex`; `setup: init --tools
   {harness}`. `{harness}` só vale como argumento inteiro do setup, uma vez. Os valores
   são chaves de consulta no registro, nunca texto copiado para o argv: o argv sai da
   ordem do registro, não da ordem digitada. O `forbiddenStep` roda de novo em cada
   passo composto.
3. **Validação estrita.** Sem `trim`, sem case-fold. Elemento vazio, `all`, `none`,
   `--x`, unicode e flag repetida são recusados; duplicatas são descartadas. Nada
   roda antes: nem o `--version`. Aceita `--harness a,b` e `--harness=a,b`.
4. **Resolução.** A flag válida vence, mesmo com `--yes`. Sem flag: `--yes`, sem TTY ou
   `TERM=dumb` usam o padrão `claude,codex`; um TTY pergunta, com claude e codex
   pré-marcados; `--dry-run` nunca pergunta (usa o padrão).
5. **`touches` gerado da escolha.** A prévia e o `--dry-run` listam só os caminhos dos
   harnesses escolhidos, mais duas linhas fixas. A linha da config de usuário do
   openspec mora no registro (`touches:` de `tools/openspec.md`), para que uma subida
   de pin a reverifique. Só "adds to the harnesses configured earlier; removes none"
   é fixa no código.
6. **A escolha não é gravada** no `AGENTS.md` nem aparece no `tool list`. O estado fica
   em disco, no openspec: um segundo `tool add openspec --harness X` ACRESCENTA X e
   mantém os anteriores, e `init --tools none` não remove nada. Por isso o
   `tool remove` lista os arquivos de TODOS os harnesses possíveis e diz que o canonkit
   não consegue removê-los.
7. **Recusa de symlink** nos diretórios de topo onde a escolha escreve (`openspec/`,
   `.claude/`, `.agents/`, `.opencode/`, `.github/`): um link ali mandaria a escrita do
   openspec para onde ele aponta. Sai com 1, antes de rodar. O `CLAUDE.local.md` passa a
   ser vigiado, como o `CLAUDE.md`.
8. **`github-copilot` escreve em `.github/skills` e `.github/prompts`.** Observado na
   1.14.0 e coberto por teste; não é garantia do openspec. São pastas que normalmente se
   commitam e o time inteiro recebe: o `tool add` avisa antes da confirmação.
9. **Config de usuário.** Evidência de execuções em diretório de teste com o openspec
   1.14.0: um PRIMEIRO `init` não grava nenhuma; uma reexecução num projeto já
   inicializado grava `$XDG_CONFIG_HOME/openspec/config.json` (`%APPDATA%` no Windows).
   A documentação anterior dizia que o `init` sempre gravava; estava errada.

## Alternativas consideradas

- **Aceitar qualquer um dos ~50 valores do openspec.** Rejeitada: cada valor escreve em
  caminhos que o canonkit não verificou, e a lista de arquivos tocados, a recusa de
  symlink e o aviso de pasta compartilhada deixariam de ser verdadeiros.
- **Gravar a escolha** (no bloco do `AGENTS.md` ou em arquivo do canonkit). Rejeitada:
  duplicaria um estado que o openspec já mantém em disco e divergiria dele, porque o
  openspec nunca remove um harness.
- **Parsing tolerante** (`trim`, minúsculas, aceitar `copilot`). Rejeitada: o texto do
  usuário viraria argv por normalização; uma lista fechada e exata mantém só chaves do
  registro chegando ao processo.
- **Um parser genérico de opções por ferramenta.** Rejeitada: há uma só flag com valor;
  `--harness` é içado antes da separação por traço e o resto do CLI não muda.

## Consequências aceitas

- Reexecutar `tool add openspec` com o padrão ACRESCENTA `claude` e `codex` ao que já
  existe, mesmo que o projeto tenha só OpenCode. Nada é removido nunca.
- O `tool remove` não desfaz os arquivos do openspec; só a entrada do `AGENTS.md`.
- Subir a pin exige reverificar os caminhos de cada um dos quatro harnesses (os da
  tabela do registro vêm da 1.14.0). A subida é MEDIUM e o Gard revisa, como na ADR 0001.
- Os caminhos de `github-copilot` e a ausência de config de usuário no primeiro `init`
  são observações da 1.14.0, não contrato do openspec.
- Limite residual: a recusa de symlink checa só os diretórios de escrita de topo; um
  `.claude/skills` que seja symlink dentro de um `.claude` real não é pego.
- Limite residual: `github-copilot` não escrever em `.github/workflows` é observação da
  1.14.0, não garantia; reverificar ao subir a pin.

## Revisitar quando

- Subir a pin do openspec (reverificar caminhos por harness e o item 9).
- O openspec passar a remover harnesses, ou a gravar a escolha de forma consultável:
  então o canonkit poderia mostrá-la no `tool list` e desfazer.
- Alguém pedir um quinto valor, ou o openspec renomear um dos ids.
- Uma segunda ferramenta precisar de argumento parametrizado.
