# implementation-planning

## Quando usar

Use antes de implementar feature, bugfix, refactor ou integracao MEDIUM/HIGH, ou quando o pedido precisar virar passos tecnicos pequenos e revisaveis.

## Processo

1. Identifique objetivo, escopo e fora de escopo.
2. Procure PRD, spec, issue, criterios de aceite, ADR, docs e handoffs relevantes.
3. Leia codigo e testes existentes nas areas afetadas.
4. Identifique arquivos, modulos, contratos e riscos provaveis.
5. Classifique risco: LOW, MEDIUM ou HIGH.
6. Divida a implementacao em passos pequenos.
7. Defina validacoes esperadas: teste, lint, build ou checagem manual.
8. Liste suposicoes e lacunas.
9. Escale para o agente responsavel quando houver decisao fora de engenharia.

## Saida esperada

- Objetivo
- Escopo
- Fora de escopo
- Contexto encontrado
- Arquivos provaveis
- Risco
- Plano tecnico
- Validacoes previstas
- Suposicoes
- Dependencias

## Limites

Nao transformar requisito ambiguo em implementacao sem declarar suposicao. Nao decidir produto, arquitetura, UX, seguranca, QA, documentacao ou deploy sozinho.
