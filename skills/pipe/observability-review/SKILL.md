# observability-review

## Quando usar

Use para revisar logs, metricas, traces, dashboards, alertas, healthchecks, readiness, incident response e visibilidade operacional.

## Processo

1. Identifique servico, job, fila, endpoint ou fluxo operacional afetado.
2. Identifique sinais necessarios para detectar sucesso, falha e degradacao.
3. Verifique logs uteis sem dados sensiveis.
4. Verifique metricas de volume, erro, latencia, saturacao e backlog quando aplicavel.
5. Verifique alertas e thresholds para falhas relevantes.
6. Verifique dashboards ou consultas operacionais existentes.
7. Verifique health/readiness para dependencias criticas.
8. Classifique lacunas por impacto.
9. Recomende observabilidade minima proporcional ao risco.
10. Escale para Gard se logs ou traces puderem expor segredos ou dados sensiveis.

## Saida esperada

- Area observada
- Sinais necessarios
- Logs
- Metricas
- Alertas
- Health/readiness
- Lacunas
- Risco operacional
- Recomendacoes
- Dependencias

## Limites

Nao pedir observabilidade excessiva para mudanca LOW. Nao aceitar mudanca HIGH sem sinal suficiente para detectar falha em tempo util.
