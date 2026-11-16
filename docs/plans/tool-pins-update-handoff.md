# Handoff — pendências do Graphify e OpenSpec

Atualizado em 2026-11-12. A tentativa de atualização dos pins foi adiada pelo usuário em 2026-11-06; manter os pins atuais de Graphify e OpenSpec até nova decisão. Não alterar `bin/cli.js` ou testes sem considerar as mudanças preexistentes no working tree.

## Aguardando decisão

O usuário ainda não confirmou se quer iniciar os itens abaixo. Ao retomar, confirmar o escopo antes de editar:

1. Incorporar no `tools/graphify.md` apenas as regras úteis, preservando a regra de atualização do Graphify; revisar evals e a justificativa em `docs/tools.md`/ADR 0003.
2. Manter `graphify codex install` recusado.
3. Manter hooks Git opt-in e explicar como ativá-los e o risco.
4. Atualizar detecção, mensagens, testes e docs para instalações que escrevem dois ou quatro hooks.
5. Só atualizar pins depois da janela de estabilidade definida em ADR 0001 e de revisão de Gard; revalidar a saída de `openspec init` e as referências de versão.

Avaliação com modelo real e inclusão de OpenCode em `openspec init` são decisões separadas; o padrão atual é não executar nenhuma delas. Não fazer commit sem autorização.
