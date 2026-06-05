# refactoring

## Quando usar

Use para melhorar estrutura interna, legibilidade, duplicacao, isolamento ou manutencao sem mudar comportamento observavel.

## Processo

1. Identifique motivacao concreta do refactor.
2. Confirme comportamento que deve permanecer igual.
3. Verifique testes existentes ou defina validacao manual adequada.
4. Limite o escopo ao menor conjunto de arquivos necessario.
5. Faça mudancas mecanicas e revisaveis.
6. Evite misturar refactor com feature quando puder separar.
7. Rode validacoes relevantes.
8. Compare comportamento antes/depois quando possivel.
9. Reporte riscos de regressao e lacunas de cobertura.

## Saida esperada

- Motivacao
- Comportamento preservado
- Arquivos modificados
- Mudancas realizadas
- Validacoes executadas
- Resultado das validacoes
- Risco de regressao
- Lacunas

## Limites

Nao refatorar por gosto pessoal. Nao alterar contrato publico ou comportamento sem declarar como mudanca funcional e escalar quando necessario.
