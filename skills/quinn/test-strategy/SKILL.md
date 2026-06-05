# test-strategy

## Quando usar

Use para definir estrategia de testes para uma mudanca, feature, fluxo, integracao, refactor, bugfix ou release.

Use principalmente quando a mudanca for MEDIUM ou HIGH, afetar comportamento compartilhado, tiver risco de regressao ou exigir combinacao de testes automatizados e manuais.

## Processo

1. Identifique a mudanca, objetivo e comportamento esperado.
2. Procure PRD, spec, criterios de aceite, diff, testes existentes e historico de bugs.
3. Classifique o risco: LOW, MEDIUM ou HIGH.
4. Identifique unidades, integracoes, fluxos e contratos afetados.
5. Defina quais comportamentos precisam de teste automatizado.
6. Defina quais cenarios precisam de validacao manual.
7. Liste edge cases e regressao plausivel.
8. Indique dados de teste, mocks, fixtures ou ambiente necessario.
9. Defina evidencias esperadas de validacao.
10. Escale para Scott se criterios de aceite forem vagos.
11. Escale para Archie se a estrategia depender de arquitetura, contrato ou integracao.

## Saida esperada

- Escopo da mudanca
- Risco
- Estrategia recomendada
- Testes automatizados
- Testes manuais
- Edge cases
- Regressao a proteger
- Dados ou ambiente necessario
- Evidencias esperadas
- Dependencias

## Limites

Nao exigir plano pesado para mudanca LOW sem risco real. Nao substituir decisao de produto ou arquitetura. Nao tratar cobertura numerica como garantia de qualidade.
