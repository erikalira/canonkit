# test-coverage-review

## Quando usar

Use para avaliar se a cobertura de testes e suficiente para uma mudanca, sem depender apenas de porcentagem de cobertura.

Use quando houver novo comportamento, bugfix, refactor, risco de regressao, contrato publico, fluxo critico ou mudanca MEDIUM/HIGH.

## Processo

1. Identifique comportamento alterado e risco da mudanca.
2. Procure testes existentes, relatorio de cobertura, criterios de aceite e diff.
3. Verifique se testes cobrem comportamento importante, nao apenas linhas executadas.
4. Compare fluxo principal, edge cases e falhas com os testes existentes.
5. Identifique lacunas em unidade, integracao, contrato, end-to-end ou manual.
6. Verifique se testes falhariam com uma regressao plausivel.
7. Recomende novos testes ou ajuste de testes existentes.
8. Classifique cobertura como adequada, parcial ou insuficiente.
9. Indique evidencias necessarias para merge.
10. Escale para Quinn nao se aplica; se o problema for criterio vago, escale para Scott.
11. Escale para Archie quando lacuna de cobertura vier de limite tecnico ou contrato mal definido.

## Saida esperada

- Comportamento avaliado
- Risco
- Cobertura existente
- Cobertura util
- Lacunas
- Testes recomendados
- Evidencias necessarias
- Veredito
- Dependencias

## Limites

Nao usar porcentagem de cobertura como unico criterio. Nao exigir teste redundante sem risco. Nao aprovar cobertura parcial para mudanca de alto risco sem mitigacao clara.
