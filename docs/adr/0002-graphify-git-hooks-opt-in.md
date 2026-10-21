# ADR 0002 — Hooks Git do Graphify por opt-in

- Status: aceita (Fase 6 do roadmap)
- Data: 2026-10-20
- Substitui somente o default de hooks automáticos da [ADR 0001](0001-tool-namespace-integrate-only.md).

## Decisão

`canonkit tool add graphify` executa apenas `graphify update .` e registra o
bloco no `AGENTS.md`. `--yes` não autoriza instalar hooks. Para instalar os
hooks e o merge driver, o usuário precisa passar `--with-git-hooks`; o comando
expõe o risco de executar código de branches antes da confirmação. A flag é
recusada em outros comandos/ferramentas. Não há nova dependência nem nova pin.

O preflight mantém Git, raiz do repositório, recusa de `graphify/` e `graphify.py`
locais e recusa do interpretador versionado. Os checks contra sobrescrita de
hooks e `core.hooksPath`, assim como a verificação pós-instalação, continuam no
modo opt-in. Hooks alheios e hook managers não bloqueiam o modo manual.

## Evidência upstream

Em 2026-10-20, a inspeção do
[hooks.py fixado na 0.9.76](https://github.com/Graphify-Labs/graphify/blob/v0.9.76/graphify/hooks.py)
confirmou probes e execução Python sem `-I`/`-P`, fallback de interpretador em
`graphify-out/.graphify_python` e merge driver via `-m graphify`. A
[branch upstream v8 consultada](https://github.com/Graphify-Labs/graphify/blob/v8/graphify/hooks.py)
também mantém probes sem isolamento e o merge driver via `-m graphify`.
Não há evidência de correção suficiente nesses caminhos para manter a automação
como default. Isso é inspeção de fonte, não teste de todas as versões recentes;
não justifica trocar a pin. Os preflights atuais só detectam alguns arquivos
presentes na instalação, sem proteger contra módulos de uma branch futura.

## Compatibilidade e migração

Clones existentes conservam hooks, `.git/config` e `.gitattributes`. Repetir o
`add` sem flag não reinstala nem remove automação: detecta blocos Graphify no
diretório de hooks efetivo e configuração `merge.graphify`, avisando que continuam
habilitados. `--dry-run` mostra o plano, sem executar nem Git ou `--version`;
portanto não detecta configuração existente.

Para continuar com automação, executar `tool add graphify --with-git-hooks`
após aceitar o risco de confiar em toda branch. Para migrar ao modo manual,
revisar e executar `graphify hook uninstall`, conferir `graphify hook status`,
`git config --get-regexp '^merge\.graphify\.'` e o diff de `.gitattributes`.
O uninstall upstream da pin retira seus blocos e configuração de merge,
preservando as demais linhas. Em hook managers, revisar também chamadas
encadeadas à mão. O CanonKit não executa essa migração por conta própria.
`tool remove` continua retirando somente a entrada do bloco gerenciado.

## Validação e limites

Testes herméticos com CLI real, Git e binários simulados cobrem default sem
automação, opt-in, confirmação, dry-run, escopo da flag, preflight, preservação e
aviso para clones existentes, falha parcial e checks pós-instalação anteriores.
Eles verificam a seleção de comandos pelo CanonKit, sem provar que qualquer
versão arbitrária de Graphify respeita o plano. Execuções manuais de Graphify
continuam sendo execução explícita de software de terceiros no projeto;
automação previamente habilitada continua sujeita ao risco documentado.
