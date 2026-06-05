# regression-risk-review

## Quando usar

Use para avaliar risco de regressao em bugfixes, refactors, mudancas compartilhadas, alteracoes de contrato, fluxos criticos, dependencias, migracoes ou areas com historico de defeitos.

Use antes de merge, release ou mudanca MEDIUM/HIGH.

## Processo

1. Identifique arquivos, modulos, fluxos, contratos e usuarios afetados.
2. Procure testes existentes, historico de bugs, changelog, PRD, spec e dependencias.
3. Classifique risco de regressao: LOW, MEDIUM ou HIGH.
4. Identifique comportamentos que precisam permanecer iguais.
5. Identifique cenarios que podem quebrar por efeito colateral.
6. Verifique se ha testes automatizados protegendo comportamento critico.
7. Recomende teste manual quando automacao nao cobrir fluxo real.
8. Indique sinais que devem bloquear merge.
9. Defina evidencias esperadas antes da entrega.
10. Escale para Pipe quando risco depender de deploy, rollback, operacao ou observabilidade.
11. Escale para Archie quando regressao envolver contrato publico, dados ou integracao.

## Saida esperada

- Area afetada
- Risco de regressao
- Comportamentos a preservar
- Cenarios vulneraveis
- Cobertura existente
- Lacunas de cobertura
- Testes recomendados
- Evidencias esperadas
- Bloqueios
- Dependencias

## Limites

Nao bloquear mudanca LOW sem risco plausivel. Nao exigir teste automatizado para todo detalhe visual sem comportamento relevante. Nao aprovar mudanca HIGH sem evidencia adequada.
