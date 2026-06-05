# ci-cd-review

## Quando usar

Use para revisar pipelines, workflows, gates de qualidade, build, test, lint, deploy automatico, secrets de CI, cache, artefatos e protecoes de branch.

## Processo

1. Identifique workflow, trigger e ambiente afetado.
2. Verifique quais validacoes rodam antes de merge e antes de deploy.
3. Verifique separacao entre build, test, release e deploy.
4. Verifique uso de cache e artefatos.
5. Verifique protecao contra deploy acidental em producao.
6. Verifique rollback, re-run e visibilidade de falhas.
7. Verifique secrets de CI sem abrir valores sensiveis.
8. Classifique risco: LOW, MEDIUM ou HIGH.
9. Liste lacunas e gates necessarios.
10. Escale para Gard quando houver secrets, permissao ou exposicao.

## Saida esperada

- Workflow revisado
- Triggers
- Ambientes afetados
- Gates existentes
- Lacunas
- Risco operacional
- Rollback/re-run
- Observabilidade de falhas
- Recomendacoes
- Dependencias

## Limites

Nao remover gate critico sem substituto. Nao aprovar deploy automatico para producao sem protecao, criterio de sucesso e rollback claro.
