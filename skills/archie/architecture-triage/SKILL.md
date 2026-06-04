# architecture-triage

## Quando usar

Use quando houver dúvida sobre qual arquitetura usar, se uma mudança precisa de revisão arquitetural, se um padrão faz sentido, ou quando houver risco de overengineering.

## Processo

1. Identifique o escopo: enterprise, solução, sistema ou aplicação.
2. Identifique os eixos envolvidos: código, deploy, comunicação, dados, segurança, operação, testes ou observabilidade.
3. Classifique o risco: LOW, MEDIUM ou HIGH.
4. Separe sintomas de causas.
5. Liste opções viáveis.
6. Compare trade-offs.
7. Recomende a menor solução suficiente.
8. Declare quando uma decisão exige ADR.

## Saída esperada

- Escopo
- Eixos afetados
- Risco
- Diagnóstico
- Opções
- Trade-offs
- Recomendação
- Necessidade de ADR

## Limites

Não recomende padrões sofisticados sem evidência. Não trate arquitetura como catálogo de nomes.
