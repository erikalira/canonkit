# ADR 0001 — `canonkit tool`: um namespace próprio, que só integra

- Status: aceita; decisão de hooks automáticos substituída pela [ADR 0002](0002-graphify-git-hooks-opt-in.md)
- Data: 2026-10-19
- Dono: Spencer (registro); decisão da usuária, desenho revisado por Archie e Gard
- Plano de origem: `docs/plans/complements.md`
- Numeração: `NNNN-assunto-em-kebab-case.md`, sequencial a partir de 0001. Uma ADR
  nunca é reescrita depois de aceita: uma decisão nova abre outra ADR e marca esta
  como substituída.

## Contexto

O canonkit copiava arquivos: agentes, blocos de referência, skills. Duas
ferramentas de terceiros complementam o time e valem ser ativadas por projeto:
**graphify** (grafo do código, via hooks git) e **openspec** (specs e critérios de
aceite em `openspec/`). Ativá-las significa, pela primeira vez, **executar o binário
de outra pessoa dentro do projeto de alguém**, e uma delas instala hooks git.

## Decisão

1. **Namespace `tool`**: `canonkit tool add|remove|list`, separado de `add|remove`
   dos specialists.
2. **Só integra.** Binário ausente: imprime o comando de instalação com a versão
   exata e sai com 1, sem escrever nada. Binário presente: roda o `setup` da própria
   ferramenta e, por último e só se o setup deu certo, escreve o bloco gerenciado
   "Project tools" no `AGENTS.md` do projeto.
3. **Nunca cria `CLAUDE.md` no projeto.** O parser do registro (`tools/<nome>.md`)
   recusa `graphify claude install`, `graphify codex install`, qualquer
   `<plataforma> install` (só `hook install` passa) e `extract`.
4. Registro em `tools/<nome>.md` (pin, binário, comandos, arquivos tocados, como
   desfazer). A pin vive só no frontmatter.

## Alternativas consideradas

- **Compartilhar `add` com os specialists** (sugestão de Archie). Rejeitada pela
  usuária: o `add` de specialists copia um arquivo e `remove` desfaz tudo; `tool add`
  executa um binário de terceiros, pede confirmação, pode instalar hooks git e
  `remove` não desfaz o que a ferramenta escreveu. Um verbo só para os dois esconde
  essa diferença. Custo aceito: não há checagem de colisão de nomes entre agente e
  ferramenta.
- **Instalar a ferramenta quando falta** (`npm -g`, `pipx`, `uvx`, `npx …@latest`).
  Rejeitada: o canonkit passaria a escolher versão, origem e escopo de código que
  roda na máquina, e `@latest` instala o que foi publicado hoje de manhã.
- **Deixar o `claude install` do graphify escrever a integração.** Rejeitada: ele
  cria um `CLAUDE.md` na raiz, e com um `CLAUDE.md` no projeto o Claude Code deixa
  de ler o `AGENTS.md` — as regras do time e das ferramentas somem sem aviso.
  `extract` chama um LLM (custo e dados saindo do projeto, sem decisão de ninguém).
  Se um setup fizer surgir um `CLAUDE.md`, o canonkit avisa em voz alta.

## Consequências aceitas

- O usuário instala a ferramenta por conta própria; o canonkit só imprime o comando.
- O comando de instalação impresso é decisão da usuária (2026-10-19), e difere do
  que o canonkit aceitaria *executar*:
  - openspec: `npm install --global --ignore-scripts @fission-ai/openspec@<pin>`.
    O "nunca `npm -g`" do plano vale para o que o canonkit **roda**, não para o que
    **imprime**: o resolvedor procura só no `PATH` e nunca em `node_modules/.bin`
    do projeto (um binário plantado num repo clonado não pode ser o executado),
    então uma instalação local não seria encontrada. Evidência na implementação:
    o resolvedor ignora toda entrada de `PATH` relativa, inexistente ou dentro do
    projeto (por `realpath`), o que inclui `<projeto>/node_modules/.bin`, que o
    `npx canonkit` põe na frente; o processo filho recebe o mesmo `PATH` filtrado e,
    no Windows, `NoDefaultCurrentDirectoryInExePath=1`.
  - graphify: `python -I -m pip install --user --only-binary :all: graphifyy==<pin>`.
    O `-I` foi acrescentado na revisão do Gard: impede que arquivos de um projeto
    clonado sejam importados como o próprio pip. Verificado com `--user`.
- Quem roda o binário: sem shell, argv em array, caminho absoluto resolvido por
  `PATH × PATHEXT` pulando o diretório atual (`bin/exec.js`), stdin fechado, timeout,
  confirmação y/N (sem TTY e sem `--yes`, não roda).
- O rebuild pós-commit do graphify e o merge driver que ele grava em `.git/config`
  (roda o graphify a cada merge) são código de terceiros fora do gate do canonkit;
  hooks git são por clone.
- **Risco residual aceito (Gard F1, Quinn R1).** Os hooks `post-commit`/`post-checkout` e o
  merge driver iniciam o Python com `-c` / `-m graphify` a partir da raiz do worktree,
  e o Python procura ali primeiro (confirmado no `hooks.py` da 0.9.76: sem `-I`,
  `-P` nem `PYTHONSAFEPATH`). Os hooks também executam o interpretador nomeado em
  `graphify-out/.graphify_python`. O canonkit recusa o setup quando `graphify/` ou
  `graphify.py` existe na raiz, ou quando `graphify-out/.graphify_python` está
  versionado, e avisa na confirmação. Essa checagem roda **uma vez, no `tool add`**; a
  ameaça continua depois: uma branch posterior pode trazer `graphify.py`, um módulo
  que o graphify importa (ex.: `networkx.py`) ou um `.pyc`/`.pyd`/`.so` sem fonte, e o
  próximo checkout, commit ou merge o executa pelos hooks ou pelo merge driver, sem
  nenhum sinal. O canonkit não mitiga além da checagem de instalação e do aviso; é um
  risco de habilitar os hooks do graphify, aceito. Só o graphify corrige, iniciando o
  Python com `-I`/`-P` ou `PYTHONSAFEPATH`. Aberto: reportar ao upstream.- O graphify reescreve as cópias de skill de nível de usuário que instalou antes,
  quando o selo de uma skill é mais antigo que o pacote instalado (uma vez por upgrade,
  em qualquer comando). O registro ganhou o campo `env:` (pares
  `CHAVE=valor` literais por ferramenta) e o canonkit passa
  `GRAPHIFY_NO_AUTO_REFRESH=1` em toda execução do graphify (verificado com a 0.9.76
  e um HOME falso). Fora do canonkit (shell, hooks, agentes) o graphify ainda faz isso,
  a menos que a variável esteja no ambiente do próprio usuário.
- O `env:` do registro recusa `PATH`, `PATHEXT`, `COMSPEC`, `PYTHON*`, `NODE_*`,
  `NPM_CONFIG_*`, `LD_*` e `DYLD_*`, porque mudam o que é carregado.
- O openspec roda com `OPENSPEC_TELEMETRY=0` e `DO_NOT_TRACK=1` (`env:` do registro)
  nas execuções do canonkit; as do usuário continuam enviando telemetria.
- `--version` roda a partir do diretório do próprio binário, não do projeto, para que
  nada do projeto seja lido antes da confirmação.
- Verificado rodando as versões fixadas: o setup do graphify 0.9.76 duas vezes num
  repo de teste gravou só `post-commit`/`post-checkout`, o merge driver em
  `.git/config`, `.gitattributes` e `graphify-out/`, sem `CLAUDE.md`, de forma
  idempotente; o do openspec 1.14.0 duas vezes, com stdin fechado, não perguntou
  nada, foi idempotente e não criou `CLAUDE.md`. O `pip install` impresso para o
  graphify, com `--only-binary :all:`, funcionou para a 0.9.76 no Windows com
  Python 3.12.
- A lista de ferramentas ativas é a do bloco no `AGENTS.md`, não a do disco:
  `openspec/` e `graphify-out/` sobrevivem ao `remove`.

## Publisher e pin — o que foi verificado (2026-10-19)

**openspec** — npm `@fission-ai/openspec`
- Mantenedor `tabish_`; repositório github.com/Fission-AI/OpenSpec; `engines` node
  >= 20.19.0.
- 1.14.0 não tem scripts `install`/`postinstall` (por isso `--ignore-scripts` no
  comando impresso é inofensivo e protege contra versões futuras).
- Pin **1.14.0**, publicada em 2026-09-30. A última em 2026-10-19 era 1.14.3
  (2026-10-17), não adotada por ter menos de 2 semanas.

**graphify** — PyPI `graphifyy` (**dois y**; `graphify` com um y é outro pacote)
- As URLs do projeto apontam para github.com/Graphify-Labs/graphify; exige Python
  >= 3.10; existe wheel `py3-none-any` para 0.9.76 (por isso `--only-binary :all:`
  não quebra a instalação).
- Pin **0.9.76**, enviada em 2026-10-04. A última, 0.9.92 (2026-10-16), tem menos
  de 2 semanas.

**Proveniência (verificada em 2026-10-19):**
- `graphifyy` 0.9.76: a wheel tem atestado de Trusted Publishing, publisher GitHub,
  repositório Graphify-Labs/graphify, workflow `publish.yml` — bate com o repositório
  declarado pelo projeto.
- `@fission-ai/openspec` 1.14.0: assinaturas do registry e atestados presentes; o
  único mantenedor é `tabish_`.

**Ainda em aberto:** o bundle sigstore não foi verificado offline (o PyPI o verifica
no upload). A checagem anterior da conta do uploader contra os mantenedores do upstream
foi substituída pelo atestado, que prova de qual repositório e workflow veio a wheel,
não quem mantém o repositório.

## Revisar quando

- Subir uma pin: revisão **MEDIUM do Gard** (publisher, scripts de instalação,
  idade >= 2 semanas), e atualizar as datas acima numa ADR nova ou numa nota datada.
- Uma terceira ferramenta, ou uma que precise de `setup` fora de argumentos
  literais (o registro recusa o que exigiria escape no `cmd.exe`).
- Alguém pedir que o canonkit instale a ferramenta: é a decisão 2 desta ADR.
- O openspec ou o graphify passarem a escrever `CLAUDE.md` por padrão.
