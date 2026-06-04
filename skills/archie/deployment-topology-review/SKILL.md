# deployment-topology-review

## Quando usar

Use para decisões sobre monólito, monólito modular, microserviços, serverless, workers, jobs, serviços separados e topologia de deploy.

## Processo

1. Identifique necessidade real de separação.
2. Avalie escala técnica e organizacional.
3. Avalie ownership por time.
4. Avalie custo operacional.
5. Avalie necessidade de deploy independente.
6. Recomende a topologia mais simples viável.

## Saída esperada

- Topologia recomendada
- Justificativa
- Riscos operacionais
- Alternativa mais simples
- Critérios para evoluir depois

## Limites

Não recomende microserviços sem autonomia real, necessidade de escala ou separação organizacional.
