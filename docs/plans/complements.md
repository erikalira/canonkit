# Plano: `canonkit tool add|remove|list` (graphify, openspec)

Status: aprovado pela usuária em 2026-10-19. Desenho revisado por Archie (aprova
com mudanças) e Gard (aprova com condições C1–C7). Implementação: Bob. Revisor
independente após a última edição: Quinn. ADR e README: Spencer.

## Objetivo

Ferramentas opcionais que complementam o canonkit, ativadas por projeto com um
comando, sem nunca instalar nada globalmente.

```
npx canonkit tool add graphify|openspec [--yes] [--dry-run]
npx canonkit tool remove graphify|openspec
npx canonkit tool list
```

Namespace `tool` (decisão da usuária, preferida ao `add` compartilhado sugerido
por Archie): o comportamento é diferente do `add` de especialistas (executa
binário de terceiros, pede confirmação, instala hooks git, `remove` não desfaz).
Consequência: sem checagem de colisão de nomes agente/ferramenta.

## Decisões fixadas

- **Só integra.** Binário ausente → imprime o comando de instalação com versão
  exata, exit 1, não escreve nada. Nunca `npm -g`, `uv`, `pipx`, `npx …@latest`, `uvx`.
- **Registro:** `tools/<name>.md`, frontmatter + corpo, como `agents/*.md`;
  adicionar `tools` a `package.json` "files". Frontmatter: `bin`, `pin`,
  `requires`, `install` (templates com `{pin}`), `setup` (listas de args fixas),
  `undo` (impresso, nunca executado). Corpo = regras do bloco, ≤3 linhas/ferramenta,
  sem repetir o que o `# graphify` global do `~/.claude/CLAUDE.md` já diz (só
  frescor + qual agente é dono). A pin vive só no frontmatter.
- **Bloco próprio** no `AGENTS.md` do projeto, marcadores
  `agent-team-config:complements:*`. Extrair do `rebuildProjectBlock`
  (bin/cli.js ~586) um helper CRLF-aware de reescrever/remover bloco, usado pelos
  dois blocos. Lista de ferramentas ativas = entradas do próprio bloco (não o
  disco: `openspec/` sobrevive ao remove). Escrita via temp + rename.
- **Ordem (uma função, testada):** preflight → confirmação → setup da ferramenta
  → bloco do canonkit por último (o `openspec init` pode reescrever AGENTS.md).
  Setup falhou → não escreve o bloco. Se surgiu um `CLAUDE.md` que não existia → aviso alto.
- **Nunca criar CLAUDE.md no projeto** (Claude Code passaria a ignorar AGENTS.md).
  Proibidos: `graphify claude install`, `graphify codex install`, qualquer
  `graphify <platform> install`, `graphify extract` (chama LLM).

### Por ferramenta

- **openspec** — npm `@fission-ai/openspec` (escopado; Node ≥ 20.19). Setup:
  `openspec init --tools claude,codex`. A 1.x não escreve bloco no AGENTS.md
  (remove blocos legados), mas pode reescrever o arquivo. Regra: specs e critérios
  de aceite vão para `openspec/` (Scott/Spencer), não para doc paralelo.
- **graphify** — PyPI `graphifyy` (**dois y**; `graphify` com um y é outro
  pacote — avisar no comando impresso, nunca sugerir o de um y). Preferir
  `--only-binary :all:` se houver wheels. Setup: `graphify hook install` (post-commit,
  post-checkout e merge driver) + `graphify update .` (sem LLM).
  **Antes:** `git config core.hooksPath` e `git rev-parse --git-path hooks`; se
  existe post-commit ou post-checkout, ou hooksPath definido → não roda, imprime
  como encadear. Nunca escrever em hooksPath global. Depois, conferir que os hooks
  escritos são só do graphify.
- **remove** — tira a entrada do bloco (último → remove o bloco). Imprime
  `graphify hook uninstall`; nunca toca em `openspec/` nem `graphify-out/`.

### Execução de processos (Gard C1–C4)

- Primeiro spawn do `bin/cli.js`: um helper só, argv em array, args literais do
  registro, nada derivado do projeto. Sem `shell: true` (não copiar
  `scripts/eval-routing.mjs:258`).
- Windows: resolver o binário percorrendo PATH × PATHEXT, pulando cwd e entradas
  relativas; `.cmd/.bat` → `process.env.ComSpec` com `["/d","/s","/c", abs, ...args]`
  e `windowsVerbatimArguments`.
- cwd = raiz do projeto validada; stdin ignorado; timeout; exit ≠ 0 → reporta e para.
- Antes de rodar: imprime caminho absoluto do binário, versão, comando exato e
  arquivos que serão tocados; pede y/N (`--yes` pula). Sem TTY e sem `--yes` → não roda.
- Versão instalada ≠ pin → aviso dentro da mesma confirmação; nunca atualiza.
- `--dry-run` não executa nada, nem `--version`.

### CLI

- `canonkit list` ganha uma linha apontando para `tool list`.
- `tool list`: pin, versão instalada (fora de dry-run), ativo no projeto ou não.
- Recusar rodar dentro do próprio repo do canonkit, como `addSpecialists` faz.

## Testes (Quinn)

- Binário stub no PATH: args exatos; nenhum CLAUDE.md criado.
- Windows: resolução de `.cmd` via shim temporário; shim plantado no cwd não é escolhido.
- `--dry-run` não faz spawn.
- Binário ausente → pin no comando impresso, exit 1, nada escrito.
- Hook existente ou `core.hooksPath` → graphify não instala.
- Setup falho → bloco não escrito.
- `tool add`/`remove` 2× → AGENTS.md byte-idêntico (LF e CRLF); bloco de
  especialistas intacto; remover a última ferramenta remove o bloco.
- Sem TTY sem `--yes` → não executa.

## Docs (Spencer)

- ADR curta: por que namespace `tool`, por que só integra, por que nunca CLAUDE.md.
- README: seção da `tool`, comandos de instalação com pin, aviso dos dois y.
- Notas: o rebuild pós-commit roda código de terceiros fora do gate do canonkit;
  hooks do graphify e o gate disparam em PreToolUse sem ordem garantida; hooks git
  são por clone; `graphify-out/` precisa estar no `.gitignore` ou ser versionado
  de propósito (neste repo `GRAPH_REPORT.md` está versionado e fica sujo a cada commit).

## Antes de publicar

- Verificar publisher de `graphifyy` (PyPI, histórico vs repo upstream) e do escopo
  `@fission-ai` (npm); registrar a checagem na ADR.
- Pins com ≥ 2 semanas (referência em 2026-10-19: openspec 1.14.3 latest;
  graphifyy 0.9.92 latest, 0.9.63 instalado localmente) — conferir datas.
- Bump de pin depois = revisão MEDIUM do Gard.

## Fora de escopo

Instalação global, aviso de repo pequeno, build com LLM, matriz de compatibilidade,
checagem automática de versão nova no `npm test` (só script manual).
