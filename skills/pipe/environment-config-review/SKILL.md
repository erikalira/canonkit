# environment-config-review

## Quando usar

Use para revisar configuracao operacional por ambiente, variaveis, feature flags, paths, allowlists, endpoints, limites, recursos e diferencas entre local, staging e producao.

## Processo

1. Identifique ambiente afetado: local, staging ou producao.
2. Identifique configuracoes alteradas e comportamento esperado.
3. Verifique diferencas entre ambientes.
4. Verifique defaults seguros e valores obrigatorios sem abrir segredos.
5. Verifique impacto em deploy, rollback e observabilidade.
6. Verifique compatibilidade com jobs, filas, Docker/Compose e CI/CD.
7. Classifique risco: LOW, MEDIUM ou HIGH.
8. Liste validacoes por ambiente.
9. Recomende guardrails para evitar configuracao acidental.
10. Escale para Gard quando houver secrets, auth, rede, permissao ou exposicao.

## Saida esperada

- Ambiente
- Configuracoes afetadas
- Diferencas entre ambientes
- Defaults
- Risco operacional
- Impacto em deploy/rollback
- Validacoes recomendadas
- Lacunas
- Guardrails
- Dependencias

## Limites

Nao abrir nem imprimir valores sensiveis. Nao assumir que configuracao local representa staging ou producao.
