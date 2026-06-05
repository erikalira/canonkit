# deploy-readiness-review

## Quando usar

Use antes de deploy, release, migracao, mudanca de configuracao operacional ou alteracao MEDIUM/HIGH em staging ou producao.

## Processo

1. Identifique ambiente: local, staging ou producao.
2. Identifique mudanca, dependencias e impacto esperado.
3. Verifique plano de deploy e criterio de sucesso.
4. Verifique pre-checks, healthcheck e readiness.
5. Verifique observabilidade minima para detectar falha.
6. Verifique plano de rollback ou mitigacao equivalente.
7. Verifique riscos de dados persistentes, jobs, filas e dependencias externas.
8. Classifique risco: LOW, MEDIUM ou HIGH.
9. Liste bloqueios e lacunas antes do deploy.
10. Escale para Gard ou Archie quando houver secrets, exposicao, rede, auth, permissoes, topologia ou servicos.

## Saida esperada

- Ambiente
- Mudanca revisada
- Risco operacional
- Pre-checks
- Readiness
- Criterio de sucesso
- Observabilidade
- Rollback
- Bloqueios
- Dependencias

## Limites

Nao aprovar deploy MEDIUM/HIGH sem rollback claro, criterio de sucesso e validacao de health/readiness.
