# jobs-queues-review

## Quando usar

Use para revisar jobs, filas, workers, schedulers, retries, DLQ, backoff, idempotencia, concorrencia, backlog e operacao assíncrona.

## Processo

1. Identifique produtor, fila, consumidor e job.
2. Verifique trigger, frequencia, volume e SLA esperado.
3. Verifique idempotencia, retry, backoff e DLQ.
4. Verifique concorrencia, ordenacao e duplicidade.
5. Verifique observabilidade: backlog, falhas, latencia e throughput.
6. Verifique plano para replay, drain, pause e rollback.
7. Verifique impacto em dados persistentes e dependencias externas.
8. Classifique risco: LOW, MEDIUM ou HIGH.
9. Liste lacunas operacionais.
10. Escale para Archie quando envolver topologia, contrato ou arquitetura de filas.

## Saida esperada

- Job/fila revisado
- Produtor e consumidor
- Volume/SLA
- Retry/backoff/DLQ
- Idempotencia
- Observabilidade
- Rollback/replay
- Risco operacional
- Lacunas
- Dependencias

## Limites

Nao aprovar job critico sem observabilidade de falha e backlog. Nao decidir arquitetura de filas sozinho.
