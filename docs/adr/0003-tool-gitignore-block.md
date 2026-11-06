# ADR 0003 — `tool add` escreve um bloco no `.gitignore`

- Status: aceita
- Data: 2026-11-04
- Amplia a decisão 2 da [ADR 0001](0001-tool-namespace-integrate-only.md): além do
  bloco "Project tools" no `AGENTS.md`, o canonkit escreve um segundo bloco
  gerenciado, no `.gitignore` do projeto.

## Contexto

O setup do graphify gera `graphify-out/` com bem mais do que o projeto precisa
versionar: `graph.json` (grande, reescrito a cada `update`), `cache/`,
`manifest.json` (por mtime), `cost.json`, snapshots datados, consultas salvas em
`memory/` e `.graphify_python` — o interpretador que os hooks do graphify executam,
que o preflight já recusa quando está versionado. A doc dizia só "ponha no
`.gitignore` ou versione de propósito"; na prática cada projeto repetia à mão as
mesmas duas linhas, e quem esquecia commitava o cache.

## Decisão

1. O registro (`tools/<nome>.md`) ganha a lista `gitignore:`: padrões relativos e
   literais (sem `..`, sem caminho absoluto), validados no parse.
2. Depois de um setup bem-sucedido, e antes do bloco do `AGENTS.md`, `tool add`
   grava esses padrões entre os marcadores
   `# agent-team-config:gitignore:<nome>:start|end`. Repetir o `add` não muda o
   arquivo; CRLF é preservado.
3. Para o graphify: `graphify-out/*` e `!graphify-out/GRAPH_REPORT.md`. O relatório
   é o que o bloco do projeto manda os agentes lerem primeiro; o resto é
   reconstruído por `graphify update .` (o único setup que o canonkit roda — sem
   `extract`, o grafo é só AST e reproduzível) ou é local.
4. Se o `.gitignore` já tem regras para o mesmo diretório fora do bloco, nada é
   escrito: os padrões valem pelo último que casa, e um bloco anexado depois
   anularia a decisão do projeto sem aviso.
5. Arquivos já commitados continuam rastreados; o canonkit os lista e imprime o
   `git rm --cached` que resolve, sem rodar — mexer no índice é decisão de quem vai
   commitar.
6. `tool remove` deixa o bloco: `graphify-out/` continua no disco, e tirar as
   regras viraria uma pilha de arquivos não rastreados.

## Alternativas consideradas

- **Versionar também `graph.json`** (o que guias da comunidade sugerem, e o que o
  merge driver do graphify pressupõe). Rejeitada como default: 360 KB que mudam a
  cada commit, reproduzíveis com um `update`. Continua a um `!` de distância.
- **Só documentar.** Era o estado anterior; o esquecimento é o caso comum.
- **`.gitignore` dentro de `graphify-out/`.** Não depende do `.gitignore` da raiz,
  mas o graphify pode recriar ou limpar o diretório, e quem lê o `.gitignore` da
  raiz não vê a regra.

## Consequências aceitas

- O canonkit passa a escrever dois arquivos do projeto, ambos só dentro de blocos
  marcados.
- Um projeto que quer outra política escreve as próprias regras para
  `graphify-out/` fora do bloco, e o canonkit as respeita.
