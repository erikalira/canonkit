# ADR 0007 — `git-ignore-sandbox-files`: esconder os placeholders do sandbox em `.git/info/exclude`

- Status: aceita
- Data: 2026-11-12
- Amplia a [ADR 0003](0003-tool-gitignore-block.md): mesma ideia (um bloco
  gerenciado que tira ruído do `git status`), mas num lugar local do clone e não
  versionado, e só por comando explícito.

## Contexto

O sandbox do Claude Code (bubblewrap) cria arquivos reais de 0 byte no host, na
raiz do projeto, como pontos de montagem dos caminhos que protege contra escrita:
`/.bash_profile /.bashrc /.gitconfig /.gitmodules /.idea /.mcp.json /.profile
/.ripgreprc /.zprofile /.zshrc` e, em `/.claude/`, `agents commands hooks
launch.json loop.md output-styles routines scheduled_tasks.json
settings.local.json workflows`. Dentro do sandbox parecem dispositivos de
caracteres 1:3 (`/dev/null` montado por cima); fora, são arquivos comuns de 0 byte.

Do lado de fora isso causa três problemas: aparecem como não rastreados e podem ser
commitados por engano; quebram `canonkit add <especialista>` (há um arquivo onde
precisa de um diretório); e fizeram o `doctor` acusar JSON inválido num
`settings.local.json` vazio.

## Decisão

1. Novo comando opt-in, por projeto: `canonkit git-ignore-sandbox-files [--remove]
   [--dry-run]`, rodado num terminal **fora** do sandbox. O nome diz quem ignora: o
   GIT ignora os arquivos que o sandbox cria; o comando não mexe no sandbox nem em
   permissão alguma. (Antes se chamava `sandbox-ignore`, que lia como "ignorar o
   sandbox".)
2. Ele grava um bloco marcado (`# canonkit:sandbox-placeholders:start|end`) no
   `.git/info/exclude` do clone (caminho vindo de `git rev-parse --git-path
   info/exclude`, compartilhado entre worktrees; symlink é recusado).
3. Só entram nomes de uma lista fixa de candidatos que, naquele momento, são
   arquivos regulares de 0 byte e não rastreados pelo git. Nomes que podem virar
   diretório recebem o par `/x` + `!/x/`, para que um diretório real continue visível.
   Nome já tratado por linha do próprio usuário fora do bloco é pulado.
4. Idempotente e reconciliador (re-rodar ajusta o bloco ao que existe agora);
   `--remove` tira só o bloco gerenciado e nunca altera as linhas do próprio usuário.
   Não é byte a byte: ao adicionar o bloco, linhas em branco/espaços no fim do
   arquivo são colapsados e um arquivo CRLF com EOL misto vira todo CRLF; o
   `--remove` também descarta a única linha em branco que a adição acrescentou.
5. `doctor` avisa (WARN) quando há placeholders não excluídos e quando um nome do
   bloco deixou de ser um arquivo regular vazio: ganhou conteúdo, virou symlink, ou
   virou diretório onde só cabe arquivo (ex.: `.mcp.json`; para nomes que aceitam
   diretório, um diretório real é normal e não avisa). Imprime o comando.
   Trata `settings.local.json` vazio (e, no Linux, o placeholder `/dev/null`) como
   nota informativa, não como JSON inválido.
6. `add` recusa, com saída 1 e antes de escrever qualquer coisa, quando o caminho
   necessário para um diretório está ocupado. Fora do sandbox, um arquivo vazio onde
   cabe um diretório ("is an empty file, but a directory is needed there") manda
   apagá-lo e rodar o comando de novo. Dentro do sandbox o caminho é protegido
   contra escrita, e a mensagem manda rodar do seu próprio terminal.
7. Rodar `git-ignore-sandbox-files` (adicionar/reconciliar) DENTRO do sandbox, depois que as
   recusas habituais passaram, não muda nada, mantém o bloco existente como está e
   sai com 0, com o aviso em stderr: lá os placeholders parecem dispositivos. Com
   marcadores alterados/duplicados ou `info/` (ou `info/exclude`) symlink ou não
   regular, ainda recusa com saída 1, como em qualquer lugar. `--remove` continua
   funcionando lá. Rode do seu próprio terminal.

## Alternativas consideradas

- **No `.gitignore` versionado.** Rejeitada: a esquisitice do sandbox de uma pessoa
  esconderia um `.mcp.json` real de todo mundo.
- **Automático no `install`.** Rejeitada: ampliaria o que o `install` escreve, de
  settings para metadados do git. Archie e Gard recomendaram contra; o usuário
  escolheu opt-in em 2026-11-12.
- **Ler ou escrever chave de sandbox/settings.** Não: nenhuma chave é tocada.
- **Recibo global.** Não: é local ao projeto, como a ADR 0003.

## Consequências aceitas

- Esconde por caminho, não por conteúdo: um `.mcp.json` real criado depois, num
  nome de arquivo do bloco, continua escondido até rodar `git-ignore-sandbox-files` de novo ou
  `--remove` (o `doctor` avisa).
- A regra é local ao clone: repete-se por clone e por conjunto de worktrees.
- Rodado dentro do sandbox, não altera nada, salvo recusa prévia com saída 1 (decisão 7).
- O texto diz "reduz ruído", nunca "protege". Arquivos já rastreados seguem rastreados.
- Nomes só são reconhecidos literalmente (`x`, `/x`, `!/x`, `/x/`). Uma linha de glob
  do usuário fora do bloco (ex.: `.claude/*`) não conta como tratando o nome; para
  nomes que podem ser diretório, o par `!/x/` do bloco pode tornar visível de novo um
  diretório real que o usuário havia escondido por glob. A ressalva vale para globs
  no próprio arquivo de exclude; uma regra do `.gitignore` continua prevalecendo
  sobre o `info/exclude`.
- Se `.git` for um arquivo cujo `gitdir:` aponta para outro diretório git válido, o
  comando grava o `info/exclude` DAQUELE repositório (só nomes estáticos de
  placeholder). Um worktree ligado usa o exclude compartilhado do repositório
  principal, e o comando avisa isso. Um submódulo grava o próprio
  `modules/<nome>/info/exclude` (não compartilhado). No checkout principal não há
  aviso extra.

## Segurança

Toda chamada ao git feita pelo comando (e pelas linhas do `doctor`) roda com
`core.fsmonitor=false` e `core.hooksPath=/dev/null` e com todas as variáveis `GIT_*`
do ambiente removidas: um
`core.fsmonitor` no config local do repositório poderia fazer `git ls-files` /
`git check-ignore` executarem código de um checkout que traga um `.git/config`
preparado. Um `git clone` simples não copia config, então o ataque exige um `.git`
pré-semeado. O `doctor` é somente leitura e não executa código do repositório.

## Revisitar quando

O sandbox parar de criar placeholders no host, mudar a lista de caminhos
protegidos, ou o aviso do `doctor` sobre conteúdo escondido se mostrar insuficiente.

## Achado incidental (não tratado aqui)

`legacyRunners` lendo um FIFO num caminho de settings trava o `doctor`.
