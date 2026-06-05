# debugging

## Quando usar

Use para investigar falha, erro, regressao, comportamento inesperado, teste quebrado ou problema reportado em codigo existente.

## Processo

1. Reproduza ou entenda o sintoma com o menor comando seguro possivel.
2. Colete contexto: erro, stack trace, testes, logs seguros, issue e mudancas recentes.
3. Identifique area afetada e comportamento esperado.
4. Formule hipoteses pequenas e verificaveis.
5. Isole causa raiz antes de editar.
6. Corrija com a menor mudanca suficiente.
7. Adicione teste de regressao quando fizer sentido.
8. Rode validacoes relevantes.
9. Reporte causa, fix, evidencias e riscos restantes.

## Saida esperada

- Sintoma
- Causa provavel ou confirmada
- Area afetada
- Correcao aplicada
- Teste de regressao
- Validacoes executadas
- Resultado das validacoes
- Riscos restantes
- Proximos passos

## Limites

Nao mascarar erro sem entender causa. Nao expor logs sensiveis. Nao ampliar escopo do fix para refactor grande sem justificativa e autorizacao.
