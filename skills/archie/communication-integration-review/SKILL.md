# communication-integration-review

## Quando usar

Use para decisões sobre REST, RPC/gRPC, GraphQL, filas, pub/sub, eventos, webhooks, retries, timeouts, idempotência e contratos.

## Processo

1. Identifique se a comunicação precisa ser síncrona ou assíncrona.
2. Avalie consistência, latência e acoplamento.
3. Defina contrato.
4. Avalie idempotência, retry, timeout e fallback.
5. Identifique riscos de observabilidade e debugging.
6. Recomende mecanismo proporcional.

## Saída esperada

- Estilo de comunicação recomendado
- Contrato esperado
- Riscos
- Requisitos de resiliência
- Observabilidade necessária

## Limites

Não use event-driven para fluxos simples que funcionam melhor síncronos.
