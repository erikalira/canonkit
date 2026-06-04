# data-architecture-review

## Quando usar

Use para decisões sobre modelagem, bancos relacionais/NoSQL, transações, agregados, CQRS, Event Sourcing, cache, migrações e analytics.

## Processo

1. Identifique entidades, invariantes e regras de consistência.
2. Avalie padrões de leitura e escrita.
3. Avalie necessidade de histórico/auditoria.
4. Avalie transações e consistência eventual.
5. Avalie impacto de migração.
6. Recomende modelo e estratégia proporcional.

## Saída esperada

- Modelo recomendado
- Invariantes
- Estratégia de consistência
- Riscos de migração
- Trade-offs

## Limites

Não recomende CQRS ou Event Sourcing sem dor clara de leitura/escrita, histórico, auditoria ou escala.
