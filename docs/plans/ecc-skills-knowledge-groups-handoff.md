# Handoff — pendências da revisão de skills do ECC

Atualizado em 2026-11-12. O inventário G01–G28 foi concluído e os deltas aceitos foram aplicados às fontes locais em 2026-11-11. A revisão documental e os testes então registrados passaram; eficácia comportamental não foi medida e as mudanças ainda não foram instaladas no ambiente do usuário. O inventário detalhado e as tabelas comparativas foram removidos deste handoff.

## Ainda falta

1. **Corrigir referências quebradas** a `plans/learning-loop-design.md` em `docs/evals.md` e `docs/learning-loop.md`: atualizar ou remover os links.
2. **Avaliar antes de declarar qualidade:** executar `npm run eval:quality -- --runs 3` para os agentes alterados, quando autorizado; registrar resultados e limitações. A avaliação pode consumir crédito.
3. **Aplicar ao ambiente do usuário:** executar `node bin/cli.js install` para atualizar agentes em `~/.claude`, quando solicitado/autorizado.
4. **Resolver as permissões pendentes:** as linhas `permissions.allow` não foram gravadas porque `settings.json` estava protegido. Revisar e aplicar manualmente se ainda forem necessárias.
5. **Decidir mudanças adiadas:** qualquer gate genérico para comandos destrutivos ou execução de migrações deve ser uma change separada, com análise de Gard e Pipe. O delta de rede para Pipe continua fora do escopo; a linha de licença de assets pertence somente ao pack `game-art-direction`; não foi proposto delta para Quinn.

## Restrições

Não importar skills do ECC em massa nem tratar o inventário como autorização para instalar, publicar ou alterar política. A revisão não certifica a correção de exemplos ou APIs das skills externas.
